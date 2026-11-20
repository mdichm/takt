# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Assemblage des scénarios de sortie et écriture des résultats.

Responsabilités
---------------
* Assembler les scénarios bruts du solveur en objets conformes au schéma
  ``zSolverOutput`` (``@takt/contracts``) : id, generationId, score, subScores,
  placements, unplacedActivities, status, createdAt.
* Écrire l'enveloppe JSON sur **stdout** (lu par ``SolverClient``) **et** les fichiers
  ``scenario_N.json`` dans ``OUTPUT_PATH`` (conforme au garde-fou solver-worker et à
  SPEC_SOLVER_CPSAT §5/§7).
"""

from __future__ import annotations

import json
import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Any

from .scoring import compute_global_score, compute_sub_scores


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def assemble_scenarios(
    raw_scenarios: list[dict[str, Any]],
    derived_file: dict[str, Any],
    max_scenarios: int = 3,
) -> list[dict[str, Any]]:
    """Assemble les scénarios bruts en scénarios conformes à ``zSolverScenario``."""
    scenarios = []
    for idx, raw in enumerate(raw_scenarios[:max_scenarios]):
        placements = raw["placements"]
        unplaced = raw.get("unplacedActivities", [])

        sub_scores = compute_sub_scores(placements, unplaced, derived_file)
        score = compute_global_score(sub_scores)

        # Statut : PARTIAL s'il y a des activités non placées, sinon le statut solveur.
        scenario_status = raw["status"]
        if unplaced and scenario_status in ("OPTIMAL", "FEASIBLE"):
            scenario_status = "PARTIAL"

        scenarios.append({
            "id": raw.get("id", str(uuid.uuid4())),
            "generationId": derived_file["metadata"]["generationId"],
            "score": score,
            "subScores": sub_scores,
            "placements": placements,
            "unplacedActivities": unplaced,
            "status": scenario_status,
            "createdAt": _iso_now(),
        })
    return scenarios


def _peak_rss_mb() -> float:
    """Retourne la RSS maximale du processus courant en Mo (Linux)."""
    try:
        import resource
        kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        # Sur Linux ru_maxrss est en kilo-octets.
        return round(kb / 1024, 2)
    except Exception:
        return 0.0


def write_output(
    scenarios: list[dict[str, Any]],
    output_path: str | None,
    derived_file: dict[str, Any] | None = None,
) -> None:
    """Écrit l'enveloppe JSON sur stdout et les fichiers scenario_N.json.

    L'enveloppe stdout est la **seule** chose lue par ``SolverClient``. Les logs du
    solveur doivent rester sur stderr (redirigés par l'appelant).
    """
    metrics = {"peakRssMb": _peak_rss_mb()}
    envelope = {"scenarios": scenarios, "metrics": metrics}

    # 1. stdout = enveloppe JSON unique (parseur client).
    sys.stdout.write(json.dumps(envelope, ensure_ascii=False))
    sys.stdout.write("\n")
    sys.stdout.flush()

    # 2. Fichiers dans OUTPUT_PATH (spéc + garde-fou solver-worker).
    if output_path:
        if output_path.endswith(".json"):
            # Fichier unique contenant tous les scénarios.
            with open(output_path, "w", encoding="utf-8") as fh:
                json.dump(envelope, fh, ensure_ascii=False, indent=2)
        else:
            # Répertoire : un fichier par scénario.
            os.makedirs(output_path, exist_ok=True)
            for idx, scenario in enumerate(scenarios):
                scenario_path = os.path.join(output_path, f"scenario_{idx}.json")
                with open(scenario_path, "w", encoding="utf-8") as fh:
                    json.dump(scenario, fh, ensure_ascii=False, indent=2)
