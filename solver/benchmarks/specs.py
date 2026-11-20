# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Spécifications des cas de benchmark et seuils de performance (spike SPK-01).

Conformément à SPEC_SOLVER_CPSAT §8 et à la fiche TAKT-L07-05 (BACKLOG_TAKT.md).

Unités :
- Une « séance » = 1 placement (occurrence) dans la grille hebdomadaire, unité
  naturelle du solveur et de la mesure de SPEC_SOLVER_CPSAT §8.
- Les cas 200 / 1 000 / 4 000 séances sont ceux prescrits par BACKLOG_TAKT.md §TAKT-L07-05
  et SPEC_SOLVER_CPSAT §8.
- Le cas « realistic-week » (~286 séances) est mesuré en complément (lecture
  SF_TAKT §2 : 4 000 séances/semestre sur 14 semaines ≈ 286 occurrences/semaine).
  Il alimente la recommandation de stratégie de repli mais ne participe pas au
  verdict normatif du rapport.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final


@dataclass(frozen=True)
class BenchmarkCase:
    name: str
    sessions: int
    seed: int
    time_limit_sec: int
    max_scenarios: int


# Seuils de performance (SPEC_SOLVER_CPSAT §8, tableau 1)
TIME_TARGET_200: Final[float] = 300.0      # < 5 min
TIME_ALERT_200: Final[float] = 600.0       # > 10 min
TIME_TARGET_4000: Final[float] = 1800.0    # < 30 min
TIME_ALERT_4000: Final[float] = 3600.0     # > 60 min
COVERAGE_TARGET: Final[float] = 95.0       # ≥ 95 %
COVERAGE_ALERT: Final[float] = 80.0        # < 80 %
MEMORY_TARGET_MB: Final[float] = 4096.0    # < 4 Go
MEMORY_ALERT_MB: Final[float] = 6144.0     # > 6 Go
SCENARIOS_MIN: Final[int] = 1              # < 1 = échec
SCENARIOS_DEFAULT: Final[int] = 3          # 3 scénarios par défaut

# Graines déterministes (reproductibilité)
SEED_200: Final[int] = 20261120
SEED_1000: Final[int] = 20261121
SEED_4000: Final[int] = 20261122
SEED_REALISTIC_WEEK: Final[int] = 20261123

# Cas de benchmark prescrits (normatifs pour le verdict du rapport)
CASES: Final[list[BenchmarkCase]] = [
    BenchmarkCase(
        name="bench_200_seances",
        sessions=200,
        seed=SEED_200,
        time_limit_sec=int(TIME_TARGET_200),
        max_scenarios=SCENARIOS_DEFAULT,
    ),
    BenchmarkCase(
        name="bench_1000_seances",
        sessions=1000,
        seed=SEED_1000,
        time_limit_sec=600,
        max_scenarios=SCENARIOS_DEFAULT,
    ),
    BenchmarkCase(
        name="bench_4000_seances",
        sessions=4000,
        seed=SEED_4000,
        time_limit_sec=int(TIME_TARGET_4000),
        max_scenarios=SCENARIOS_DEFAULT,
    ),
]

# Cas complémentaire (non normatif : alimente la stratégie de repli)
CASE_REALISTIC_WEEK: Final[BenchmarkCase] = BenchmarkCase(
    name="bench_realistic_week",
    sessions=286,
    seed=SEED_REALISTIC_WEEK,
    time_limit_sec=int(TIME_TARGET_200),
    max_scenarios=SCENARIOS_DEFAULT,
)

ALL_CASES: Final[list[BenchmarkCase]] = list(CASES) + [CASE_REALISTIC_WEEK]

# Volumétrie cible SF_TAKT §2 (dimensionnement du générateur)
SF_TEACHERS: Final[int] = 400
SF_ROOMS: Final[int] = 150
SF_DEPARTMENTS: Final[int] = 10
SF_GROUP_SIZE: Final[int] = 30
SF_DAYS: Final[int] = 6
SF_SLOTS_PER_DAY: Final[int] = 24
SF_SESSIONS_PER_SEMESTER: Final[int] = 4000
SF_WEEKS_PER_SEMESTER: Final[int] = 14


def threshold_for(case: BenchmarkCase) -> float:
    """Retourne la durée cible (secondes) pour un cas de benchmark."""
    if case.sessions == 200:
        return TIME_TARGET_200
    if case.sessions == 4000:
        return TIME_TARGET_4000
    # Cas 1 000 : pas de seuil SPEC explicite → objectif intermédiaire (10 min).
    return 600.0


def evaluate_case(
    case: BenchmarkCase,
    duration_sec: float,
    memory_mb: float,
    scenarios_count: int,
    coverage: float,
) -> dict[str, object]:
    """Évalue un cas de benchmark contre les seuils SPEC §8.

    Retourne un dictionnaire avec les indicateurs de succès/alerte pour chaque
    métrique et un verdict global pour le cas.
    """
    time_target = threshold_for(case)
    time_ok = duration_sec < time_target
    time_alert = duration_sec > (time_target * 2)  # seuil d'alerte ≈ 2× cible

    coverage_ok = coverage >= COVERAGE_TARGET
    coverage_alert = coverage < COVERAGE_ALERT

    memory_ok = memory_mb < MEMORY_TARGET_MB
    memory_alert = memory_mb > MEMORY_ALERT_MB

    scenarios_ok = scenarios_count >= SCENARIOS_MIN

    all_ok = time_ok and coverage_ok and memory_ok and scenarios_ok

    return {
        "case": case.name,
        "sessions": case.sessions,
        "duration_sec": round(duration_sec, 3),
        "duration_ok": time_ok,
        "duration_alert": time_alert,
        "memory_mb": round(memory_mb, 2),
        "memory_ok": memory_ok,
        "memory_alert": memory_alert,
        "scenarios_count": scenarios_count,
        "scenarios_ok": scenarios_ok,
        "coverage": round(coverage, 2),
        "coverage_ok": coverage_ok,
        "coverage_alert": coverage_alert,
        "case_ok": all_ok,
    }
