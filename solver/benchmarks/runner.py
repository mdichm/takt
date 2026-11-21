# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Runner de benchmark : exécution chronométrée construction + résolution (spike SPK-01).

Mesures (stdlib uniquement, GG-02) :
- t_construction : TaktSolver.build_model()
- t_resolution   : TaktSolver.solve()
- t_total        : somme des deux
- peak_rss_mb    : resource.getrusage(RUSAGE_SELF).ru_maxrss (ko sur Linux, octets sur macOS)
- nb_variables   : model.Proto().number_of_variables
- nb_scenarios, status, coverage : sortie du solveur
"""

from __future__ import annotations

import argparse
import json
import resource
import sys
import time
from dataclasses import dataclass
from typing import Any

from .generator import generate_instance
from .specs import (
    ALL_CASES,
    BenchmarkCase,
    evaluate_case as _spec_evaluate_case,
)
from solver.model import TaktSolver


def _peak_rss_mb() -> float:
    ru = resource.getrusage(resource.RUSAGE_SELF)
    value = ru.ru_maxrss
    if sys.platform == "darwin":
        value = value / (1024 * 1024)
    else:
        value = value / 1024
    return round(value, 2)
@dataclass
class BenchmarkResult:
    case: str
    sessions: int
    seed: int
    time_limit_sec: int
    t_construction: float
    t_resolution: float
    t_total: float
    peak_rss_mb: float
    nb_variables: int
    nb_scenarios: int
    status: str
    coverage: float
    case_ok: bool
    duration_ok: bool = True
    duration_alert: bool = False
    memory_ok: bool = True
    memory_alert: bool = False
    scenarios_ok: bool = True
    coverage_ok: bool = True
    coverage_alert: bool = False

def run_case(case: BenchmarkCase) -> BenchmarkResult:
    from solver.benchmarks.specs import evaluate_case as spec_eval

    instance = generate_instance(case)
    solver = TaktSolver(instance)

    t0 = time.perf_counter()
    solver.build_model()
    t_build = time.perf_counter() - t0

    t0 = time.perf_counter()
    scenarios = solver.solve(max_scenarios=case.max_scenarios,
                             time_limit_sec=case.time_limit_sec)
    t_solve = time.perf_counter() - t0

    try:
        nb_variables = len(solver.Proto().variables)
    except Exception:  # any-justify: Proto peut ne pas exister selon l'implémentation
        nb_variables = 0

    status = scenarios[0]["status"] if scenarios else "INFEASIBLE"
    nb_scenarios = len(scenarios)

    placed_ids = {p["activityId"] for s in scenarios for p in s.get("placements", [])}
    total_activity_ids = {a["id"] for a in instance["activities"]}
    coverage = (100.0 * len(placed_ids & total_activity_ids) / len(total_activity_ids)
                if total_activity_ids else 100.0)

    peak_rss = _peak_rss_mb()

    eval_dict = spec_eval(
        case, duration_sec=t_build + t_solve, memory_mb=peak_rss,
        scenarios_count=nb_scenarios, coverage=coverage,
    )

    return BenchmarkResult(
        case=case.name,
        sessions=case.sessions,
        seed=case.seed,
        time_limit_sec=case.time_limit_sec,
        t_construction=round(t_build, 4),
        t_resolution=round(t_solve, 4),
        t_total=round(t_build + t_solve, 4),
        peak_rss_mb=peak_rss,
        nb_variables=nb_variables,
        nb_scenarios=nb_scenarios,
        status=status,
        coverage=round(coverage, 2),
        case_ok=bool(eval_dict["case_ok"]),
        duration_ok=bool(eval_dict["duration_ok"]),
        duration_alert=bool(eval_dict["duration_alert"]),
        memory_ok=bool(eval_dict["memory_ok"]),
        memory_alert=bool(eval_dict["memory_alert"]),
        scenarios_ok=bool(eval_dict["scenarios_ok"]),
        coverage_ok=bool(eval_dict["coverage_ok"]),
        coverage_alert=bool(eval_dict["coverage_alert"]),
    )


def run_cases(cases: list[BenchmarkCase]) -> list[BenchmarkResult]:
    return [run_case(c) for c in cases]


def evaluate_case(*args: Any, **kwargs: Any) -> dict[str, Any]:
    return _spec_evaluate_case(*args, **kwargs)

def _format_json(results: list[BenchmarkResult]) -> str:
    return json.dumps([r.__dict__ for r in results], indent=2, ensure_ascii=False)


def _format_markdown(results: list[BenchmarkResult]) -> str:
    lines = ["| Cas | Séances | Durée totale (s) | Mémoire (Mo) | Variables | Scénarios | Couverture (%) | Statut | Seuil |",
             "|-----|---------|------------------|--------------|-----------|-----------|----------------|--------|-------|"]
    for r in results:
        seuil = "OK" if r.case_ok else "NON CONFORME"
        lines.append(
            f"| {r.case} | {r.sessions} | {r.t_total} | {r.peak_rss_mb} | "
            f"{r.nb_variables} | {r.nb_scenarios} | {r.coverage} | {r.status} | {seuil} |"
        )
    return "\n".join(lines)


def run_cli(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Benchmarks de performance du solveur CP-SAT")
    parser.add_argument("--case", choices=["200", "1000", "4000", "all"], default="all",
                        help="Cas de benchmark à exécuter")
    parser.add_argument("--enforce", action="store_true",
                        help="Échoue (code de sortie non nul) si un cas ne respecte pas les seuils")
    parser.add_argument("--format", choices=["json", "markdown"], default="markdown",
                        help="Format de sortie")
    args = parser.parse_args(argv)

    if args.case == "all":
        cases = ALL_CASES
    else:
        sessions = int(args.case)
        cases = [c for c in ALL_CASES if c.sessions == sessions]

    results = run_cases(cases)

    if args.format == "json":
        print(_format_json(results))
    else:
        print(_format_markdown(results))

    all_ok = all(r.case_ok for r in results)
    if args.enforce and not all_ok:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(run_cli())

