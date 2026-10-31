---
paths:
  - "apps/backend/src/modules/generation/**"
  - "solver/**"
  - "packages/solver-client/**"
---
# Worker CP‑SAT – isolation stricte (EX‑PRI‑01, SPEC_SOLVER_CPSAT.md)

## Conteneur dédié
- Image Docker `takt/solver-worker` (Python 3.11 + OR‑Tools CP‑SAT)
- **Pas de `DATABASE_URL`** – variables d'env : `DERIVED_FILE_PATH`, `OUTPUT_PATH`, `TIMEOUT_SEC=300`, `MAX_SCENARIOS=3`
- Entrée : fichier JSON `DerivedFile` (schéma `packages/solver-client/src/types.ts`)
- Sortie : `Scenario[]` (score global 0‑100 + `SubScores`) écrit dans `OUTPUT_PATH`

## Client (`packages/solver-client`)
- `SolverClient.solve(derivedFile, options)` → spawn du conteneur, timeout, parsing, erreurs typées (`TIMEOUT`, `SOLVER_CRASH`, `INVALID_OUTPUT`, `MEMORY_EXCEEDED`, `INFEASIBLE`)
- Métriques émises (durée, RAM, statut) → Prometheus (`solver_*`) – SPEC_MONITORING §5

## Garde‑fous (GG‑10 + spécifiques)
- **Aucun** `import prisma` / `pg` dans le worker (GG‑16)
- Vérification CI : `docker run --rm takt/solver-worker --help` + test d'intégration avec un `DerivedFile` minimal (doit retourner 1 scénario valide < 5 s)
- Spike performance (SPK‑01) : script `solver/benchmarks/run.py` → rapport `docs/RAPPORT_PERFORMANCE_SOLVER.md` (seuils < 5 min 200 séances, < 30 min 4000 séances)