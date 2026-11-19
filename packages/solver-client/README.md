# @takt/solver-client — Client du solveur CP-SAT

Package encapsulant l'appel au solveur CP-SAT (OR-Tools) via un
**sous-processus isolé**, conforme aux exigences `EX-PRI-01`, `TE-ARCH-01`,
`GG-10` et à la fiche `TAKT-L07-02`.

## Installation

```bash
pnpm add @takt/solver-client
```

## API principale

```typescript
import { SolverClient, type SolverClientOptions } from '@takt/solver-client';

const client = new SolverClient({
  derivedDir: '/data/derived',
  scenariosDir: '/data/scenarios',
  // solverCommand: 'python3 -m takt.solver',  // défaut
  // timeoutMs: 300_000,                        // défaut 300 s
  // maxScenarios: 3,                           // défaut
  // memoryLimitMb: 4096,                       // défaut (SPEC §8)
});

const scenarios = await client.solve(derivedFile);
// scenarios : Scenario[] (score dans [0, 100])
```

### `solve(derivedFile, options?) : Promise<Scenario[]>`

Écrit le fichier dérivé, invoque le solver en sous-processus, applique un
timeout, lit et valide la sortie, puis retourne les scénarios.

## Gestion des erreurs

Toutes les erreurs sont typées via `SolverError` avec un code :

| Type | Situation |
|------|-----------|
| `TIMEOUT` | Dépassement du timeout (processus tué) |
| `SOLVER_CRASH` | Échec d'exécution / code de sortie non nul |
| `INVALID_OUTPUT` | Sortie non JSON ou non conforme au contrat |
| `MEMORY_EXCEEDED` | Limite mémoire dépassée |
| `INFEASIBLE` | Contraintes incompatibles |

## Isolation du sous-processus (GG-10)

L'environnement transmis au processus enfant est soumis à une **allowlist**
explicite (`PATH`, `HOME`, `LANG`, `LC_ALL`, `PYTHONPATH`, `TMPDIR`, `TEMP`
plus les variables canoniques `DERIVED_FILE_PATH`, `OUTPUT_PATH`,
`TIMEOUT_SEC`, `MAX_SCENARIOS`). Toute variable de connexion à la base de
données (`DATABASE_URL`, `PG*`, `POSTGRES_*`, `REDIS_URL`, `JWT_*`, …) est
**explicitement exclue** : le solver n'a jamais accès à la base métier.

## Métriques (SPEC_MONITORING §5)

À chaque appel, des métriques `{ generationId, durationMs, peakRssMb,
scenarioCount, status, errorType? }` sont émises via `onMetrics` et le logger,
succès comme échec.

## Contrats partagés (@takt/contracts)

Le fichier dérivé d'entrée est validé par `zDerivedFile` (GG-05). La sortie du
solver est validée par `zSolverOutput` / `zSolverScenario`, définis dans
`packages/contracts/src/solver.ts`.

## Tests

```bash
pnpm --filter @takt/solver-client test
```

Couverture exigée : **100 % des branches**.

## Développement

```bash
# Build
pnpm --filter @takt/solver-client build

# Lint
pnpm --filter @takt/solver-client lint

# Typecheck
pnpm --filter @takt/solver-client typecheck

# Tests
pnpm --filter @takt/solver-client test
```

## Licence

AGPL-3.0-only. Voir LICENCE_AGPL.md à la racine du dépôt.
