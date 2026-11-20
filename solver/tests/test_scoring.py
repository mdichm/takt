# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Tests unitaires du module de scoring (scoring.py)."""

from __future__ import annotations

import unittest

from solver.scoring import compute_global_score, compute_sub_scores


class TestComputeSubScores(unittest.TestCase):
    """Tests du calcul des sous-scores."""

    def test_all_placed_all_preferences(self):
        derived = {
            "activities": [
                {"id": "a-1", "weeklyVolume": 1, "durationSlots": 2,
                 "teacherIds": ["t-1"], "groupIds": ["g-1"]},
            ],
            "constraints": [
                {"id": "c-1", "type": "TEACHER_PREFERENCE", "category": "SOFT",
                 "targetId": "t-1", "value": '{"day": 0, "slot": 0}',
                 "weight": 50, "isActive": True},
            ],
        }
        placements = [
            {"activityId": "a-1", "day": 0, "slot": 0,
             "roomId": "r-1", "teacherId": "t-1"},
        ]
        scores = compute_sub_scores(placements, [], derived)
        self.assertEqual(scores["coverage"], 100)
        self.assertEqual(scores["timeslotRespect"], 100)
        self.assertEqual(scores["roomRespect"], 100)
        self.assertEqual(scores["teacherRespect"], 100)
        self.assertEqual(scores["continuity"], 100)

    def test_no_placements_coverage_zero(self):
        derived = {
            "activities": [
                {"id": "a-1", "weeklyVolume": 1, "durationSlots": 2,
                 "teacherIds": ["t-1"], "groupIds": ["g-1"]},
            ],
            "constraints": [],
        }
        scores = compute_sub_scores([], ["a-1"], derived)
        self.assertEqual(scores["coverage"], 0)

    def test_no_constraints_respect_is_100(self):
        derived = {
            "activities": [
                {"id": "a-1", "weeklyVolume": 1, "durationSlots": 2,
                 "teacherIds": ["t-1"], "groupIds": ["g-1"]},
            ],
            "constraints": [],
        }
        scores = compute_sub_scores(
            [{"activityId": "a-1", "day": 0, "slot": 0,
              "roomId": "r-1", "teacherId": "t-1"}],
            [],
            derived,
        )
        self.assertEqual(scores["timeslotRespect"], 100)
        self.assertEqual(scores["teacherRespect"], 100)


class TestComputeGlobalScore(unittest.TestCase):
    """Tests du score global pondéré."""

    def test_weighted_average(self):
        sub_scores = {
            "coverage": 100,
            "timeslotRespect": 0,
            "roomRespect": 0,
            "teacherRespect": 0,
            "continuity": 0,
            "loadBalance": 0,
        }
        # coverage a un poids de 25 sur 100.
        self.assertEqual(compute_global_score(sub_scores), 25)

    def test_all_100_is_100(self):
        sub_scores = {k: 100 for k in (
            "coverage", "timeslotRespect", "roomRespect",
            "teacherRespect", "continuity", "loadBalance",
        )}
        self.assertEqual(compute_global_score(sub_scores), 100)

    def test_all_0_is_0(self):
        sub_scores = {k: 0 for k in (
            "coverage", "timeslotRespect", "roomRespect",
            "teacherRespect", "continuity", "loadBalance",
        )}
        self.assertEqual(compute_global_score(sub_scores), 0)


if __name__ == "__main__":
    unittest.main()
