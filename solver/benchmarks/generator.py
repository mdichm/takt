# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Générateur déterministe d'instances de benchmark DerivedFile (spike SPK-01).

Produit des fichiers dérivés valides selon le contrat ``zDerivedFile``
(``packages/contracts/src/solver.ts``), conformes aux invariants de
``solver.derived_file.validate_structure``.

L'instance est dimensionnée sur la volumétrie SF_TAKT §2 :
400 enseignants, 150 salles, 10 départements, groupes ≈ 30 étudiants,
grille 6 jours × 24 créneaux de 30 min.

Le nombre de *séances* (placements dans la grille hebdomadaire) est maîtrisé
via :ref:`weeklyVolume` des activités. Un garde-fou de faisabilité vérifie que
la capacité totale (salles / enseignants / groupes) est suffisante pour
absorber la charge demandée, afin de mesurer une performance de résolution
réelle et non un échec immédiat par infaisabilité.

Tous les identifiants sont déterministes (``uuid5`` à partir de la graine).
"""

from __future__ import annotations

import random
import uuid
from typing import Any

from .specs import BenchmarkCase, SF_DAYS, SF_SLOTS_PER_DAY

UUID_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # DNS namespace

_CREATED_AT = "2026-11-20T00:00:00Z"
_SEMESTRE = "S1"


def _det_uuid(seed: int, *parts: str) -> str:
    """UUID v5 déterministe à partir d'une graine et de composantes textuelles."""
    name = "|".join(str(p) for p in (seed, *parts))
    return str(uuid.uuid5(UUID_NAMESPACE, name))


def _make_rooms(seed: int, rng: random.Random, count: int) -> list[dict[str, Any]]:
    rooms: list[dict[str, Any]] = []
    type_cycle = ["AMPHI", "TD", "TP", "INFO"]
    building_cycle = ["B1", "B2", "B3", "B4", "B5"]
    for i in range(count):
        rtype = type_cycle[i % len(type_cycle)]
        if rtype == "AMPHI":
            capacity = rng.choice([100, 150, 200, 250])
        elif rtype == "TD":
            capacity = rng.choice([30, 40, 50])
        elif rtype == "TP":
            capacity = rng.choice([20, 25, 30])
        else:  # INFO
            capacity = rng.choice([25, 30, 35])
        rooms.append({
            "id": _det_uuid(seed, "room", i),
            "code": f"S{i + 1:03d}",
            "type": rtype,
            "capacity": capacity,
            "building": building_cycle[i % len(building_cycle)],
            "equipment": rng.sample(["video", "son", "tableau", "wifi"], k=rng.randint(0, 3)),
        })
    return rooms
def _make_teachers(rng: random.Random, count: int) -> list[dict[str, Any]]:
    teachers: list[dict[str, Any]] = []
    for i in range(count):
        dept_id = _det_uuid(rng.randint(0, 9), "dept", i % 10)
        unavail: list[dict[str, Any]] = []
        if rng.random() < 0.10:
            day = rng.randint(0, SF_DAYS - 1)
            slots = rng.sample(range(SF_SLOTS_PER_DAY), k=rng.randint(1, 3))
            unavail.append({"day": day, "slots": sorted(slots), "allDay": False})
        teachers.append({
            "id": _det_uuid(rng.randint(0, 1 << 30), "teacher", i),
            "code": f"T{i + 1:04d}",
            "name": f"Enseignant {i + 1}",
            "departmentId": dept_id,
            "maxHoursPerWeek": rng.randint(12, 24),
            "unavailableSlots": unavail,
        })
    return teachers


def _make_groups(rng: random.Random, count: int) -> list[dict[str, Any]]:
    groups: list[dict[str, Any]] = []
    for i in range(count):
        groups.append({
            "id": _det_uuid(rng.randint(0, 1 << 30), "group", i),
            "code": f"G{i + 1:03d}",
            "size": rng.randint(25, 35),
            "departmentId": _det_uuid(rng.randint(0, 9), "dept", i % 10),
        })
    return groups


def _make_subjects(rng: random.Random, count: int) -> list[dict[str, Any]]:
    subjects: list[dict[str, Any]] = []
    teaching_types = ["CM", "TD", "TP", "PROJET"]
    for i in range(count):
        tt = teaching_types[i % len(teaching_types)]
        subjects.append({
            "id": _det_uuid(rng.randint(0, 1 << 30), "subject", i),
            "code": f"M{i + 1:03d}",
            "name": f"Matière {i + 1}",
            "departmentId": _det_uuid(rng.randint(0, 9), "dept", i % 10),
            "teachingType": tt,
            "chargeCoefficient": round(rng.uniform(0.5, 2.0), 2),
        })
    return subjects

def _compute_capacity(
    rooms: list[dict[str, Any]],
    teachers: list[dict[str, Any]],
    groups: list[dict[str, Any]],
) -> dict[str, float]:
    room_capacity = len(rooms) * SF_DAYS * SF_SLOTS_PER_DAY
    teacher_capacity = len(teachers) * SF_DAYS * SF_SLOTS_PER_DAY
    group_capacity = len(groups) * SF_DAYS * SF_SLOTS_PER_DAY
    return {"room": room_capacity, "teacher": teacher_capacity, "group": group_capacity}
def _make_activities(
    rng: random.Random,
    target_sessions: int,
    subjects: list[dict[str, Any]],
    teachers: list[dict[str, Any]],
    groups: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    teaching_types = ["CM", "TD", "TP", "PROJET"]
    room_type_map = {"CM": "AMPHI", "TD": "TD", "TP": "TP", "PROJET": "INFO"}
    activities: list[dict[str, Any]] = []
    remaining = target_sessions
    idx = 0
    max_activities = max(target_sessions, 50)
    while remaining > 0 and idx < max_activities:
        volume = min(rng.randint(1, 3), remaining)
        duration = rng.choice([1, 2, 2, 2, 3, 4])
        subject = subjects[idx % len(subjects)]
        teaching_type = subject["teachingType"]
        room_type = room_type_map[teaching_type]
        dept_teachers = [
            t for t in teachers if t["departmentId"] == subject["departmentId"]
        ] or teachers
        teacher_ids = [rng.choice(dept_teachers)["id"]]
        dept_groups = [
            g for g in groups if g["departmentId"] == subject["departmentId"]
        ] or groups
        group_ids = [g["id"] for g in rng.sample(dept_groups, k=min(2, len(dept_groups)))]
        activities.append({
            "id": _det_uuid(rng.randint(0, 1 << 30), "activity", idx),
            "subjectId": subject["id"],
            "teacherIds": teacher_ids,
            "groupIds": group_ids,
            "roomType": room_type,
            "durationSlots": duration,
            "weeklyVolume": volume,
            "teachingType": teaching_type,
        })
        remaining -= volume
        idx += 1
    return activities
def _make_constraints(
    rng: random.Random,
    activities: list[dict[str, Any]],
    teachers: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    import json
    constraints: list[dict[str, Any]] = []
    for teacher in teachers:
        for unav in teacher.get("unavailableSlots", []):
            if rng.random() < 0.5:
                constraints.append({
                    "id": _det_uuid(rng.randint(0, 1 << 30), "c_unav", teacher["id"], unav["day"]),
                    "type": "UNAVAILABILITY",
                    "category": "HARD",
                    "scope": "TEACHER",
                    "targetId": teacher["id"],
                    "value": json.dumps({"day": unav["day"], "slots": unav["slots"]}),
                    "weight": 100,
                    "isActive": True,
                    "source": "AUTO",
                    "createdBy": _det_uuid(rng.randint(0, 1 << 30), "sys"),
                    "createdAt": _CREATED_AT,
                })
    for teacher in teachers[: max(5, len(teachers) // 10)]:
        if rng.random() < 0.3:
            constraints.append({
                "id": _det_uuid(rng.randint(0, 1 << 30), "c_pref", teacher["id"]),
                "type": "TEACHER_PREFERENCE",
                "category": "SOFT",
                "scope": "TEACHER",
                "targetId": teacher["id"],
                "value": json.dumps({"day": rng.randint(0, SF_DAYS - 1), "slot": rng.randint(0, SF_SLOTS_PER_DAY - 1)}),
                "weight": rng.randint(10, 60),
                "isActive": True,
                "source": "MANUAL",
                "createdBy": _det_uuid(rng.randint(0, 1 << 30), "user"),
                "createdAt": _CREATED_AT,
            })
    return constraints
def _make_locks(
    rng: random.Random,
    activities: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    import json
    locks: list[dict[str, Any]] = []
    for activity in activities[: max(3, len(activities) // 20)]:
        if rng.random() < 0.2:
            locks.append({
                "id": _det_uuid(rng.randint(0, 1 << 30), "lock", activity["id"]),
                "activityId": activity["id"],
                "lockType": "TIMESLOT",
                "value": json.dumps({
                    "day": rng.randint(0, SF_DAYS - 1),
                    "slot": rng.randint(0, SF_SLOTS_PER_DAY - activity["durationSlots"]),
                }),
                "poids": rng.randint(80, 100),
            })
    return locks


def generate_instance(case: BenchmarkCase) -> dict[str, Any]:
    rng = random.Random(case.seed)
    sessions = case.sessions

    rooms = _make_rooms(case.seed, rng, max(16, min(150, sessions // 5)))
    teachers = _make_teachers(rng, min(400, max(20, sessions // 2)))
    groups = _make_groups(rng, min(100, max(10, sessions // 10)))
    subjects = _make_subjects(rng, min(50, max(5, sessions // 20)))

    activities = _make_activities(rng, sessions, subjects, teachers, groups)

    capacity = _compute_capacity(rooms, teachers, groups)
    total_demand = sum(a["weeklyVolume"] for a in activities)
    if total_demand > min(capacity.values()) * 0.8:
        excess = total_demand - min(capacity.values()) * 0.8
        for a in reversed(activities):
            if excess <= 0:
                break
            reduce = min(a["weeklyVolume"] - 1, int(excess))
            a["weeklyVolume"] -= reduce
            excess -= reduce

    constraints = _make_constraints(rng, activities, teachers)
    locks = _make_locks(rng, activities)

    metadata = {
        "generationId": _det_uuid(case.seed, "gen"),
        "versionId": _det_uuid(case.seed, "ver"),
        "semestre": _SEMESTRE,
        "createdAt": _CREATED_AT,
        "timeSlotMinutes": 30,
        "days": SF_DAYS,
        "slotsPerDay": SF_SLOTS_PER_DAY,
    }
    time_grid = {
        "totalSlots": SF_DAYS * SF_SLOTS_PER_DAY,
        "slotDurationMinutes": 30,
        "dayLabels": ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
        "slotLabels": [f"{8 + s // 2:02d}:{30 * (s % 2):02d}" for s in range(SF_SLOTS_PER_DAY)],
    }

    return {
        "metadata": metadata,
        "timeGrid": time_grid,
        "rooms": rooms,
        "teachers": teachers,
        "groups": groups,
        "subjects": subjects,
        "activities": activities,
        "constraints": constraints,
        "locks": locks,
    }