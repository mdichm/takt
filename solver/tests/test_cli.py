# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Tests unitaires du point d'entrée CLI (cp_sat_model.py)."""

from __future__ import annotations

import json
import os
import tempfile
import unittest

from solver.cp_sat_model import main


class TestCliHelp(unittest.TestCase):
    """Tests de l'aide en ligne de commande."""

    def test_help_returns_zero(self):
        import pytest
        with pytest.raises(SystemExit) as exc_info:
            main(["--help"])
        self.assertEqual(exc_info.value.code, 0)


class TestCliExecution(unittest.TestCase):
    """Tests d'exécution du solveur via la CLI."""

    def setUp(self):
        self.derived = {
            "metadata": {
                "generationId": "gen-cli",
                "versionId": "ver-cli",
                "semestre": "S1",
                "createdAt": "2026-01-01T00:00:00Z",
                "timeSlotMinutes": 30,
                "days": 6,
                "slotsPerDay": 24,
            },
            "timeGrid": {
                "totalSlots": 144,
                "slotDurationMinutes": 30,
                "dayLabels": ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
                "slotLabels": ["08:00"] * 24,
            },
            "rooms": [
                {"id": "room-1", "code": "A101", "type": "AMPHI",
                 "capacity": 100, "building": "B1", "equipment": []},
            ],
            "teachers": [
                {"id": "teacher-1", "code": "T1", "name": "Prof 1",
                 "departmentId": "dept-1", "maxHoursPerWeek": 20,
                 "unavailableSlots": []},
            ],
            "groups": [
                {"id": "group-1", "code": "G1", "size": 30,
                 "departmentId": "dept-1"},
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
        self.tmpdir = tempfile.TemporaryDirectory()
        self.input_path = os.path.join(self.tmpdir.name, "derived.json")
        with open(self.input_path, "w", encoding="utf-8") as fh:
            json.dump(self.derived, fh)

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_normal_execution_returns_zero(self):
        output_dir = os.path.join(self.tmpdir.name, "out")
        rc = main([
            "--input", self.input_path,
            "--output", output_dir,
            "--max-scenarios", "1",
            "--time-limit", "10",
        ])
        self.assertEqual(rc, 0)
        self.assertTrue(os.path.isdir(output_dir))
        files = os.listdir(output_dir)
        self.assertGreaterEqual(len(files), 1)

    def test_stdout_is_valid_json_envelope(self):
        import io
        from contextlib import redirect_stdout
        buf = io.StringIO()
        output_dir = os.path.join(self.tmpdir.name, "out2")
        with redirect_stdout(buf):
            rc = main([
                "--input", self.input_path,
                "--output", output_dir,
                "--max-scenarios", "1",
                "--time-limit", "10",
            ])
        self.assertEqual(rc, 0)
        envelope = json.loads(buf.getvalue())
        self.assertIn("scenarios", envelope)
        self.assertIn("metrics", envelope)
        self.assertIn("peakRssMb", envelope["metrics"])
        self.assertGreaterEqual(len(envelope["scenarios"]), 1)

    def test_missing_input_file_returns_one(self):
        rc = main(["--input", "/chemin/inexistant.json"])
        self.assertEqual(rc, 1)

    def test_invalid_json_returns_one(self):
        bad_path = os.path.join(self.tmpdir.name, "bad.json")
        with open(bad_path, "w", encoding="utf-8") as fh:
            fh.write("{ pas du json")
        rc = main(["--input", bad_path])
        self.assertEqual(rc, 1)

    def test_env_variables(self):
        """Les variables d'environnement servent de repli aux arguments CLI."""
        os.environ["DERIVED_FILE_PATH"] = self.input_path
        output_dir = os.path.join(self.tmpdir.name, "out_env")
        os.environ["OUTPUT_PATH"] = output_dir
        os.environ["MAX_SCENARIOS"] = "1"
        os.environ["TIMEOUT_SEC"] = "10"
        try:
            rc = main([])  # pas d'arguments CLI -> repli sur les env
            self.assertEqual(rc, 0)
            self.assertTrue(os.path.isdir(output_dir))
        finally:
            for k in ("DERIVED_FILE_PATH", "OUTPUT_PATH", "MAX_SCENARIOS",
                      "TIMEOUT_SEC"):
                os.environ.pop(k, None)


if __name__ == "__main__":
    unittest.main()
