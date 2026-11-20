# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Constructeurs de fixtures ``DerivedFile`` pour les tests unitaires.

Toutes les instances retournées sont valides selon le schéma ``zDerivedFile``.
"""

from __future__ import annotations

from typing import Any


def _base_metadata(generation_id: str = "gen-test") -> dict[str, Any]:
    return {
        "generationId": generation_id,
        "versionId": "ver-test",
        "semestre": "S1",
        "createdAt": "2026-01-01T00:00:00Z",
        "timeSlotMinutes": 30,
        "days": 6,
        "slotsPerDay": 24,
    }


def _base_time_grid() -> dict[str, Any]:
    return {
        "totalSlots": 144,
        "slotDurationMinutes": 30,
        "dayLabels": ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
        "slotLabels": ["08:00"] * 24,
    }


def minimal_derived_file() -> dict[str, Any]:
    """Instance minimale valide : 1 activité, 1 salle, 1 enseignant, 1 groupe."""
    return {
        "metadata": _base_metadata(),
        "timeGrid": _base_time_grid(),
        "rooms": [
            {"id": "room-1", "code": "A101", "type": "AMPHI", "capacity": 100,
             "building": "B1", "equipment": []},
        ],
        "teachers": [
            {"id": "teacher-1", "code": "T1", "name": "Prof 1",
             "departmentId": "dept-1", "maxHoursPerWeek": 20,
             "unavailableSlots": []},
        ],
        "groups": [
            {"id": "group-1", "code": "G1", "size": 30, "departmentId": "dept-1"},
        ],
        "subjects": [
            {"id": "subject-1", "code": "M1", "name": "Matiere 1",
             "departmentId": "dept-1", "teachingType": "CM",
             "chargeCoefficient": 1.0},
        ],
        "activities": [
            {"id": "activity-1", "subjectId": "subject-1",
             "teacherIds": ["teacher-1"], "groupIds": ["group-1"],
             "roomType": "AMPHI", "durationSlots": 2, "weeklyVolume": 1,
             "teachingType": "CM"},
        ],
        "constraints": [],
        "locks": [],
    }


def derived_with_volume_too_high() -> dict[str, Any]:
    """Volume hebdomadaire 7 sur 6 jours -> infaisable (HC-STR-04)."""
    data = minimal_derived_file()
    data["activities"][0]["weeklyVolume"] = 7
    return data


def derived_with_conflict_same_room() -> dict[str, Any]:
    """2 activités, 1 salle, même créneau de volume -> conflit dur salle."""
    data = minimal_derived_file()
    data["activities"].append({
        "id": "activity-2", "subjectId": "subject-1",
        "teacherIds": ["teacher-1"], "groupIds": ["group-1"],
        "roomType": "AMPHI", "durationSlots": 2, "weeklyVolume": 1,
        "teachingType": "CM",
    })
    return data


def derived_with_teacher_unavailable() -> dict[str, Any]:
    """Enseignant indisponible le jour 0 -> l'activité ne doit pas être ce jour-là."""
    data = minimal_derived_file()
    data["teachers"][0]["unavailableSlots"] = [
        {"day": 0, "slots": [0, 1, 2, 3], "allDay": False}
    ]
    return data


def derived_with_timeslot_lock() -> dict[str, Any]:
    """Verrou TIMESLOT sur activity-1 : jour 2, créneau 5."""
    data = minimal_derived_file()
    data["locks"] = [
        {"id": "lock-1", "activityId": "activity-1",
         "lockType": "TIMESLOT", "value": '{"day": 2, "slot": 5}', "poids": 100}
    ]
    return data


def derived_with_room_lock() -> dict[str, Any]:
    """Verrou ROOM sur activity-1 : salle room-1."""
    data = minimal_derived_file()
    data["locks"] = [
        {"id": "lock-2", "activityId": "activity-1",
         "lockType": "ROOM", "value": "room-1", "poids": 100}
    ]
    return data


def derived_with_teacher_preference() -> dict[str, Any]:
    """Préférence enseignant : teacher-1 préfère jour 1, créneau 10."""
    data = minimal_derived_file()
    data["constraints"] = [
        {"id": "c-1", "type": "TEACHER_PREFERENCE", "category": "SOFT",
         "scope": "TEACHER", "targetId": "teacher-1",
         "value": '{"day": 1, "slot": 10}', "weight": 50,
         "isActive": True, "source": "MANUAL",
         "createdBy": "user-1", "createdAt": "2026-01-01T00:00:00Z"}
    ]
    return data
