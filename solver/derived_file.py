# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Chargement et validation structurelle d'un fichier dérivé ``DerivedFile``.

Responsabilités
---------------
* lecture du JSON d'entrée (fichier ou stdin) ;
* validation des invariants structurels (clés requises, types, grille 6 jours × 24
  créneaux de 30 min) → erreur ``DERIVED_FILE_INVALID`` (SPEC_SOLVER_CPSAT §9) ;
* interprétation tolérante des champs ``value`` (JSON d'abord, formats legacy ensuite) ;
* aucune dépendance métier : ce module ne connaît ni Prisma, ni la base de données.
"""

from __future__ import annotations

import json
import sys
from typing import Any


class DerivedFileInvalid(Exception):
    """Le fichier dérivé ne respecte pas le contrat structurel d'entrée."""


REQUIRED_TOP_KEYS = (
    "metadata",
    "timeGrid",
    "rooms",
    "teachers",
    "groups",
    "subjects",
    "activities",
    "constraints",
    "locks",
)

EXPECTED_DAYS = 6
EXPECTED_SLOTS_PER_DAY = 24
EXPECTED_SLOT_DURATION_MINUTES = 30


def _fail(message: str) -> None:
    raise DerivedFileInvalid(message)


def load_json(text: str) -> dict[str, Any]:
    """Parse un texte JSON en dict, ou lève :class:`DerivedFileInvalid`."""
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        _fail(f"JSON d'entrée invalide : {exc}")
    if not isinstance(data, dict):
        _fail("La racine du fichier dérivé doit être un objet JSON.")
    return data


def _require_keys(obj: dict[str, Any], keys: tuple[str, ...], where: str) -> None:
    missing = [k for k in keys if k not in obj]
    if missing:
        _fail(f"{where} : clés manquantes {missing}")


def _require_list(obj: dict[str, Any], key: str, where: str) -> list[Any]:
    value = obj.get(key)
    if not isinstance(value, list):
        _fail(f"{where} : '{key}' doit être une liste.")
    return value


def _require_int(obj: dict[str, Any], key: str, where: str, expected: int | None = None) -> int:
    value = obj.get(key)
    if not isinstance(value, int) or isinstance(value, bool):
        _fail(f"{where} : '{key}' doit être un entier.")
    if expected is not None and value != expected:
        _fail(f"{where} : '{key}' doit valoir {expected} (reçu {value}).")
    return value



def parse_constraint_value(value: str, constraint_type: str) -> Any:
    """Interprète le champ ``value`` d'une contrainte.

    Stratégie : JSON d'abord, puis formats legacy (``jour:slot``, nombre, booléen).
    Les types de contrainte inconnus ne font pas échouer le chargement : ils sont
    signalés par l'appelant (warn + ignore) selon SPEC_CONTRAINTES_GENERATION §3.
    """
    if not isinstance(value, str):
        _fail(f"Contrainte '{constraint_type}' : 'value' doit être une chaîne.")
    # 1. JSON pur (format canonique).
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        pass
    # 2. Format legacy "jour:slot" (ex. indisponibilité / préférence de créneau).
    if ":" in value:
        parts = value.split(":")
        if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
            return {"day": int(parts[0]), "slot": int(parts[1])}
    # 3. Nombre entier.
    if value.isdigit() or (value.startswith("-") and value[1:].isdigit()):
        return int(value)
    # 4. Booléen.
    if value.lower() in ("true", "false"):
        return value.lower() == "true"
    # 5. Chaîne brute (ex. identifiant de salle).
    return value


def parse_lock_value(value: str, lock_type: str) -> Any:
    """Interprète le champ ``value`` d'un verrou de séance."""
    return parse_constraint_value(value, lock_type)


def validate_structure(data: dict[str, Any]) -> None:
    """Vérifie les invariants structurels du fichier dérivé (SPEC_SOLVER_CPSAT §9)."""
    _require_keys(data, REQUIRED_TOP_KEYS, "racine du DerivedFile")

    metadata = data["metadata"]
    _require_keys(metadata, ("generationId", "versionId", "semestre", "createdAt",
                             "timeSlotMinutes", "days", "slotsPerDay"), "metadata")
    _require_int(metadata, "timeSlotMinutes", "metadata", EXPECTED_SLOT_DURATION_MINUTES)
    _require_int(metadata, "days", "metadata", EXPECTED_DAYS)
    _require_int(metadata, "slotsPerDay", "metadata", EXPECTED_SLOTS_PER_DAY)

    time_grid = data["timeGrid"]
    _require_keys(time_grid, ("totalSlots", "slotDurationMinutes", "dayLabels", "slotLabels"),
                  "timeGrid")
    _require_int(time_grid, "slotDurationMinutes", "timeGrid", EXPECTED_SLOT_DURATION_MINUTES)
    day_labels = time_grid.get("dayLabels")
    slot_labels = time_grid.get("slotLabels")
    if not isinstance(day_labels, list) or len(day_labels) != EXPECTED_DAYS:
        _fail("timeGrid.dayLabels doit contenir exactement 6 entrées.")
    if not isinstance(slot_labels, list) or len(slot_labels) != EXPECTED_SLOTS_PER_DAY:
        _fail("timeGrid.slotLabels doit contenir exactement 24 entrées.")

    for key in ("rooms", "teachers", "groups", "subjects", "activities", "constraints", "locks"):
        _require_list(data, key, key)

    for idx, activity in enumerate(data["activities"]):
        where = f"activities[{idx}]"
        for key in ("id", "subjectId", "teacherIds", "groupIds", "roomType", "durationSlots",
                    "weeklyVolume", "teachingType"):
            if key not in activity:
                _fail(f"{where} : clé manquante '{key}'.")
        if not isinstance(activity["teacherIds"], list) or len(activity["teacherIds"]) == 0:
            _fail(f"{where} : 'teacherIds' doit être une liste non vide.")
        if not isinstance(activity["groupIds"], list) or len(activity["groupIds"]) == 0:
            _fail(f"{where} : 'groupIds' doit être une liste non vide.")
        if not isinstance(activity["durationSlots"], int) or activity["durationSlots"] < 1:
            _fail(f"{where} : 'durationSlots' doit être un entier >= 1.")
        if not isinstance(activity["weeklyVolume"], int) or activity["weeklyVolume"] < 1:
            _fail(f"{where} : 'weeklyVolume' doit être un entier >= 1.")

    for idx, constraint in enumerate(data["constraints"]):
        where = f"constraints[{idx}]"
        for key in ("id", "type", "category", "value", "weight", "isActive"):
            if key not in constraint:
                _fail(f"{where} : clé manquante '{key}'.")
        if not isinstance(constraint["weight"], int) or not (1 <= constraint["weight"] <= 100):
            _fail(f"{where} : 'weight' doit être un entier entre 1 et 100.")

    for idx, lock in enumerate(data["locks"]):
        where = f"locks[{idx}]"
        for key in ("id", "activityId", "lockType", "value", "poids"):
            if key not in lock:
                _fail(f"{where} : clé manquante '{key}'.")
        if not isinstance(lock["poids"], int) or not (1 <= lock["poids"] <= 100):
            _fail(f"{where} : 'poids' doit être un entier entre 1 et 100.")


def load_from_text(text: str) -> dict[str, Any]:
    """Charge, valide et retourne un DerivedFile à partir d'un texte JSON."""
    data = load_json(text)
    validate_structure(data)
    return data


def load_from_file(path: str) -> dict[str, Any]:
    """Charge un DerivedFile depuis un fichier JSON."""
    try:
        with open(path, "r", encoding="utf-8") as fh:
            text = fh.read()
    except OSError as exc:
        _fail(f"Impossible de lire le fichier d'entrée '{path}' : {exc}")
    return load_from_text(text)


def load_from_stdin() -> dict[str, Any]:
    """Charge un DerivedFile depuis l'entrée standard."""
    return load_from_text(sys.stdin.read())
