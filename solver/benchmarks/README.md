# Benchmarks de performance du solveur CP-SAT (spike SPK-01 — TAKT-L07-05)

Ce répertoire contient les outils de mesure de performance du solveur CP-SAT
(**TAKT solver**), conformément à [SPEC_SOLVER_CPSAT §8](../../../docs/SPEC_SOLVER_CPSAT.md)
et à la fiche de ticket [TAKT-L07-05](../../../docs/BACKLOG_TAKT.md).

## Structure

```
solver/benchmarks/
├── __init__.py        # en-tête AGPL (GG-01)
├── specs.py           # cas de benchmark, seuils SPEC §8, graines déterministes
├── generator.py       # générateur déterministe d'instances DerivedFile (uuid5)
├── runner.py          # exécution chronométrée (construction / résolution / mémoire)
├── run.py             # CLI : --case 200|1000|4000|all --enforce --format json|markdown
├── README.md          # ce fichier
├── instances/         # jeux de données versionnés (manifest + fixtures)
│   ├── manifest.json
│   └── bench_200_seances.json
└── tests/
    ├── __init__.py
    ├── test_generator.py   # déterminisme, conformité zDerivedFile, faisabilité
    └── test_runner.py      # mesures, évaluation des seuils, code de sortie --enforce
```

## Utilisation

### Exécuter un cas unique

```bash
# Depuis la racine du projet
python3 solver/benchmarks/run.py --case 200 --format markdown
python3 solver/benchmarks/run.py --case 1000 --format json
python3 solver/benchmarks/run.py --case 4000 --format markdown
```

### Exécuter tous les cas (mode CI)

```bash
python3 solver/benchmarks/run.py --case all --enforce --format json
```

`--enforce` retourne un code de sortie non-nul si un cas ne respecte pas ses seuils
(utilisé en CI avec `continue-on-error: true`).

### Options

| Option | Valeurs | Défaut | Description |
|--------|---------|--------|-------------|
| `--case` | 200, 1000, 4000, all | all | Cas de benchmark à exécuter |
| `--enforce` | (drapeau) | non | Échoue si un cas est non conforme |
| `--format` | json, markdown | markdown | Format de sortie |

## Cas de benchmark

Les 3 cas prescrits par SPEC_SOLVER_CPSAT §8 et BACKLOG_TAKT.md :

| Cas | Séances | Graine | Limite temps | Seuil SPEC §8 |
|-----|---------|--------|--------------|---------------|
| `bench_200_seances` | 200 | 20261120 | 300 s | < 5 min |
| `bench_1000_seances` | 1 000 | 20261121 | 600 s | (objectif intermédiaire) |
| `bench_4000_seances` | 4 000 | 20261122 | 1800 s | < 30 min |

Cas complémentaire (non normatif, lecture SF_TAKT §2) :

| Cas | Séances | Graine | Limite temps |
|-----|---------|--------|--------------|
| `bench_realistic_week` | ~286 | 20261123 | 300 s |

## Mesures

Chaque benchmark mesure :

| Mesure | Source |
|--------|--------|
| `t_construction` | `TaktSolver.build_model()` |
| `t_resolution` | `TaktSolver.solve()` |
| `t_total` | somme des deux |
| `peak_rss_mb` | `resource.getrusage(RUSAGE_SELF).ru_maxrss` (stdlib uniquement) |
| `nb_variables` | `model.Proto().number_of_variables` |
| `nb_scenarios`, `status`, `coverage` | sortie du solveur |

## Générateur d'instances

Le générateur (`generator.py`) produit des fichiers DerivedFile déterministes
(même graine → JSON identique) via `uuid.uuid5`. Volumétrie conforme à
SF_TAKT §2 : 400 enseignants, 150 salles, 10 départements, groupes ≈ 30 étudiants.
Un garde-fou de faisabilité vérifie que la capacité totale est suffisante avant
de lancer la résolution.

## Tests

```bash
# Depuis la racine du projet
python3 -m pytest solver/benchmarks/tests/ -q
```

## Reproductibilité

Les graines sont figées dans `specs.py`. Les instances sont générées à la volée
depuis les graines ; la fixture `instances/bench_200_seances.json` est commitée
à titre de référence. Le rapport final se trouve dans
`docs/RAPPORT_PERFORMANCE_SOLVER.md`.
