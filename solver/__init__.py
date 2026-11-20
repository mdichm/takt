# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only

"""Worker CP-SAT pour le solveur de planification TAKT.

Point d'entrée canonique : :mod:`solver.cp_sat_model` (CLI : ``python -m solver.cp_sat_model``).

Ce module produit les scénarios de placement d'activités à partir d'un fichier dérivé
``DerivedFile`` (contrat ``@takt/contracts``). Il est agnostique du mode d'invocation
sous-processus local ou conteneur ``takt/solver-worker``.
"""

__version__ = "0.1.0"
