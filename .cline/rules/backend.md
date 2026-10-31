---
paths:
  - "apps/backend/**"
  - "packages/contracts/**"
---
# Backend – NestJS 10 (Node 24 LTS)

## Stack imposée (ST_TAKT §0.1)
- NestJS 10+, TypeScript 5.5, strict mode
- Prisma Client 8 (`@takt/db`)
- Validation **exclusivement via schémas Zod partagés** (`@takt/contracts`) – **pas de class-validator** (GG‑05)
- Enveloppe de réponse unique `{ data, error, meta }` (ST_TAKT §3.3)
- Catalogue d'erreurs HTTP à 8 codes (ST_TAKT §3.4) – mapper toute `HttpException` vers ce catalogue (GG‑06)

## Architecture modulaire (ST_TAKT §1.2)
- 11 modules : `auth`, `users`, `referentiels`, `repartition`, `versions`, `planning`, `generation`, `exports`, `audit`, `notifications`, `events`
- Règle de dépendance : un module n'importe que `common` + modules **amont** (pas de cycles) – testé par script CI (GG‑13)

## Sécurité & Audit
- Auth : argon2id + JWT RS256 (access 15 min, refresh 7 j rotatif, cookie `HttpOnly; Secure; SameSite=Strict`) – GG‑04, GG‑11
- RBAC par rôle + portée département (ST_TAKT §5.2‑5.3) – guards `RolesGuard`, `DepartmentScopeGuard`, `VersionStateGuard`
- **Toute mutation métier** → écriture asynchrone `JournalAudit` (action, horodatage, utilisateurId, entité, entitéId, metadata JSONB) – GG‑07

## OpenAPI & Contrats
- Annotations `@nestjs/swagger` sur tous les DTO / contrôleurs
- Script `check-openapi` (CI) compare le YAML généré au `docs/openapi.yaml` commité – échec si divergence (GG‑02)

## Tests
- Unitaires (Vitest) : services purs, 100 % branches sur `auth`, `workflow`, `conflict`, `bail`, `generation`
- Intégration (supertest + DB test) : tous les endpoints du tableau `ST_TAKT §3.2`
- Pas de `any` sans commentaire `// any-justify:` (GG‑04)