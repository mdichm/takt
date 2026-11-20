# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Calcul des sous-scores (0-100) et du score global d'un scénario.

Les sous-scores sont des **ratios de satisfaction** (distincts de l'objectif
pondéré du solveur CP-SAT, qui utilise les poids bruts 1-100 des contraintes
souples). Chaque sous-score est indépendant ; le score global est la moyenne
pondérée documentée dans le README.
"""

from __future__ import annotations

from typing import Any

# Poids du score global (somme = 100).
WEIGHTS = {
    "coverage": 25,
    "timeslotRespect": 20,
    "roomRespect": 20,
    "teacherRespect": 15,
    "continuity": 10,
    "loadBalance": 10,
}


def _clamp0100(value: float) -> int:
    return max(0, min(100, int(round(value))))


def compute_sub_scores(
    placements: list[dict[str, Any]],
    unplaced: list[str],
    derived_file: dict[str, Any],
) -> dict[str, int]:
    """Calcule les six sous-scores d'un scénario.

    Args:
        placements: placements extraits de la solution CP-SAT.
        unplaced: liste des IDs d'activités non complètement placées.
        derived_file: fichier dérivé d'entrée (pour les totaux de référence).
    """
    activities = derived_file["activities"]
    constraints = derived_file["constraints"]

    # --- coverage : taux d'occurrences placées ---------------------------------
    total_expected = sum(a["weeklyVolume"] for a in activities)
    total_placed = len(placements)  # 1 placement = 1 jour = 1 occurrence
    coverage = (total_placed / total_expected * 100) if total_expected > 0 else 100

    # --- timeslotRespect & teacherRespect : préférences de créneaux ------------
    pref_constraints = [
        c for c in constraints
        if c["category"] == "SOFT" and c["type"] == "TEACHER_PREFERENCE" and c.get("isActive", True)
    ]
    pref_satisfied = 0
    for c in pref_constraints:
        target_id = c.get("targetId")
        try:
            from .derived_file import parse_constraint_value
            pref = parse_constraint_value(c["value"], c["type"])
        except Exception:
            continue
        if not isinstance(pref, dict) or "day" not in pref or "slot" not in pref:
            continue
        pref_day = pref["day"]
        pref_slot = pref["slot"]
        # Vérifier si une activité de cet enseignant couvre ce (jour, créneau).
        satisfied = False
        for p in placements:
            if p["teacherId"] != target_id:
                continue
            if p["day"] != pref_day:
                continue
            activity = next((a for a in activities if a["id"] == p["activityId"]), None)
            if activity is None:
                continue
            duration = activity["durationSlots"]
            if p["slot"] <= pref_slot < p["slot"] + duration:
                satisfied = True
                break
        if satisfied:
            pref_satisfied += 1

    pref_total = len(pref_constraints)
    timeslot_respect = (pref_satisfied / pref_total * 100) if pref_total > 0 else 100
    teacher_respect = timeslot_respect  # même indicateur v1 (enseignant = cible de la préf)

    # --- roomRespect : toutes les salles sont des candidates valides (HC-ROOM) --
    room_respect = 100  # garanti par la construction du modèle (pas de salle invalide)

    # --- continuity : blocs contiguës (garanti par OptionalIntervalVar) ---------
    continuity = 100  # garanti par l'encodage (bloc contigu de durationSlots)

    # --- loadBalance : équilibrage de la charge hebdomadaire par enseignant -----
    teacher_hours: dict[str, int] = {}
    for p in placements:
        activity = next((a for a in activities if a["id"] == p["activityId"]), None)
        if activity is None:
            continue
        teacher_hours[p["teacherId"]] = teacher_hours.get(p["teacherId"], 0) + activity["durationSlots"]

    if teacher_hours:
        values = list(teacher_hours.values())
        avg = sum(values) / len(values)
        if avg > 0:
            variance = sum((v - avg) ** 2 for v in values) / len(values)
            import math
            std_dev = math.sqrt(variance)
            # Score inversement proportionnel à l'écart-type relatif.
            load_balance = max(0, 100 - (std_dev / avg * 100))
        else:
            load_balance = 100
    else:
        load_balance = 100

    return {
        "coverage": _clamp0100(coverage),
        "timeslotRespect": _clamp0100(timeslot_respect),
        "roomRespect": _clamp0100(room_respect),
        "teacherRespect": _clamp0100(teacher_respect),
        "continuity": _clamp0100(continuity),
        "loadBalance": _clamp0100(load_balance),
    }


def compute_global_score(sub_scores: dict[str, int]) -> int:
    """Score global = moyenne pondérée des sous-scores (0-100)."""
    total_weight = sum(WEIGHTS.values())
    weighted = sum(sub_scores[key] * WEIGHTS[key] for key in WEIGHTS)
    return _clamp0100(weighted / total_weight)
