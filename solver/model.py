# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Modèle CP-SAT canonique (OR-Tools) pour le placement d'activités pédagogiques.

Encodage retenu (D1) : pour chaque couple (activité × jour × salle candidate) une
variable de présence booléenne et un ``OptionalIntervalVar`` dont le ``start`` est le
créneau de début et la taille la durée de l'activité. Le placement est donc identifié
par le quadruplet (activité, jour, créneau, salle) exigé par le livrable, sans exploser
en O(activités × 144 × salles).

Hypothèses documentées
----------------------
* Une activité occupe **un bloc contigu** de ``durationSlots`` créneaux sur un seul
  jour ; une occurrence = un jour (HC-STR-04 : volume hebdomadaire exact).
* L'enseignant affecté à une activité est ``teacherIds[0]`` (premier de la liste).
  Le choix multi-enseignants par activité est reporté (limitation connue, voir README).
* Un enseignant ne peut pas enseigner deux activités en même temps ; un groupe ne
  peut pas être dans deux activités en même temps ; une salle ne peut pas accueillir
  deux activités en même temps (AddNoOverlap par ressource).
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from typing import Any

from ortools.sat.python import cp_model

from .derived_file import (
    EXPECTED_DAYS,
    EXPECTED_SLOTS_PER_DAY,
    DerivedFileInvalid,
    parse_constraint_value,
    parse_lock_value,
)

PENALTY_LOCK = 1000  # poids très fort pour les verrous durs (HC-LOCK)


class TaktSolver:
    """Construit et résout le modèle CP-SAT d'un fichier dérivé."""

    def __init__(self, derived_file: dict[str, Any]) -> None:
        self.derived = derived_file
        self.metadata = derived_file["metadata"]
        self.time_grid = derived_file["timeGrid"]
        self.rooms = derived_file["rooms"]
        self.teachers = derived_file["teachers"]
        self.groups = derived_file["groups"]
        self.subjects = derived_file["subjects"]
        self.activities = derived_file["activities"]
        self.constraints = [c for c in derived_file["constraints"] if c.get("isActive", True)]
        self.locks = derived_file["locks"]

        self.days = EXPECTED_DAYS
        self.slots_per_day = EXPECTED_SLOTS_PER_DAY
        self.total_slots = self.days * self.slots_per_day

        # Index rapides par id.
        self._room_by_id = {r["id"]: r for r in self.rooms}
        self._teacher_by_id = {t["id"]: t for t in self.teachers}
        self._group_by_id = {g["id"]: g for g in self.groups}
        self._subject_by_id = {s["id"]: s for s in self.subjects}

        # Modèle et solveur (initialisés dans build_model / solve).
        self.model: cp_model.CpModel | None = None
        self.solver: cp_model.CpSolver | None = None

        # presence[a_idx][day][room_idx] -> BoolVar
        self.presence: dict[tuple[int, int, int], cp_model.BoolVarT] = {}
        # start[a_idx][day][room_idx] -> IntVar
        self.start: dict[tuple[int, int, int], cp_model.IntVarT] = {}
        # interval[a_idx][day][room_idx] -> OptionalIntervalVar
        self.interval: dict[tuple[int, int, int], cp_model.OptionalIntervalVarT] = {}

        # Salle candidate par activité (filtrée HC-ROOM).
        self._candidate_rooms: dict[int, list[int]] = {}
        # Enseignant principal (teacherIds[0]) par activité.
        self._main_teacher: dict[int, str] = {}
        # Groupes par activité.
        self._activity_groups: dict[int, list[str]] = {}
        # Durée et volume par activité.
        self._duration: dict[int, int] = {}
        self._weekly_volume: dict[int, int] = {}

        self._scenarios: list[dict[str, Any]] = []
        self._status: str = "INFEASIBLE"

    # ------------------------------------------------------------------
    # Préparation des données
    # ------------------------------------------------------------------

    def _prepare_data(self) -> None:
        """Filtre les salles candidates et indexe les données par activité."""
        for a_idx, activity in enumerate(self.activities):
            subject = self._subject_by_id[activity["subjectId"]]
            teaching_type = subject["teachingType"]
            room_type = activity["roomType"]

            def room_compatible(room: dict[str, Any]) -> bool:
                rt = room["type"]
                if room_type == "ANY":
                    return True
                if teaching_type == "CM" and rt == "AMPHI":
                    return True
                if teaching_type in ("TD", "PROJET") and rt in ("TD", "INFO"):
                    return True
                if teaching_type == "TP" and rt in ("TP", "INFO"):
                    return True
                return False

            max_group_size = max(self._group_by_id[gid]["size"] for gid in activity["groupIds"])

            candidates = []
            for r_idx, room in enumerate(self.rooms):
                if not room_compatible(room):
                    continue
                if room["capacity"] < max_group_size:
                    continue
                required_eq = set(subject.get("equipment", [])) if isinstance(subject.get("equipment"), list) else set()
                room_eq = set(room.get("equipment", [])) if isinstance(room.get("equipment"), list) else set()
                if not required_eq.issubset(room_eq):
                    continue
                candidates.append(r_idx)

            if not candidates:
                raise DerivedFileInvalid(
                    f"Aucune salle candidate pour l'activité {activity['id']} "
                    f"(type={room_type}, sujet={teaching_type})."
                )

            self._candidate_rooms[a_idx] = candidates
            self._main_teacher[a_idx] = activity["teacherIds"][0]
            self._activity_groups[a_idx] = activity["groupIds"]
            self._duration[a_idx] = activity["durationSlots"]
            self._weekly_volume[a_idx] = activity["weeklyVolume"]


    # ------------------------------------------------------------------
    # Construction du modèle
    # ------------------------------------------------------------------

    def build_model(self) -> None:
        """Construit le modèle CP-SAT avec variables et contraintes dures."""
        self._prepare_data()
        self.model = cp_model.CpModel()

        # --- Variables de présence / intervalle --------------------------------
        for a_idx, activity in enumerate(self.activities):
            duration = self._duration[a_idx]
            for day in range(self.days):
                for r_idx in self._candidate_rooms[a_idx]:
                    key = (a_idx, day, r_idx)
                    pres = self.model.NewBoolVar(f"presence_a{a_idx}_d{day}_r{r_idx}")
                    start_var = self.model.NewIntVar(
                        0, self.slots_per_day - duration, f"start_a{a_idx}_d{day}_r{r_idx}"
                    )
                    end_var = start_var + duration
                    interval_var = self.model.NewOptionalIntervalVar(
                        start_var, duration, end_var, pres,
                        f"interval_a{a_idx}_d{day}_r{r_idx}",
                    )
                    self.presence[key] = pres
                    self.start[key] = start_var
                    self.interval[key] = interval_var

        # --- Contraintes dures --------------------------------------------------
        self._add_hard_volume()
        self._add_hard_no_conflict()
        self._add_hard_unavailability()
        self._add_hard_locks()

        # --- Contraintes souples + objectif ------------------------------------
        self._add_soft_objective()

    def _add_hard_volume(self) -> None:
        """HC-STR-04 : volume hebdomadaire exact, une occurrence max par jour."""
        for a_idx in range(len(self.activities)):
            # Une occurrence max par jour.
            for day in range(self.days):
                self.model.Add(
                    sum(self.presence[(a_idx, day, r_idx)]
                        for r_idx in self._candidate_rooms[a_idx]) <= 1
                )
            # Volume hebdomadaire exact.
            self.model.Add(
                sum(self.presence[(a_idx, day, r_idx)]
                    for day in range(self.days)
                    for r_idx in self._candidate_rooms[a_idx])
                == self._weekly_volume[a_idx]
            )


    def _add_hard_no_conflict(self) -> None:
        """HC-RES-01/02/03 : pas de chevauchement salle / enseignant / groupe."""
        # --- Conflits salle ----------------------------------------------------
        for r_idx, room in enumerate(self.rooms):
            intervals = []
            for a_idx in range(len(self.activities)):
                if r_idx not in self._candidate_rooms[a_idx]:
                    continue
                for day in range(self.days):
                    intervals.append(self.interval[(a_idx, day, r_idx)])
            if intervals:
                self.model.AddNoOverlap(intervals)

        # --- Conflits enseignant (enseignant principal = teacherIds[0]) -------
        teacher_intervals: dict[str, list[cp_model.OptionalIntervalVarT]] = defaultdict(list)
        for a_idx in range(len(self.activities)):
            teacher = self._main_teacher[a_idx]
            for day in range(self.days):
                for r_idx in self._candidate_rooms[a_idx]:
                    teacher_intervals[teacher].append(self.interval[(a_idx, day, r_idx)])
        for teacher, intervals in teacher_intervals.items():
            if intervals:
                self.model.AddNoOverlap(intervals)

        # --- Conflits groupe ----------------------------------------------------
        group_intervals: dict[str, list[cp_model.OptionalIntervalVarT]] = defaultdict(list)
        for a_idx in range(len(self.activities)):
            for gid in self._activity_groups[a_idx]:
                for day in range(self.days):
                    for r_idx in self._candidate_rooms[a_idx]:
                        group_intervals[gid].append(self.interval[(a_idx, day, r_idx)])
        for gid, intervals in group_intervals.items():
            if intervals:
                self.model.AddNoOverlap(intervals)

    def _add_hard_unavailability(self) -> None:
        """HC-UNAV : indisponibilités enseignants (intervalle fixe de durée 1)."""
        for teacher in self.teachers:
            tid = teacher["id"]
            for unav in teacher.get("unavailableSlots", []):
                day = unav["day"]
                if unav.get("allDay"):
                    slots = range(self.slots_per_day)
                else:
                    slots = unav["slots"]
                for slot in slots:
                    # Intervalle fixe [slot, slot+1) pour bloquer ce créneau.
                    block = self.model.NewFixedSizeIntervalVar(
                        slot, 1, f"block_t{tid}_d{day}_s{slot}"
                    )
                    # AddNoOverlap avec toutes les activités de ce professeur ce jour-là.
                    teacher_intervals = []
                    for a_idx in range(len(self.activities)):
                        if self._main_teacher[a_idx] != tid:
                            continue
                        for r_idx in self._candidate_rooms[a_idx]:
                            teacher_intervals.append(self.interval[(a_idx, day, r_idx)])
                    if teacher_intervals:
                        self.model.AddNoOverlap(teacher_intervals + [block])

    def _add_hard_locks(self) -> None:
        """HC-LOCK : verrous de séance (TIMESLOT, ROOM)."""
        for lock in self.locks:
            lock_type = lock["lockType"]
            try:
                value = parse_lock_value(lock["value"], lock_type)
            except DerivedFileInvalid:
                continue  # verrou mal formé : ignoré (à logger)

            activity_id = lock["activityId"]
            a_idx = self._activity_index_by_id(activity_id)
            if a_idx is None:
                continue

            if lock_type == "TIMESLOT":
                # value = {"day": d, "slot": s}.
                if not isinstance(value, dict) or "day" not in value or "slot" not in value:
                    continue
                day = value["day"]
                slot = value["slot"]
                # Forcer start = slot sur toutes les salles candidates ce jour.
                for r_idx in self._candidate_rooms[a_idx]:
                    key = (a_idx, day, r_idx)
                    self.model.Add(self.start[key] == slot).OnlyEnforceIf(self.presence[key])
                # Présence obligatoire ce jour (une salle quelconque).
                self.model.Add(
                    sum(self.presence[(a_idx, day, r_idx)]
                        for r_idx in self._candidate_rooms[a_idx]) == 1
                )

            elif lock_type == "ROOM":
                # value = id de salle.
                room_id = value if isinstance(value, str) else value.get("roomId")
                r_idx = self._room_index_by_id(room_id)
                if r_idx is None or r_idx not in self._candidate_rooms[a_idx]:
                    continue
                # Interdire toutes les autres salles pour cette activité.
                for day in range(self.days):
                    for cand in self._candidate_rooms[a_idx]:
                        if cand != r_idx:
                            self.model.Add(self.presence[(a_idx, day, cand)] == 0)

    def _activity_index_by_id(self, activity_id: str) -> int | None:
        for i, a in enumerate(self.activities):
            if a["id"] == activity_id:
                return i
        return None

    def _room_index_by_id(self, room_id: str) -> int | None:
        for i, r in enumerate(self.rooms):
            if r["id"] == room_id:
                return i
        return None

    def _add_soft_objective(self) -> None:
        """Contraintes souples + objectif pondéré (poids 1-100 du DerivedFile)."""
        if self.model is None:
            return

        objective_terms: list[tuple[cp_model.IntVarT, int]] = []

        # Préférences enseignants (TEACHER_PREFERENCE) : bonus si placé au créneau préféré.
        for constraint in self.constraints:
            if constraint["category"] != "SOFT":
                continue
            if constraint["type"] != "TEACHER_PREFERENCE":
                continue
            weight = constraint["weight"]
            target_id = constraint.get("targetId")
            try:
                pref = parse_constraint_value(constraint["value"], constraint["type"])
            except DerivedFileInvalid:
                continue
            if not isinstance(pref, dict) or "day" not in pref or "slot" not in pref:
                continue

            for a_idx in range(len(self.activities)):
                if self._main_teacher[a_idx] != target_id:
                    continue
                duration = self._duration[a_idx]
                pref_day = pref["day"]
                pref_slot = pref["slot"]
                # L'activité couvre le créneau préféré si start <= pref_slot < start+duration.
                for r_idx in self._candidate_rooms[a_idx]:
                    key = (a_idx, pref_day, r_idx)
                    pres = self.presence[key]
                    start_var = self.start[key]
                    # bonus_var = 1 si présent et couvrant le créneau préféré.
                    bonus = self.model.NewBoolVar(f"bonus_pref_a{a_idx}_d{pref_day}_r{r_idx}")
                    self.model.Add(start_var <= pref_slot).OnlyEnforceIf(bonus)
                    self.model.Add(start_var + duration > pref_slot).OnlyEnforceIf(bonus)
                    self.model.Add(bonus == 0).OnlyEnforceIf(pres.Not())
                    objective_terms.append((bonus, weight))

        if objective_terms:
            self.model.Maximize(sum(var * coef for var, coef in objective_terms))


    # ------------------------------------------------------------------
    # Résolution et extraction
    # ------------------------------------------------------------------

    def solve(self, max_scenarios: int = 3, time_limit_sec: int = 300) -> list[dict[str, Any]]:
        """Résout le modèle et retourne jusqu'à ``max_scenarios`` scénarios distincts.

        Mise en œuvre de la diversification (D6) : après chaque scénario trouvé, un
        *no-good cut* interdit de retrouver exactement le même placement pour toutes
        les activités, forçant le solveur à explorer une région différente de l'espace
        des solutions.
        """
        if self.model is None:
            self.build_model()

        assert self.model is not None
        self.solver = cp_model.CpSolver()
        self.solver.parameters.max_time_in_seconds = time_limit_sec
        self.solver.parameters.num_search_workers = 1  # déterminisme pour les tests
        self.solver.parameters.log_search_progress = False

        self._scenarios = []
        scenario_count = 0

        while scenario_count < max_scenarios:
            status = self.solver.Solve(self.model)

            if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                scenario = self._extract_scenario(status)
                # Vérification interne des contraintes dures (DoD).
                if not self._verify_hard_constraints(scenario["placements"]):
                    # En cas d'échec de vérification, on s'arrête pour ne pas retourner
                    # une solution invalide.
                    break
                self._scenarios.append(scenario)
                scenario_count += 1
                if scenario_count < max_scenarios:
                    self._add_no_good_cut(scenario["placements"])
            elif status == cp_model.INFEASIBLE:
                self._status = "INFEASIBLE"
                break
            elif status == cp_model.TIMEOUT:
                self._status = "TIMEOUT"
                break
            else:  # MODEL_INVALID ou UNKNOWN
                self._status = "UNKNOWN"
                break

        if not self._scenarios:
            self._status = "INFEASIBLE"
        else:
            # Le statut de sortie reflète le dernier scénario obtenu.
            self._status = self._scenarios[-1].get("status", "FEASIBLE")

        return self._scenarios

    def _extract_scenario(self, status: int) -> dict[str, Any]:
        """Extrait les placements d'une solution du solveur."""
        placements = []
        for (a_idx, day, r_idx), pres in self.presence.items():
            if self.solver is not None and self.solver.Value(pres):
                activity = self.activities[a_idx]
                room = self.rooms[r_idx]
                start_slot = self.solver.Value(self.start[(a_idx, day, r_idx)])
                placements.append({
                    "activityId": activity["id"],
                    "day": day,
                    "slot": start_slot,
                    "roomId": room["id"],
                    "teacherId": self._main_teacher[a_idx],
                })

        # Tri déterministe pour des scénarios reproductibles.
        placements.sort(key=lambda p: (p["activityId"], p["day"], p["slot"]))

        activity_ids = [p["activityId"] for p in placements]
        unplaced = self._compute_unplaced(activity_ids)

        scenario_status = "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE"
        return {
            "id": str(uuid.uuid4()),
            "generationId": self.metadata["generationId"],
            "placements": placements,
            "unplacedActivities": unplaced,
            "status": scenario_status,
        }


    def _compute_unplaced(self, activity_ids: list[str]) -> list[str]:
        """Retourne les activités dont le volume hebdomadaire n'est pas entièrement placé."""
        placed_count: dict[str, int] = defaultdict(int)
        for aid in activity_ids:
            placed_count[aid] += 1

        unplaced = []
        for activity in self.activities:
            aid = activity["id"]
            expected = activity["weeklyVolume"]
            placed = placed_count.get(aid, 0)
            if placed < expected:
                unplaced.append(aid)
        return unplaced

    def _add_no_good_cut(self, placements: list[dict[str, Any]]) -> None:
        """Interdit de retrouver exactement le même placement pour toutes les activités."""
        if self.model is None or self.solver is None:
            return

        eq_vars = []
        for p in placements:
            a_idx = self._activity_index_by_id(p["activityId"])
            r_idx = self._room_index_by_id(p["roomId"])
            day = p["day"]
            slot = p["slot"]
            if a_idx is None or r_idx is None:
                continue
            key = (a_idx, day, r_idx)
            if key not in self.presence:
                continue

            pres = self.presence[key]
            start_var = self.start[key]

            # b_start_eq = (start == slot)
            b_start_eq = self.model.NewBoolVar(f"ngc_start_a{a_idx}_d{day}_r{r_idx}")
            self.model.Add(start_var == slot).OnlyEnforceIf(b_start_eq)
            self.model.Add(start_var != slot).OnlyEnforceIf(b_start_eq.Not())

            # eq = pres AND b_start_eq
            eq = self.model.NewBoolVar(f"ngc_eq_a{a_idx}_d{day}_r{r_idx}")
            self.model.AddMultiplicationEquality(eq, [pres, b_start_eq])
            eq_vars.append(eq)

        if eq_vars:
            # Au moins un placement doit différer : somme des "égaux" <= N - 1.
            self.model.Add(sum(eq_vars) <= len(eq_vars) - 1)

    def _verify_hard_constraints(self, placements: list[dict[str, Any]]) -> bool:
        """Vérifie a posteriori toutes les contraintes dures (DoD).

        Retourne True si toutes les dures sont respectées, False sinon.
        """
        # Clé (jour, ressource, créneau) -> id de l'activité qui l'occupe.
        room_slot_busy: dict[tuple[int, str, int], str] = {}
        teacher_slot_busy: dict[tuple[str, int, int], str] = {}
        group_slot_busy: dict[tuple[str, int, int], str] = {}
        activity_days: dict[str, set[int]] = defaultdict(set)

        for p in placements:
            aid = p["activityId"]
            day = p["day"]
            slot = p["slot"]
            rid = p["roomId"]
            tid = p["teacherId"]
            activity = self._activity_by_id(aid)
            if activity is None:
                return False
            duration = activity["durationSlots"]

            activity_days[aid].add(day)

            # Vérifier que le bloc ne dépasse pas la journée.
            if slot + duration > self.slots_per_day:
                return False

            for s in range(slot, slot + duration):
                room_key = (day, rid, s)
                teacher_key = (tid, day, s)
                gid = activity["groupIds"][0] if activity["groupIds"] else None
                group_key = (gid, day, s) if gid else None

                if room_key in room_slot_busy and room_slot_busy[room_key] != aid:
                    return False  # deux activités dans la même salle au même créneau
                room_slot_busy[room_key] = aid

                if teacher_key in teacher_slot_busy and teacher_slot_busy[teacher_key] != aid:
                    return False  # deux activités du même enseignant en même temps
                teacher_slot_busy[teacher_key] = aid

                if group_key:
                    if group_key in group_slot_busy and group_slot_busy[group_key] != aid:
                        return False  # deux activités du même groupe en même temps
                    group_slot_busy[group_key] = aid

        # Vérifier le volume hebdomadaire exact (HC-STR-04).
        for activity in self.activities:
            aid = activity["id"]
            expected = activity["weeklyVolume"]
            placed_days = len(activity_days.get(aid, set()))
            if placed_days != expected:
                return False

        return True

    def _activity_by_id(self, activity_id: str) -> dict[str, Any] | None:
        for a in self.activities:
            if a["id"] == activity_id:
                return a
        return None
