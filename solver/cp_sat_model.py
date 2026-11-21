# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Point d'entrée canonique du worker CP-SAT (CLI).

Usage :
    python -m solver.cp_sat_model --input derived.json --output scenarios/ \
        --max-scenarios 3 --time-limit 300

Variables d'environnement (repris si l'argument correspondant est absent) :
    DERIVED_FILE_PATH, OUTPUT_PATH, TIMEOUT_SEC, MAX_SCENARIOS

Aucune variable DATABASE_URL n'est lue (GG-10, GG-16).
"""

from __future__ import annotations

import argparse
import sys
from typing import Any

from .derived_file import DerivedFileInvalid, load_from_file, load_from_stdin
from .model import TaktSolver
from .scenarios import assemble_scenarios, write_output


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="solver.cp_sat_model",
        description="Worker CP-SAT : placement d'activités pédagogiques (OR-Tools).",
    )
    parser.add_argument(
        "--input",
        help="Chemin du fichier dérivé JSON d'entrée (défaut : stdin ou DERIVED_FILE_PATH).",
    )
    parser.add_argument(
        "--output",
        help="Chemin de sortie (fichier .json ou répertoire ; défaut : OUTPUT_PATH).",
    )
    parser.add_argument(
        "--max-scenarios",
        type=int,
        help="Nombre maximal de scénarios à produire (défaut : MAX_SCENARIOS ou 3).",
    )
    parser.add_argument(
        "--time-limit",
        type=int,
        help="Limite de temps de résolution en secondes (défaut : TIMEOUT_SEC ou 300).",
    )
    return parser


def _resolve_config(args: argparse.Namespace) -> dict[str, Any]:
    """Résout la configuration effective (CLI > variable d'environnement > défaut)."""
    return {
        "input_path": args.input or os_getenv("DERIVED_FILE_PATH"),
        "output_path": args.output or os_getenv("OUTPUT_PATH"),
        "max_scenarios": _first_int(
            args.max_scenarios, os_getenv("MAX_SCENARIOS"), default=3
        ),
        "time_limit_sec": _first_int(
            args.time_limit, os_getenv("TIMEOUT_SEC"), default=300
        ),
    }


def os_getenv(key: str) -> str | None:
    import os

    value = os.environ.get(key)
    return value or None


def _first_int(*values: int | None, default: int) -> int:
    for v in values:
        if v is not None:
            try:
                return int(v)
            except (TypeError, ValueError):
                continue
    return default


def main(argv: list[str] | None = None) -> int:
    """Point d'entrée principal. Retourne un code de sortie processe."""
    parser = _build_parser()
    args = parser.parse_args(argv)
    config = _resolve_config(args)

    # --- Chargement du fichier dérivé -----------------------------------------
    input_path = config["input_path"]
    try:
        if input_path:
            derived = load_from_file(input_path)
        else:
            derived = load_from_stdin()
    except DerivedFileInvalid as exc:
        print(f"ERREUR : DERIVED_FILE_INVALID — {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # pragma: no cover - garde-fou inattendu
        print(f"ERREUR : chargement de l'entrée échoué — {exc}", file=sys.stderr)
        return 1

    # --- Résolution ------------------------------------------------------------
    try:
        solver = TaktSolver(derived)
        raw_scenarios = solver.solve(
            max_scenarios=config["max_scenarios"],
            time_limit_sec=config["time_limit_sec"],
        )
    except DerivedFileInvalid as exc:
        print(f"ERREUR : DERIVED_FILE_INVALID — {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # pragma: no cover - garde-fou inattendu
        print(f"ERREUR : résolution CP-SAT échouée — {exc}", file=sys.stderr)
        return 1

    # --- Assemblage et écriture -----------------------------------------------
    scenarios = assemble_scenarios(
        raw_scenarios, derived, max_scenarios=config["max_scenarios"]
    )
    write_output(scenarios, config["output_path"], derived_file=derived)
    return 0


if __name__ == "__main__":
    sys.exit(main())
