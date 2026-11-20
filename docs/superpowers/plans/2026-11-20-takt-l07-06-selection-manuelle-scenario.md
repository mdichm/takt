# Plan d'implémentation TAKT-L07-06 — Sélection manuelle de scénario

## Stratégie retenue (option B — conforme au corpus documentaire)

- Transition `generation → edition` sur la **même version** (matrice workflow `workflow-matrix.ts` l.44, RB-WF-04, RB-WF-07)
- Le worker **ne transitionne plus** automatiquement `generation → edition` (RB-WF-04 : pas de sélection automatique)
- Le worker **persiste les placements réels** (pas `{}` vide) pour que L07-06 ait des données à adopter
- Séances créées sur la version existante (mapping `activityId` → `AffectationPedagogique.id`)

## Fichiers à créer
- `docs/superpowers/plans/2026-11-20-takt-l07-06-selection-manuelle-scenario.md`
- `packages/contracts/src/generation.ts` (schémas `zPlacementPersistee`, `zScenarioSelectReponse`)
- `apps/backend/src/modules/generation/selection/selection.module.ts`
- `apps/backend/src/modules/generation/selection/selection.service.ts`
- `apps/backend/src/modules/generation/selection/selection.controller.ts`
- `apps/backend/src/modules/generation/selection/selection.service.spec.ts`
- `apps/backend/src/modules/generation/selection/selection.integration.test.ts`

## Fichiers à modifier
- `packages/contracts/src/index.ts` (export nouveaux schémas)
- `apps/backend/src/modules/generation/worker/generation-worker.service.ts` (persist placements réels, supprimer transition auto)
- `apps/backend/src/modules/common/di/solveur.token.ts` (étendre le token SOLVEUR)
- `apps/backend/src/modules/generation/generations.controller.ts` (retirer route select)
- `apps/backend/src/modules/generation/generations.service.ts` (retirer selectionnerScenario)
- `apps/backend/src/modules/generation/generation.module.ts` (importer SelectionModule)
- `apps/backend/src/modules/planning/seances/seances.service.ts` (ajouter `creerDepuisPlacements`)
- `docs/openapi.yaml` (regénérer via `check-openapi`)
- `docs/tools/tickets_data.py` (TAKT-L07-06 → Terminé)

## Garde-fous
GG-01 (AGPL), GG-05 (Zod), GG-06 (enveloppe + 8 codes HTTP), GG-07 (audit), GG-13 (déps: generation→planning autorisé), GG-04 (pas d'`any` sans justifie)
