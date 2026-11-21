# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Tests unitaires du chargeur/validateur de fichier dérivé (derived_file.py)."""

from __future__ import annotations

import json
import os
import tempfile
import unittest

from solver.derived_file import (
    DerivedFileInvalid,
    load_from_file,
    load_from_stdin,
    load_from_text,
    parse_constraint_value,
    validate_structure,
)

from .instances import minimal_derived_file


class TestDerivedFileLoading(unittest.TestCase):
    """Tests de chargement et validation structurelle."""

    def test_valid_minimal(self):
        data = minimal_derived_file()
        result = load_from_text(json.dumps(data))
        self.assertEqual(result["metadata"]["generationId"], "gen-test")

    def test_invalid_json(self):
        with self.assertRaises(DerivedFileInvalid):
            load_from_text("{ pas du json")

    def test_root_not_object(self):
        with self.assertRaises(DerivedFileInvalid):
            load_from_text("[1, 2, 3]")

    def test_missing_top_key(self):
        data = minimal_derived_file()
        del data["rooms"]
        with self.assertRaises(DerivedFileInvalid):
            load_from_text(json.dumps(data))

    def test_wrong_days(self):
        data = minimal_derived_file()
        data["metadata"]["days"] = 5
        with self.assertRaises(DerivedFileInvalid):
            load_from_text(json.dumps(data))

    def test_wrong_slots_per_day(self):
        data = minimal_derived_file()
        data["metadata"]["slotsPerDay"] = 12
        with self.assertRaises(DerivedFileInvalid):
            load_from_text(json.dumps(data))

    def test_wrong_slot_duration(self):
        data = minimal_derived_file()
        data["metadata"]["timeSlotMinutes"] = 15
        with self.assertRaises(DerivedFileInvalid):
            load_from_text(json.dumps(data))

    def test_wrong_day_labels_count(self):
        data = minimal_derived_file()
        data["timeGrid"]["dayLabels"] = ["Lun", "Mar"]
        with self.assertRaises(DerivedFileInvalid):
            load_from_text(json.dumps(data))

    def test_activity_missing_teacher(self):
        data = minimal_derived_file()
        data["activities"][0]["teacherIds"] = []
        with self.assertRaises(DerivedFileInvalid):
            load_from_text(json.dumps(data))

    def test_activity_missing_group(self):
        data = minimal_derived_file()
        data["activities"][0]["groupIds"] = []
        with self.assertRaises(DerivedFileInvalid):
            load_from_text(json.dumps(data))

    def test_activity_duration_zero(self):
        data = minimal_derived_file()
        data["activities"][0]["durationSlots"] = 0
        with self.assertRaises(DerivedFileInvalid):
            load_from_text(json.dumps(data))

    def test_constraint_weight_out_of_range(self):
        data = minimal_derived_file()
        data["constraints"] = [{
            "id": "c-1", "type": "TEACHER_PREFERENCE", "category": "SOFT",
            "scope": "TEACHER", "targetId": "teacher-1",
            "value": '{"day": 1, "slot": 10}', "weight": 0,
            "isActive": True, "source": "MANUAL",
            "createdBy": "user-1", "createdAt": "2026-01-01T00:00:00Z",
        }]
        with self.assertRaises(DerivedFileInvalid):
            load_from_text(json.dumps(data))

    def test_lock_poids_out_of_range(self):
        data = minimal_derived_file()
        data["locks"] = [{
            "id": "l-1", "activityId": "activity-1",
            "lockType": "ROOM", "value": "room-1", "poids": 0,
        }]
        with self.assertRaises(DerivedFileInvalid):
            load_from_text(json.dumps(data))

    def test_load_from_file_missing(self):
        with self.assertRaises(DerivedFileInvalid):
            load_from_file("/chemin/inexistant/fichier.json")

    def test_load_from_file_ok(self):
        data = minimal_derived_file()
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8"
        ) as fh:
            json.dump(data, fh)
            path = fh.name
        try:
            result = load_from_file(path)
            self.assertEqual(result["metadata"]["generationId"], "gen-test")
        finally:
            os.unlink(path)


class TestParseConstraintValue(unittest.TestCase):
    """Tests de l'interprétation tolérante du champ ``value``."""

    def test_json_object(self):
        self.assertEqual(
            parse_constraint_value('{"day": 1, "slot": 10}', "TEACHER_PREFERENCE"),
            {"day": 1, "slot": 10},
        )

    def test_json_array(self):
        self.assertEqual(
            parse_constraint_value('[1, 2, 3]', "ROOM_PROXIMITY"),
            [1, 2, 3],
        )

    def test_legacy_day_slot(self):
        self.assertEqual(
            parse_constraint_value("1:10", "UNAVAILABILITY"),
            {"day": 1, "slot": 10},
        )

    def test_integer(self):
        self.assertEqual(parse_constraint_value("42", "MAX_HOURS_PER_WEEK"), 42)

    def test_negative_integer(self):
        self.assertEqual(parse_constraint_value("-5", "SOME_TYPE"), -5)

    def test_boolean(self):
        self.assertEqual(parse_constraint_value("true", "SOME_TYPE"), True)
        self.assertEqual(parse_constraint_value("false", "SOME_TYPE"), False)

    def test_plain_string(self):
        self.assertEqual(parse_constraint_value("room-1", "ROOM"), "room-1")


if __name__ == "__main__":
    unittest.main()
