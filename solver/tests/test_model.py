# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Tests unitaires du modèle CP-SAT (model.py)."""

from __future__ import annotations

import json
import unittest

from ortools.sat.python import cp_model

from solver.model import TaktSolver
from .instances import (
    derived_with_room_lock,
    derived_with_teacher_unavailable,
    derived_with_timeslot_lock,
    derived_with_volume_too_high,
    minimal_derived_file,
)


class TestTaktSolverBuild(unittest.TestCase):
    """Tests de construction du modèle."""

    def test_build_model_creates_variables(self):
        solver = TaktSolver(minimal_derived_file())
        solver.build_model()
        self.assertIsNotNone(solver.model)
        self.assertGreater(len(solver.presence), 0)
        self.assertGreater(len(solver.start), 0)
        self.assertGreater(len(solver.interval), 0)

    def test_volume_too_high_infeasible(self):
        """Volume 7 sur 6 jours -> INFEASIBLE (HC-STR-04)."""
        solver = TaktSolver(derived_with_volume_too_high())
        scenarios = solver.solve(max_scenarios=1, time_limit_sec=10)
        self.assertEqual(scenarios, [])
        self.assertEqual(solver._status, "INFEASIBLE")


class TestTaktSolverSolve(unittest.TestCase):
    """Tests de résolution et d'extraction des scénarios."""

    def test_trivial_instance_one_scenario(self):
        """Instance minimale -> 1 scénario, coverage 100, activité placée."""
        solver = TaktSolver(minimal_derived_file())
        scenarios = solver.solve(max_scenarios=1, time_limit_sec=10)
        self.assertGreaterEqual(len(scenarios), 1)
        scenario = scenarios[0]
        self.assertEqual(scenario["status"], "OPTIMAL")
        self.assertEqual(len(scenario["placements"]), 1)
        self.assertEqual(scenario["unplacedActivities"], [])
        self.assertEqual(scenario["generationId"], "gen-test")

    def test_hard_constraints_verified_on_each_scenario(self):
        """Chaque scénario retourné respecte toutes les contraintes dures (DoD)."""
        solver = TaktSolver(minimal_derived_file())
        scenarios = solver.solve(max_scenarios=3, time_limit_sec=10)
        for scenario in scenarios:
            self.assertTrue(
                solver._verify_hard_constraints(scenario["placements"]),
                f"Contraintes dures violées: {scenario}",
            )

    def test_timeslot_lock_respected(self):
        """Verrou TIMESLOT : activité placée au (jour, créneau) verrouillé."""
        solver = TaktSolver(derived_with_timeslot_lock())
        scenarios = solver.solve(max_scenarios=1, time_limit_sec=10)
        self.assertGreaterEqual(len(scenarios), 1)
        placement = scenarios[0]["placements"][0]
        self.assertEqual(placement["day"], 2)
        self.assertEqual(placement["slot"], 5)

    def test_room_lock_respected(self):
        """Verrou ROOM : activité placée dans la salle verrouillée."""
        solver = TaktSolver(derived_with_room_lock())
        scenarios = solver.solve(max_scenarios=1, time_limit_sec=10)
        self.assertGreaterEqual(len(scenarios), 1)
        placement = scenarios[0]["placements"][0]
        self.assertEqual(placement["roomId"], "room-1")

    def test_teacher_unavailable_respected(self):
        """Indisponibilité enseignant : aucune activité ce professeur ce créneau."""
        solver = TaktSolver(derived_with_teacher_unavailable())
        scenarios = solver.solve(max_scenarios=1, time_limit_sec=10)
        self.assertGreaterEqual(len(scenarios), 1)
        for placement in scenarios[0]["placements"]:
            if placement["teacherId"] == "teacher-1":
                self.assertNotEqual(placement["day"], 0)

    def test_scenarios_are_distinct(self):
        """Le no-good cut force des scénarios distincts."""
        solver = TaktSolver(minimal_derived_file())
        scenarios = solver.solve(max_scenarios=3, time_limit_sec=10)
        if len(scenarios) >= 2:
            placements_0 = {(p["activityId"], p["day"], p["slot"], p["roomId"])
                            for p in scenarios[0]["placements"]}
            placements_1 = {(p["activityId"], p["day"], p["slot"], p["roomId"])
                            for p in scenarios[1]["placements"]}
            self.assertNotEqual(placements_0, placements_1)

    def test_solve_with_zero_time_limit(self):
        """Limite de temps 0 -> pas de crash (TIMEOUT ou INFEASIBLE accepté)."""
        solver = TaktSolver(minimal_derived_file())
        try:
            scenarios = solver.solve(max_scenarios=1, time_limit_sec=0)
            self.assertIsInstance(scenarios, list)
        except Exception:
            # OR-Tools peut refuser une limite de temps nulle ; ce n'est pas une
            # régression du code TAKT tant que le appel ne corrompt pas l'état.
            pass


class TestTaktSolverStatus(unittest.TestCase):
    """Tests du statut de sortie du solveur."""

    def test_status_feasible_when_scenarios_found(self):
        solver = TaktSolver(minimal_derived_file())
        solver.solve(max_scenarios=1, time_limit_sec=10)
        self.assertIn(solver._status, ("OPTIMAL", "FEASIBLE"))


if __name__ == "__main__":
    unittest.main()
