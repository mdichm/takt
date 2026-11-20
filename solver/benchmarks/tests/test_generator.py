# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Tests du générateur d'instances de benchmark (spike SPK-01, TAKT-L07-05).

Tests exigés par la fiche :
- déterminisme (même graine → JSON identique) ;
- conformité structurelle au contrat DerivedFile (schéma zDerivedFile) ;
- ratios de volumétrie (nombre de séances cohérent) ;
- faisabilité : l'instance générée est soluble par le solveur.
"""

from __future__ import annotations

import json
import uuid

import pytest

from solver.benchmarks.specs import BenchmarkCase, ALL_CASES
from solver.benchmarks.generator import generate_instance
from solver.derived_file import validate_structure

UUID_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # DNS namespace


def _assert_conforms(data: dict, where: str) -> None:
    """Vérifie que `data` passe validate_structure (contrat DerivedFile)."""
    validate_structure(data)


class TestDeterminism:
    def test_same_seed_identical_json(self) -> None:
        case = BenchmarkCase(name="t", sessions=50, seed=42, time_limit_sec=60, max_scenarios=1)
        d1 = generate_instance(case)
        d2 = generate_instance(case)
        assert json.dumps(d1, sort_keys=True) == json.dumps(d2, sort_keys=True)

    def test_different_seed_different_output(self) -> None:
        case_a = BenchmarkCase(name="t", sessions=50, seed=42, time_limit_sec=60, max_scenarios=1)
        case_b = BenchmarkCase(name="t", sessions=50, seed=43, time_limit_sec=60, max_scenarios=1)
        d_a = generate_instance(case_a)
        d_b = generate_instance(case_b)
        assert json.dumps(d_a, sort_keys=True) != json.dumps(d_b, sort_keys=True)


class TestConformance:
    @pytest.mark.parametrize("case", ALL_CASES)
    def test_validates_against_derived_file_contract(self, case: BenchmarkCase) -> None:
        data = generate_instance(case)
        _assert_conforms(data, f"case {case.name}")

    def test_uuid_format(self) -> None:
        data = generate_instance(BenchmarkCase("t", 10, 1, 60, 1))
        for r in data["rooms"]:
            uuid.UUID(r["id"])
        for t in data["teachers"]:
            uuid.UUID(t["id"])
            uuid.UUID(t["departmentId"])
        for g in data["groups"]:
            uuid.UUID(g["id"])
            uuid.UUID(g["departmentId"])
        for s in data["subjects"]:
            uuid.UUID(s["id"])
            uuid.UUID(s["departmentId"])
        for a in data["activities"]:
            uuid.UUID(a["id"])
            uuid.UUID(a["subjectId"])
            for tid in a["teacherIds"]:
                uuid.UUID(tid)
            for gid in a["groupIds"]:
                uuid.UUID(gid)
        for c in data["constraints"]:
            uuid.UUID(c["id"])
            uuid.UUID(c["createdBy"])
            if c["targetId"] is not None:
                uuid.UUID(c["targetId"])
        for l in data["locks"]:
            uuid.UUID(l["id"])
            uuid.UUID(l["activityId"])


class TestRatios:
    def test_session_count_approximately_matches_target(self) -> None:
        data = generate_instance(BenchmarkCase("t", 200, 1, 60, 1))
        total_volume = sum(a["weeklyVolume"] for a in data["activities"])
        # Tolérance ±20% : le générateur peut ajuster pour la faisabilité.
        assert 0.8 * 200 <= total_volume <= 1.2 * 200

    def test_teachers_rooms_groups_present(self) -> None:
        data = generate_instance(BenchmarkCase("t", 200, 1, 60, 1))
        assert len(data["teachers"]) >= 10
        assert len(data["rooms"]) >= 5
        assert len(data["groups"]) >= 5
        assert len(data["subjects"]) >= 3

    def test_activities_have_valid_volumes(self) -> None:
        data = generate_instance(BenchmarkCase("t", 200, 1, 60, 1))
        for a in data["activities"]:
            assert 1 <= a["weeklyVolume"] <= 3
            assert 1 <= a["durationSlots"] <= 4
            assert a["roomType"] in ("AMPHI", "TD", "TP", "INFO", "ANY")
            assert a["teachingType"] in ("CM", "TD", "TP", "PROJET")


class TestFeasibility:
    def test_small_instance_is_solvable(self) -> None:
        """Une petite instance doit être soluble par le solveur (sanity check)."""
        from solver.model import TaktSolver
        data = generate_instance(BenchmarkCase("bench_small", 20, 7, 60, 1))
        solver = TaktSolver(data)
        scenarios = solver.solve(max_scenarios=1, time_limit_sec=60)
        assert len(scenarios) >= 1
        assert scenarios[0]["status"] in ("OPTIMAL", "FEASIBLE")
        placed_ids = {p["activityId"] for p in scenarios[0]["placements"]}
        total_activity_ids = {a["id"] for a in data["activities"]}
        assert len(placed_ids & total_activity_ids) > 0
        placed_ids = {p["activityId"] for p in scenarios[0]["placements"]}
        total_activity_ids = {a["id"] for a in data["activities"]}
        assert len(placed_ids & total_activity_ids) > 0
