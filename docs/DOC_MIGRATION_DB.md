# Stratégie de migration de base de données — TAKT (DOC_MIGRATION_DB.md)

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques
**Version :** 1.0
**Date :** 30 octobre 2026
**Responsable :** Backend Lead + Architecte
**Statut :** Validé — G1 résolu
**Documents liés :** ST_TAKT.md (§2), PLAN_MACRO.md, DEPLOIEMENT.md, contract.prisma

---

## 1. Objectif

Définir une stratégie de migration de base de données robuste, reproductible et auditable, conforme à l'architecture Prisma + PostgreSQL retenue dans ST_TAKT.md §0.1. Cette stratégie garantit la cohérence des schémas entre les environnements dev, recette et production (règle DEP-ENV-01).

---

## 2. Principes directeurs

| Principe | Description |
|----------|-------------|
| **Versionnage explicite** | Chaque changement de schéma est une migration nommée, horodatée, stockée en SQL dans `packages/db/prisma/migrations/` |
| **Séparation des responsabilités** | `prisma migrate dev` en développement ; `prisma migrate deploy` en recette/production |
| **Traçabilité complète** | Historique Git des migrations = audit trail du schéma |
| **Rollback maîtrisé** | Chaque migration critique maintient un fichier `down.sql` testé |
| **Seed déterministe** | Données de référence injectées via `prisma db seed` (idempotent) |

---

## 3. Organisation du dossier Prisma

```
packages/db/prisma/
├── contract.prisma          # Schéma source de vérité (déjà existant)
├── migrations/              # Dossier versionné (créé par Prisma Migrate)
│   ├── 20261030000000_init/ # Migration initiale
│   │   ├── migration.sql    # SQL up
│   │   └── down.sql         # SQL down (pour rollback)
│   └── 20261101000000_add_xxx/
│       ├── migration.sql
│       └── down.sql
├── seed.ts                  # Script de seed (données de référence)
├── seed.recette.ts          # Données de recette (anonymisées)
└── schema.prisma            # Généré à partir de contract.prisma (ne pas éditer)
```

> **Note :** `contract.prisma` est le fichier source. `schema.prisma` est généré par le script de build pour compatibilité Prisma Client.
---

## 4. Commandes par environnement

### 4.1 Développement (local)

```bash
# Créer une nouvelle migration après modification de contract.prisma
pnpm --filter @takt/db prisma migrate dev --name <description_courte>

# Appliquer les migrations existantes (nouveau clone)
pnpm --filter @takt/db prisma migrate dev

# Réinitialiser la base + migrations + seed
pnpm --filter @takt/db prisma migrate reset --force
```

### 4.2 Recette / Production

```bash
# Déployer les migrations en attente (ne crée JAMAIS de migration)
pnpm --filter @takt/db prisma migrate deploy

# Vérifier l'état des migrations
pnpm --filter @takt/db prisma migrate status

# Seed des données de recette (après deploy)
pnpm --filter @takt/db prisma db seed -- --env=recette
```

### 4.3 CI/CD (Pipeline)

```yaml
# Dans .github/workflows/ci.yml
- name: Prisma Generate
  run: pnpm --filter @takt/db prisma generate

- name: Prisma Migrate Deploy (recette)
  if: github.ref == 'refs/heads/main'
  run: pnpm --filter @takt/db prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL_RECETTE }}
```

---

## 5. Convention de nommage des migrations

| Format | Exemple | Description |
|--------|---------|-------------|
| `YYYYMMDDHHMMSS_<action>_<entité>` | `20261101120000_add_index_seance_version` | Action + entité concernée |
| Actions : `create`, `add`, `remove`, `rename`, `alter`, `drop` | | Verbe à l'infinitif, entité au singulier |

**Exemples :**
- `20261030000000_init` — Schéma initial complet
- `20261101100000_add_column_seance_verrou_type` — Ajout colonne
- `20261101150000_create_table_export` — Création table
- `20261102090000_alter_table_version_add_etat_archive` — Modification table

---

## 6. Procédure de rollback

### 6.1 Rollback d'une migration unique (dernière appliquée)

```bash
# 1. Identifier la migration à annuler
pnpm prisma migrate status

# 2. Créer une migration de rollback (si down.sql existe)
# Prisma ne supporte pas le rollback natif → procédure manuelle :

# Option A : Migration inverse manuelle
# Créer une nouvelle migration qui inverse les changements
pnpm prisma migrate dev --name rollback_<migration_cible>

# Option B : Restauration depuis sauvegarde pgBackRest (recommandé prod)
# Voir DEPLOIEMENT.md §4
```

### 6.2 Rollback complet (environnement recette)

```bash
# 1. Arrêter l'application
docker-compose -f docker-compose.recette.yml down

# 2. Restaurer la base depuis la sauvegarde pgBackRest
pgbackrest --stanza=takt restore --delta --target-time="2026-11-01 10:00:00"

# 3. Redémarrer l'application
docker-compose -f docker-compose.recette.yml up -d
```

### 6.3 Règle de garde

> **Aucun rollback en production sans validation DSI + MOA.** Toute restauration en production déclenche une procédure d'incident documentée.

---

## 7. Stratégie de seed

### 7.1 Seed de développement (`seed.ts`)

Données minimales pour faire tourner l'application en local :

- 1 `AnneeUniversitaire` (2026-2027)
- 2 `Semestre` (S1, S2)
- 4 `Role` : admin, gest, rdep, dir
- 3 `Departement` : INFO, MATH, PHYS
- 4 `Utilisateur` (1 par rôle)
- Référentiels minimaux : 5 salles, 10 enseignants, 5 matières, 6 groupes

### 7.2 Seed de recette (`seed.recette.ts`)

Données anonymisées, volumétrie réaliste (≈ 50% cible) :

- 2 années universitaires
- 4 semestres
- 10 départements
- 20 utilisateurs (répartition rôles réaliste)
- 100 enseignants, 50 salles, 30 matières, 50 groupes
- 2 versions complètes (1 `publie`, 1 `edition`)

### 7.3 Exécution

```bash
# Dev
pnpm --filter @takt/db prisma db seed

# Recette (via variable d'environnement)
SEED_ENV=recette pnpm --filter @takt/db prisma db seed
```

---

## 8. Matrice de compatibilité Application ↔ Schéma

| Version App | Version Schéma (migration) | Compatibilité | Notes |
|-------------|----------------------------|---------------|-------|
| 1.0.0 | `20261030000000_init` | ✅ Baseline | Première release |
| 1.1.0 | `20261101120000_add_...` | ✅ Forward | Ajout index performance |
| 1.2.0 | `20261115090000_create_...` | ⚠️ Breaking | Nouvelle table `Export` — migration requise avant déploiement |

**Règle :** Toute version d'application qui introduit un changement de schéma **doit** inclure la migration correspondante dans le même commit/PR.

---

## 9. Intégration dans le pipeline CI/CD

| Étape | Commande | Environnement | Condition de succès |
|-------|----------|---------------|---------------------|
| Generate | `prisma generate` | Tous | Client Prisma généré sans erreur |
| Validate | `prisma validate` | Tous | Schéma syntaxiquement valide |
| Migrate Dev | `prisma migrate dev` | Dev (local) | Migration créée, DB à jour |
| Migrate Deploy | `prisma migrate deploy` | Recette/Prod | Migrations appliquées, 0 erreur |
| Seed | `prisma db seed` | Dev/Recette | Données injectées, idempotent |

---

## 10. Checklist de validation avant merge (Definition of Done)

- [ ] `contract.prisma` modifié avec la convention de nommage
- [ ] Migration générée via `prisma migrate dev --name ...`
- [ ] Fichiers `migration.sql` et `down.sql` présents dans `migrations/`
- [ ] `down.sql` testé localement (rollback fonctionnel)
- [ ] `seed.ts` mis à jour si nouvelles données de référence
- [ ] Tests d'intégration passent avec la nouvelle migration
- [ ] Documentation mise à jour si changement d'impact (index, contraintes)

---

## 11. Références

- Prisma Migrate Documentation : https://www.prisma.io/docs/orm/prisma-migrate
- DEPLOIEMENT.md §4 (Sauvegardes pgBackRest)
- ST_TAKT.md §2 (Modèle de données)
- PLAN_MACRO.md §7 (Risque P2 : volumétrie sous-estimée)

---

*Fin du DOC_MIGRATION_DB.md — TAKT v1.0*