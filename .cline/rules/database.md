---
paths:
  - "packages/db/prisma/**"
  - "apps/backend/src/**/*.repository.ts"
---
# Base de données – PostgreSQL 16 + Prisma 8

## Modélisation (ST_TAKT §2, DOC_MIGRATION_DB.md)
- 15 modèles (`Utilisateur`, `Role`, `Departement`, `AnneeUniversitaire`, `Semestre`, `Version`, `Snapshot`, `AffectationPedagogique`, `Seance`, `VerrouSeance`, `Contrainte`, `Generation`, `Scenario`, `Export`, `JournalAudit`, `SecurityEvent`)
- PK = `Uuid` ; `DateTime` UTC ; index & contraintes UNIQUE explicites (ST_TAKT §2.3‑2.4)
- **Aucune FK `departementId` sur `Salle`** (EX‑REF‑03)

## Migrations (DOC_MIGRATION_DB.md)
- `prisma migrate dev` en local, `prisma migrate deploy` en recette/prod
- **Chaque migration = `migration.sql` + `down.sql`** (rollback testé) – GG‑08
- Seed idempotent (`upsert`) dans `packages/db/prisma/seed.ts` – données de démo seulement, refus en `NODE_ENV=production`

## Requêtes & Performance
- Privilégier `select` ciblé vs `include` profonds (GG‑16)
- Pagination obligatoire sur toute liste (`meta.page`, `meta.pageSize`, `meta.total`) – helper `buildPrismaQuery` (ST_TAKT §3.3)
- Contraintes d'unicité **au niveau SQL** pour conflits salle/enseignant/groupe (HC‑RES‑01…03) – testées par `prisma db verify`

## Accès au solveur (EX‑PRI‑01, TE‑ARCH‑01)
- Le worker CP‑SAT **n'a jamais** de `DATABASE_URL` ; il reçoit uniquement le fichier dérivé JSON (GG‑10)