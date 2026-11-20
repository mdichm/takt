# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Tests unitaires de l'assemblage et de l'écriture des scénarios (scenarios.py)."""

from __future__ import annotations

import json
import os
import tempfile
import unittest

from solver.scenarios import assemble_scenarios, write_output, _peak_rss_mb


class TestAssembleScenarios(unittest.TestCase):
    """Tests de l'assemblage des scénarios conformes à zSolverScenario."""

    def setUp(self):
        self.derived = {
            "metadata": {
                "generationId": "gen-1",
                "versionId": "ver-1",
                "semestre": "S1",
                "createdAt": "2026-01-01T00:00:00Z",
                "timeSlotMinutes": 30,
                "days": 6,
                "slotsPerDay": 24,
            },
            "activities": [],
            "constraints": [],
        }

    def test_assemble_adds_required_fields(self):
        raw = [{
            "id": "raw-1",
            "placements": [
                {"activityId": "a-1", "day": 0, "slot": 0,
                 "roomId": "r-1", "teacherId": "t-1"},
            ],
            "unplacedActivities": [],
            "status": "OPTIMAL",
        }]
        scenarios = assemble_scenarios(raw, self.derived, max_scenarios=3)
        self.assertEqual(len(scenarios), 1)
        s = scenarios[0]
        # Champs requis par zSolverScenario.
        self.assertIn("id", s)
        self.assertEqual(s["generationId"], "gen-1")
        self.assertIsInstance(s["score"], int)
        self.assertGreaterEqual(s["score"], 0)
        self.assertLessEqual(s["score"], 100)
        self.assertIn("subScores", s)
        self.assertIsInstance(s["placements"], list)
        self.assertIsInstance(s["unplacedActivities"], list)
        self.assertEqual(s["status"], "OPTIMAL")
        self.assertIn("createdAt", s)

    def test_partial_status_when_unplaced(self):
        raw = [{
            "id": "raw-1",
            "placements": [],
            "unplacedActivities": ["a-1"],
            "status": "OPTIMAL",
        }]
        scenarios = assemble_scenarios(raw, self.derived, max_scenarios=3)
        self.assertEqual(scenarios[0]["status"], "PARTIAL")

    def test_max_scenarios_respected(self):
        raw = [{
            "id": f"raw-{i}",
            "placements": [],
            "unplacedActivities": [],
            "status": "OPTIMAL",
        } for i in range(5)]
        scenarios = assemble_scenarios(raw, self.derived, max_scenarios=2)
        self.assertEqual(len(scenarios), 2)


class TestPeakRss(unittest.TestCase):
    """Tests de la mesure RSS."""

    def test_peak_rss_mb_non_negative(self):
        value = _peak_rss_mb()
        self.assertIsInstance(value, float)
        self.assertGreaterEqual(value, 0)


class TestWriteOutput(unittest.TestCase):
    """Tests de l'écriture stdout et fichiers."""

    def test_writes_envelope_to_stdout(self):
        scenarios = [{
            "id": "s-1", "generationId": "gen-1", "score": 100,
            "subScores": {"coverage": 100, "timeslotRespect": 100,
                          "roomRespect": 100, "teacherRespect": 100,
                          "continuity": 100, "loadBalance": 100},
            "placements": [], "unplacedActivities": [],
            "status": "OPTIMAL", "createdAt": "2026-01-01T00:00:00Z",
        }]
        # Capturer stdout.
        import io
        from contextlib import redirect_stdout
        buf = io.StringIO()
        with redirect_stdout(buf):
            write_output(scenarios, None)
        output = buf.getvalue()
        envelope = json.loads(output)
        self.assertEqual(len(envelope["scenarios"]), 1)
        self.assertIn("metrics", envelope)
        self.assertIn("peakRssMb", envelope["metrics"])

    def test_writes_files_in_directory(self):
        scenarios = [{
            "id": "s-1", "generationId": "gen-1", "score": 100,
            "subScores": {"coverage": 100, "timeslotRespect": 100,
                          "roomRespect": 100, "teacherRespect": 100,
                          "continuity": 100, "loadBalance": 100},
            "placements": [], "unplacedActivities": [],
            "status": "OPTIMAL", "createdAt": "2026-01-01T00:00:00Z",
        }]
        with tempfile.TemporaryDirectory() as tmpdir:
            write_output(scenarios, tmpdir)
            files = sorted(os.listdir(tmpdir))
            self.assertIn("scenario_0.json", files)
            with open(os.path.join(tmpdir, "scenario_0.json")) as fh:
                data = json.load(fh)
            self.assertEqual(data["id"], "s-1")

    def test_writes_single_file_when_json_extension(self):
        scenarios = [{
            "id": "s-1", "generationId": "gen-1", "score": 100,
            "subScores": {"coverage": 100, "timeslotRespect": 100,
                          "roomRespect": 100, "teacherRespect": 100,
                          "continuity": 100, "loadBalance": 100},
            "placements": [], "unplacedActivities": [],
            "status": "OPTIMAL", "createdAt": "2026-01-01T00:00:00Z",
        }]
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8"
        ) as fh:
            path = fh.name
        try:
            write_output(scenarios, path)
            with open(path) as fh:
                data = json.load(fh)
            self.assertEqual(len(data["scenarios"]), 1)
            self.assertIn("metrics", data)
        finally:
            os.unlink(path)


if __name__ == "__main__":
    unittest.main()
