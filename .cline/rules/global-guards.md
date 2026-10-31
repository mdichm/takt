---
paths: ["**/*"]
---
# Garde‑fous globaux (GG‑01 … GG‑15 + GG‑16, GG‑17)

| ID  | Règle (extraite du dossier conceptuel)                                                                                                     | Origine |
|-----|----------------------------------------------------------------------------------------------------------------------------------------------|---------|
| GG-01 | En‑tête AGPL v3 sur **chaque** nouveau fichier source (copier le header existant).                                                           | LICENCE_AGPL.md |
| GG-02 | **Aucune nouvelle dépendance runtime** sans validation explicite. Stack autorisée listée dans ST_TAKT §0.1.                                 | ST_TAKT §0.1 |
| GG-03 | Interface, messages d'erreur, commentaires, docs, commits **en français**.                                                                   | SF_TAKT (en‑tête) |
| GG-04 | TypeScript `strict:true` ; `any` interdit sauf `// any-justify: <raison>`.                                                                   | ST_TAKT §0.1 |
| GG-05 | Toute entrée externe validée par un **schéma Zod partagé** (`@takt/contracts`).                                                              | TE‑API‑02 |
| GG-06 | Réponse API = `{ data, error, meta }` ; erreurs limitées aux 8 codes du catalogue (ST_TAKT §3.4) ; **pas de stack trace** en prod.         | TE‑API‑06 |
| GG-07 | Toute mutation métier → écriture `JournalAudit` (action, horodatage, utilisateurId, entité, entitéId, metadata JSONB).                      | EX‑DAT‑05, TE‑API‑05 |
| GG-08 | Évolution Prisma → migration **et** `down.sql` ; `prisma db verify` passe.                                                                   | DOC_MIGRATION_DB.md |
| GG-09 | Version `publie` **immuable** ; seule transition `publie → archive`.                                                                        | EX‑PRI‑02, TE‑ARCH‑03 |
| GG-10 | Solver CP‑SAT reçoit **uniquement** un fichier dérivé ; worker sans accès DB.                                                                | EX‑PRI‑01, TE‑ARCH‑01 |
| GG-11 | Secrets **jamais** en dur ; lecture via env var ou `/run/secrets/*` ; `.env` non commité.                                                    | SPEC_SECRETS.md |
| GG-12 | Git : branche `feat/TAKT-Lxx-nn`, **un seul push**, Conventional Commits FR, `main` protégée.                                               | PLAN_MACRO §6 |
| GG-13 | **Périmètre strict** – ne pas toucher aux fichiers hors du périmètre déclaré dans le prompt. Signaler tout besoin hors périmètre.           | B‑10 |
| GG-14 | **Pas de suppression/neutralisation de test** pour faire passer la CI.                                                                       | TE‑TEST‑05 |
| GG-15 | Rapport Cline = **sorties réelles des commandes** (stdout/stderr), pas de résumé déclaratif.                                                 | verification‑before‑completion |
| GG-16 | Interdiction d'importer `prisma`, `pg`, `pg-boss` côté frontend ou dans le worker CP‑SAT.                                                    | EX‑PRI‑01 / architecture |
| GG-17 | Access token **en mémoire** uniquement ; refresh token **uniquement** dans cookie `HttpOnly; Secure; SameSite=Strict`.                       | EX‑SEC‑01, TESTS.md §6.1 |