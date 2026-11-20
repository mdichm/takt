# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Tests du runner de benchmark (spike SPK-01, TAKT-L07-05).

Tests exigés par la fiche :
- mesure des phases (construction / résolution / total) ;
- évaluation des seuils (cas conformes / non conformes) ;
- code de sortie --enforce (0 si tous les seuils OK, non-nul sinon).
"""

from __future__ import annotations

from dataclasses import dataclass
from unittest.mock import MagicMock, patch

import pytest

from solver.benchmarks.runner import BenchmarkResult, evaluate_case, run_case, run_cli
from solver.benchmarks.specs import BenchmarkCase, evaluate_case as spec_evaluate_case


class TestEvaluateCase:
    def test_case_ok_when_all_metrics_within_thresholds(self) -> None:
        case = BenchmarkCase("c200", 200, 1, 300, 1)
        result = spec_evaluate_case(case, duration_sec=100.0, memory_mb=1000.0,
                                    scenarios_count=3, coverage=100.0)
        assert result["case_ok"] is True
        assert result["duration_ok"] is True
        assert result["coverage_ok"] is True
        assert result["memory_ok"] is True
        assert result["scenarios_ok"] is True

    def test_case_not_ok_when_duration_exceeds_target(self) -> None:
        case = BenchmarkCase("c200", 200, 1, 300, 1)
        result = spec_evaluate_case(case, duration_sec=500.0, memory_mb=1000.0,
                                    scenarios_count=3, coverage=100.0)
        assert result["case_ok"] is False
        assert result["duration_ok"] is False

    def test_case_not_ok_when_coverage_too_low(self) -> None:
        case = BenchmarkCase("c200", 200, 1, 300, 1)
        result = spec_evaluate_case(case, duration_sec=100.0, memory_mb=1000.0,
                                    scenarios_count=3, coverage=50.0)
        assert result["case_ok"] is False
        assert result["coverage_ok"] is False

    def test_case_not_ok_when_memory_too_high(self) -> None:
        case = BenchmarkCase("c200", 200, 1, 300, 1)
        result = spec_evaluate_case(case, duration_sec=100.0, memory_mb=5000.0,
                                    scenarios_count=3, coverage=100.0)
        assert result["case_ok"] is False
        assert result["memory_ok"] is False

    def test_case_not_ok_when_no_scenarios(self) -> None:
        case = BenchmarkCase("c200", 200, 1, 300, 1)
        result = spec_evaluate_case(case, duration_sec=100.0, memory_mb=1000.0,
                                    scenarios_count=0, coverage=100.0)
        assert result["case_ok"] is False
        assert result["scenarios_ok"] is False


@dataclass
class _FakeSolver:
    """Fake TaktSolver pour tester le runner sans exécution réelle du CP-SAT."""
    build_duration: float = 0.5
    solve_duration: float = 1.0
    n_variables: int = 1000
    scenarios: list = None

    def __post_init__(self) -> None:
        if self.scenarios is None:
            self.scenarios = [{"status": "FEASIBLE", "placements": []}]

    def build_model(self) -> None:
        # Simule le temps de construction.
        import time
        time.sleep(self.build_duration)

    def solve(self, max_scenarios: int, time_limit_sec: int) -> list:
        import time
        time.sleep(self.solve_duration)
        return self.scenarios

    def Proto(self) -> MagicMock:
        proto = MagicMock()
        proto.variables = [None] * self.n_variables
        return proto


class TestRunCase:
    def test_run_case_returns_complete_result(self) -> None:
        case = BenchmarkCase("c200", 200, 1, 300, 1)
        fake = _FakeSolver(build_duration=0.01, solve_duration=0.01, n_variables=500)
        with patch("solver.benchmarks.runner.TaktSolver", return_value=fake):
            result = run_case(case)
        assert isinstance(result, BenchmarkResult)
        assert result.case == "c200"
        assert result.sessions == 200
        assert result.t_construction > 0
        assert result.t_resolution > 0
        assert result.t_total >= result.t_construction + result.t_resolution
        assert result.nb_variables == 500
        assert result.nb_scenarios == 1
        assert result.status == "FEASIBLE"
        # Le fake ne retourne aucun placement → couverture 0 %.
        assert result.coverage == 0.0
        assert result.peak_rss_mb >= 0

    def test_run_case_records_infeasible_status(self) -> None:
        case = BenchmarkCase("c200", 200, 1, 300, 1)
        fake = _FakeSolver(build_duration=0.01, solve_duration=0.01, scenarios=[])
        with patch("solver.benchmarks.runner.TaktSolver", return_value=fake):
            result = run_case(case)
        assert result.status == "INFEASIBLE"
        assert result.nb_scenarios == 0
        assert result.coverage == 0.0


class TestRunCli:
    def test_cli_exit_zero_when_all_ok(self) -> None:
        from solver.benchmarks.runner import BenchmarkResult
        ok_result = BenchmarkResult(
            case="c200", sessions=200, seed=1, time_limit_sec=300,
            t_construction=0.1, t_resolution=0.2, t_total=0.3,
            peak_rss_mb=100.0, nb_variables=500, nb_scenarios=3,
            status="FEASIBLE", coverage=100.0, case_ok=True,
        )
        with patch("solver.benchmarks.runner.run_cases", return_value=[ok_result]), \
             patch("sys.argv", ["run.py", "--case", "200", "--format", "json"]):
            code = run_cli()
        assert code == 0

    def test_cli_exit_nonzero_when_enforce_and_not_ok(self) -> None:
        from solver.benchmarks.runner import BenchmarkResult
        bad_result = BenchmarkResult(
            case="c200", sessions=200, seed=1, time_limit_sec=300,
            t_construction=0.1, t_resolution=0.2, t_total=0.3,
            peak_rss_mb=100.0, nb_variables=500, nb_scenarios=3,
            status="INFEASIBLE", coverage=0.0, case_ok=False,
        )
        with patch("solver.benchmarks.runner.run_cases", return_value=[bad_result]), \
             patch("sys.argv", ["run.py", "--case", "200", "--enforce", "--format", "json"]):
            code = run_cli()
        assert code != 0

    def test_cli_exit_zero_when_not_ok_but_no_enforce(self) -> None:
        from solver.benchmarks.runner import BenchmarkResult
        bad_result = BenchmarkResult(
            case="c200", sessions=200, seed=1, time_limit_sec=300,
            t_construction=0.1, t_resolution=0.2, t_total=0.3,
            peak_rss_mb=100.0, nb_variables=500, nb_scenarios=3,
            status="INFEASIBLE", coverage=0.0, case_ok=False,
        )
        with patch("solver.benchmarks.runner.run_cases", return_value=[bad_result]), \
             patch("sys.argv", ["run.py", "--case", "200", "--format", "json"]):
            code = run_cli()
        assert code == 0
