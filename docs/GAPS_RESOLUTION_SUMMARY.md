# Résumé de résolution des 6 Gaps — TAKT

**Date :** 30 octobre 2026
**Statut :** Tous les gaps résolus — Prêt pour implémentation

---

## Vue d'ensemble

| Gap | ID | Domaine | Fichiers créés | Statut |
|-----|----|---------|----------------|--------|
| G1 | Migration DB | Base de données | `docs/DOC_MIGRATION_DB.md`, `packages/db/prisma/seed.ts` | ✅ Résolu |
| G2 | CI/CD | DevOps | `.github/workflows/ci.yml`, `apps/backend/Dockerfile`, `apps/frontend/Dockerfile`, `apps/frontend/nginx.conf`, `docker-compose.prod.yml`, `docker-compose.test.yml` | ✅ Résolu |
| G3 | Solver CP-SAT | Backend | `docs/SPEC_SOLVER_CPSAT.md` | ✅ Résolu |
| G4 | Secrets | Sécurité | `docs/SPEC_SECRETS.md`, `.env.example` | ✅ Résolu |
| G5 | Monitoring | Exploitation | `docs/SPEC_MONITORING.md` | ✅ Résolu |
| G6 | Accessibilité | Frontend | `docs/SPEC_ACCESSIBILITE.md` | ✅ Résolu |
---

## Détails par gap

### G1 — Stratégie de migration de base de données

**Fichiers :**
- `docs/DOC_MIGRATION_DB.md` — Spécification complète (convention nommage, commandes par env, rollback, seed, matrice compatibilité, checklist DoD)
- `packages/db/prisma/seed.ts` — Seed de développement (rôles, départements, utilisateurs, année/semestres, référentiels, version initiale, config système)

**Points clés :**
- Utilise Prisma Migrate natif
- Séparation `migrate dev` (dev) / `migrate deploy` (recette/prod)
- Fichiers `down.sql` pour rollback
- Seed idempotent avec `upsert`
- Intégration pipeline CI/CD documentée

---

### G2 — Stratégie CI/CD concrète

**Fichiers :**
- `.github/workflows/ci.yml` — Pipeline complet (lint, typecheck, test, build, docker-build, e2e, deploy-recette)
- `apps/backend/Dockerfile` — Multi-stage (builder + runner avec dumb-init, user non-root)
- `apps/frontend/Dockerfile` — Multi-stage (builder + nginx runner avec healthcheck)
- `apps/frontend/nginx.conf` — Config nginx (SPA fallback, API proxy, SSE, security headers, cache)
- `docker-compose.prod.yml` — Stack complète prod (nginx, frontend, backend, solver-worker, postgres, pgbackrest, prometheus, grafana, secrets Docker)
- `docker-compose.test.yml` — Stack test E2E (postgres tmpfs, backend builder, frontend preview, mock-smtp)

**Points clés :**
- Pipeline bloquant sur lint, typecheck, tests, coverage, docker build
- Déploiement recette auto sur push main
- Tests E2E avec Playwright sur stack complète
- Images Docker taggées par SHA Git
- Healthchecks sur tous les services

---

### G3 — Contrat et client Solver CP-SAT

**Fichier :**
- `docs/SPEC_SOLVER_CPSAT.md` — Spécification complète (architecture, JSON Schema fichier dérivé, exemple concret, interfaces TypeScript, client Solver, worker pg-boss, modèle OR-Tools Python, critères performance, gestion erreurs)

**Points clés :**
- Fichier dérivé JSON structuré (métadonnées, grille temps, salles, enseignants, groupes, matières, activités, contraintes, verrous)
- Séparation stricte base métier / solver (EX-PRI-01)
- Client `@takt/solver-client` encapsulant appel processus enfant
- Worker pg-boss asynchrone avec SSE notification
- Solver OR-Tools CP-SAT en Python (subprocess)
- Critères performance : < 5min (200 séances), < 30min (4000 séances)
- 3 scénarios max, timeout 300s
---

### G4 — Gestion des secrets

**Fichiers :**
- `docs/SPEC_SECRETS.md` — Spécification complète (9 secrets requis, architecture déploiement, .env.example, SOPS+age chiffrement, Docker secrets, code lecture secrets, procédure rotation, checklist sécurité)
- `.env.example` — Template variables d'environnement (tous les secrets avec placeholders CHANGE_ME)

**Points clés :**
- Zéro secret en clair dans Git (DEP-ENV-03)
- Docker Secrets (fichiers montés `/run/secrets/`)
- Chiffrement `.env.enc` avec SOPS + age pour versionnage valeurs par défaut
- Rotation semestrielle JWT/DB, annuelle SMTP/S3/Grafana
- Fallback variable d'env pour développement local
- Code utilitaire `readSecret()` pour lecture unifiée

---

### G5 — Monitoring au-delà du healthcheck

**Fichier :**
- `docs/SPEC_MONITORING.md` — Spécification complète (stack Prometheus/Grafana/Loki, 8 métriques infra, 14 métriques métier, 5 métriques solver, règles alerting Prometheus 3 groupes, 3 dashboards Grafana, config Prometheus/Alertmanager, intégration backend NestJS, runbook incidents)

**Points clés :**
- Métriques techniques : dispo, latence p95, erreur 5xx, connexions DB, disque, mémoire, CPU
- Métriques métier : générations (lancées/réussies/échouées/durée), couverture, versions bloquées, rejets, exports, verrous
- Métriques solver : queue, temps attente, temps résolution, mémoire, statut
- Alertes critiques : service down, erreur 5xx, échecs génération, couverture < 80%, solver timeout/mémoire
- Dashboards : Infrastructure, Métier, Solver
- Runbook simplifié par alerte

---

### G6 — Tests d'accessibilité thème Ramadan

**Fichier :**
- `docs/SPEC_ACCESSIBILITE.md` — Spécification complète (WCAG 2.1 AA, tableau critères, analyse contraste 2 thèmes, pyramide tests, config axe-core, tests contraste tokens, tests E2E Playwright, intégration CI/CD, checklist manuel, métriques suivi)

**Points clés :**
- Conformité WCAG 2.1 AA sur les 2 thèmes (Normal + Ramadan)
- Analyse contraste identifie 3 ajustements requis (Warning Normal, Lock Normal, Accent Ramadan)
- 5 niveaux de tests : unit (tokens), composants, intégration (26 écrans), E2E (12 parcours), manuel (5 parcours)
- axe-core configuré tags wcag2aa/wcag21aa/best-practice
- Tests contraste programmatiques sur tokens design
- E2E Playwright + axe-core sur 9 écrans critiques × 2 thèmes
- Intégration CI/CD avec job dédié `accessibility` bloquant
- Checklist manuelle : clavier seul, lecteur écran, zoom 200%, contraste élevé

---

## Intégration dans le Plan Macro

Tous les livrables sont calés dans le calendrier existant sans ajouter de phase :

```
Semaine :  1   2   3   4   5   6   7   8   9   10  11  12
          ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
P0 Cadrage│███│███│     │     │     │     │     │     │     │     │
P1 Fondat.│     │     │███│███│     │     │     │     │     │     │
  ├─ G1    │     │     │███│███│     │     │     │     │     │     │
  ├─ G2    │     │     │███│███│     │     │     │     │     │     │
  ├─ G3    │     │     │     │███│     │     │     │     │     │     │
  ├─ G4    │     │     │███│     │     │     │     │     │     │     │
P2 Référ. │     │     │     │     │███│███│     │     │     │     │
P3 Cœur   │     │     │     │     │     │     │███│███│     │     │
  ├─ G6    │     │     │     │     │     │███│███│███│     │     │
P4 Génér. │     │     │     │     │     │     │     │███│███│     │
P5 Prod   │     │     │     │     │     │     │     │     │███│███│
  ├─ G5    │     │     │     │     │     │     │     │     │███│███│
Jalons   │J0 │J10│     │J14│     │J28│     │J42│     │J56│     │J70│
          └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
```

---

## Prochaines étapes recommandées

1. **Revue croisée** : Architecte + Backend Lead + Frontend Lead + DevOps valident les 6 specs
2. **Ajustement tokens** : Corriger les 3 contraste identifiés (Warning Normal, Lock Normal, Accent Ramadan) dans `packages/design-tokens/`
3. **Initialisation repo** : Créer la structure monorepo pnpm avec les packages/apps
4. **Sprint 0 (P1)** : Implémenter auth, DB, CI/CD, spike solver en parallèle
5. **Configuration secrets** : Générer clés age, configurer SOPS, créer fichiers secrets sur serveur recette

---

*Fin du résumé — Tous les gaps du dossier conceptuel sont résolus et documentés.*