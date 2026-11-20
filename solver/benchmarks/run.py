#!/usr/bin/env python3
# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Point d'entrée CLI des benchmarks de performance du solveur CP-SAT (spike SPK-01).

Usage :
    python3 solver/benchmarks/run.py --case 200 --format markdown
    python3 solver/benchmarks/run.py --case all --enforce --format json

Exemple de sortie markdown :

| Cas | Séances | Durée totale (s) | Mémoire (Mo) | Variables | Scénarios | Couverture (%) | Statut | Seuil |
|-----|---------|------------------|--------------|-----------|-----------|----------------|--------|-------|
| bench_200_seances | 200 | 12.34 | 256.0 | 45000 | 3 | 95.0 | FEASIBLE | OK |

Le code de sortie est non-nul avec --enforce si un cas dépasse ses seuils.
"""

from __future__ import annotations

import os
import sys

# Ajoute la racine du projet au PYTHONPATH pour permettre l'import de 'solver'.
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from solver.benchmarks.runner import run_cli

if __name__ == "__main__":
    sys.exit(run_cli())
