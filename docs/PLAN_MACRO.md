# PLAN MACRO — TAKT

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques  
**Licence :** GNU AGPL v3  
**Répertoire :** `/home/mehdi/dev/takt/`  
**Statut :** Plan macro de livraison — Version 1.0  
**Date :** 30 octobre 2026

## 1. Vue d'ensemble

TAKT est une application de planification pédagogique conçue pour un établissement d'enseignement supérieur. Elle couvre le référentiel métier, les affectations pédagogiques, le calcul de charge horaire, la génération automatique d'emplois du temps, le workflow de validation à deux niveaux, la publication et les exports.


---

## 2. Phases de livraison

| Phase | Nom | Durée | Objectif principal | Livrable final |
|-------|-----|-------|-------------------|----------------|
| **P0** | Cadrage & Conception | 2 semaines | Figer les spécifications fonctionnelle, technique et le workflow métier détaillé | Spécifications figées + DoR validée |
| **P1** | Fondation (Sprint 0) | 2 semaines | Repo, stack, authentification basique, modèle de données, CI minimale | Repo initial opérationnel + healthcheck |
| **P2** | Référentiels (Sprint 1) | 2 semaines | CRUD complet des entités métier | API référentiel + UI CRUD |
| **P3** | Cœur du planning (Sprint 2) | 2 semaines | Affectations, charge horaire, séances, détection de conflits, grille EDT | Grille EDT interactive + contrôle des conflits |
| **P4** | Génération, validation, publication (Sprint 3) | 2 semaines | Solver CP-SAT, workflow versions, exports, notifications | Version publiée + exports + notifications |
| **P5** | Production & Recette (Sprint 4) | 2 semaines | Audit, sécurité, tests, déploiement multi-environnements, recette métier | Production live + CI/CD vert + recette signée |
| **P6** | Exploitation & Maintien | Continue | Support, monitoring, évolutions | Application en production soutenue |

**Durée totale prévisionnelle :** 12 semaines avant mise en production.



### Phase 0 — Cadrage & Conception (Semaines 1-2)

**Objectif :** Verrouiller toutes les décisions architecturales et métier avant d'écrire une ligne de code.

| Étape | Contenu | Livrable | Responsable | Critère de sortie |
|-------|---------|----------|-------------|-------------------|
| E0.1 | Atelier de cadrage MOA/DSI | Compte-rendu de cadrage | Chef de projet + MOA | Périmètre, budget, calendrier validés |
| **E0.2** | **Détail du workflow métier** | `docs/WORKFLOW_METIER.md` | MOA + Architecte | Matrice de transitions, règles de garde, responsabilités par rôle/état |
| E0.3 | Spécification Fonctionnelle (SF) | `docs/SF_TAKT.md` | MOA + Architecte | Règles métier, écrans, MoSCoW figés |
| E0.3a | Arborescence des écrans | `docs/UI_ARBORESCENCE.md` | UX Designer + MOA | Cartographie des vues par rôle validée |
| E0.3b | User flows critiques | `docs/UI_USER_FLOWS.md` | UX Designer + MOA | Parcours utilisateur figés |
| E0.3c | Wireframes / maquettes | `docs/UI_WIREFRAMES.md` | UX Designer | Maquettes basse fidélité validées par la MOA |
| E0.3d | Spécifications d'interaction | `docs/UI_INTERACTIONS.md` | UX Designer + Frontend Lead | Comportement drag&drop, verrous, conflits spécifié |
| E0.3e | Design tokens & charte | `docs/UI_DESIGN_TOKENS.md` + doc | UX Designer + Frontend Lead | Tokens, WCAG AA, thème Ramadan défini |
| E0.3f | Spécifications frontend détaillées | `docs/UI_FRONTEND_SPECS.md` | Frontend Lead + UX Designer | Stack, composants, état, intégration API figés |
| E0.4 | Spécification Technique (ST) | `docs/ST_TAKT.md` | Architecte | Stack, architecture, contrats API, algorithmes |
| E0.5 | Modèle de données (MLD/MDP) | `packages/db/prisma/contract.prisma` | Architecte | Contraintes UNIQUE, index, cardinalités validées |
| E0.6 | Contrats API OpenAPI | `docs/openapi.yaml` | Architecte | Endpoints, payloads, erreurs RFC 9457 figés |
| E0.7 | Plan de tests | `docs/TESTS.md` | Architecte + QA | ≥ 80 % couverture visée sur les services critiques |
| E0.8 | Plan de déploiement | `docs/DEPLOIEMENT.md` | DSI + Architecte | Environnements dev/recette/prod, sauvegardes, rollback |
| E0.9 | Plan de licence & conformité | `docs/LICENCE_AGPL.md` | DSI + Juridique | Licence AGPL v3, obligations identifiées, DPO consulté |

**Livrable majeur :** Dossier de spécifications complet + **DoR (Definition of Ready)** signé par la MOA et la DSI.


### Phase 1 — Fondation (Sprint 0, Semaines 3-4)

**Objectif :** Mettre en place la chaîne de développement complète et valider qu'elle fonctionne end-to-end.

| Étape | Contenu | Livrable | Responsable | DoD |
|-------|---------|----------|-------------|-----|
| E1.1 | Initialisation du monorepo Turbo + pnpm | Repo Git initial | Tech Lead | `pnpm install` fonctionne, Turbo reconnu |
| E1.2 | Schéma Prisma 8 initial (UUID, tables de base) | `packages/db/prisma/contract.prisma` | Backend Lead | `prisma db verify` passe, migrations initiales créées |
| E1.3 | Authentification basique (JWT RS256, refresh argon2id) | `apps/api/src/auth/` | Backend Lead | Login/refresh fonctionnel, routes protégées retournent 401 sans token |
| E1.4 | File de jobs pg-boss | `apps/api/src/jobs/` | Backend Lead | Un job de test s'exécute et est tracé en base |
| E1.5 | Docker Compose dev + healthcheck | `docker-compose.yml` | DevOps | `curl /health` retourne 200, tous les services montent |
| E1.6 | CI minimale (lint + typecheck + build) | `.github/workflows/ci.yml` | DevOps | Pipeline verte sur `main` |

**Livrable majeur :** Repo initial clonable, santé vérifiée, authentification fonctionnelle.

---

### Phase 2 — Référentiels (Sprint 1, Semaines 5-6)

**Objectif :** CRUD complet des entités métier de référence.

| Étape | Contenu | Livrable | Responsable | DoD |
|-------|---------|----------|-------------|-----|

| E2.1 | Établissement, Département, Année, Semestre | API + UI | Fullstack | CRUD opérationnel, validation des champs |
| E2.2 | TypeEnseignement, Grade, Module, Matière | API + UI | Fullstack | Matrice type × grade saisissable |
| E2.3 | Enseignant, Groupe, Salle, Site, TypeSalle, Équipement | API + UI | Fullstack | Recherche, filtrage, import CSV fonctionnels |
| E2.4 | ActivityTag, Créneau, CréneauAffichage (Ramadan) | API + UI | Fullstack | Grille horaire configurable |
| E2.5 | Seeds de données de référence | `SEED_DATA.sql` | Backend | Jeu de données minimal injectable pour les tests |

**Livrable majeur :** Référentiel métier complet, saisissable via l'interface, avec tests unitaires associés.

---

### Phase 3 — Cœur du planning (Sprint 2, Semaines 7-8)

**Objectif :** Construire la grille EDT, les affectations et le contrôle des conflits.

| Étape | Contenu | Livrable | Responsable | DoD |
|-------|---------|----------|-------------|-----|
| E3.1 | Plan d'études et affectations pédagogiques | `PlanÉtudes`, `Affectation` | Backend | Affectation enseignant ↔ module avec calcul de charge |
| E3.2 | Moteur de charge horaire (ChargeRuleSet) | `packages/charge-engine/` | Backend | Seuil, plafond, arrondi, coefficients appliqués |
| E3.3 | Création/édition de séances sur la grille | `Seance`, `VersionEdt` | Frontend + Backend | Drag&drop fonctionnel, snapshots de version |
| E3.4 | Détection de conflits (salle/enseignant/groupe) | `packages/conflict-engine/` | Backend | Contraintes SQL UNIQUE + contrôle applicatif, retour 409 |
| E3.5 | Verrous de séance (créneau/salle/enseignant/activité) | `VerrouSéance` | Backend | Verrouillage/déverrouillage traçables |

**Livrable majeur :** Grille EDT interactive avec détection de conflits en temps réel et calcul de charge horaire.

---

### Phase 4 — Génération, validation, publication (Sprint 3, Semaines 9-10)

**Objectif :** Génération automatique, workflow de validation et diffusion.

| Étape | Contenu | Livrable | Responsable | DoD |
|-------|---------|----------|-------------|-----|
| E4.1 | Moteur de résolution CP-SAT isolé | `packages/engine-solver/` | Backend (Python worker) | Génération de scénario, résultats partiels supportés |

| E4.2 | Workflow de version (10 états) | `VersionEdt` machine à états | Backend | Transitions validées, immuabilité de la version publiée |
| E4.3 | Validation à 2 niveaux (Dépt → Direction) | Endpoints de validation/soumission | Backend | Revalidation ciblée des départements impactés |
| E4.4 | Sélection manuelle de génération | UI de comparaison de scénarios | Frontend | Le système ne choisit jamais seul |
| E4.5 | Exports Excel (xlsx) + PDF (Playwright) + .ics | `apps/api/src/exports/` | Backend | Rendu N&B vérifiable, URL pré-signée, expiration 24h |
| E4.6 | Notifications in-app (SSE) + email | `Notification`, `SecurityEvent` | Backend | Boîte de réception, préférences utilisateur, journal de sécurité |

**Livrable majeur :** Première version publiée d'un EDT, exportée et diffusée.

---

### Phase 5 — Production & Recette (Sprint 4, Semaines 11-12)

**Objectif :** Passer en production, sécuriser, tester et faire signer la recette.

| Étape | Contenu | Livrable | Responsable | DoD |
|-------|---------|----------|-------------|-----|
| E5.1 | Audit métier + Journal de sécurité | `audit_log`, `security_event` | Backend | Accès Admin uniquement, conservation 5 ans / 3 ans |
| E5.2 | Tests complets (unit, intégration, e2e) | `TESTS.md` exécutés | QA | Couverture ≥ 80 % sur les services critiques |
| E5.3 | Déploiement multi-environnements (recette + prod) | Docker Compose prod, Nginx TLS | DevOps | Rollback testé, sauvegarde pgBackRest configurée |
| E5.4 | CI/CD complet (lint, typecheck, build, test, deploy) | `.github/workflows/` | DevOps | Pipeline verte sur `main` |
| E5.5 | Recette métier signée | PV de recette | MOA + Tech Lead | Validation croisée Technicien + Métier |
| E5.6 | Documentation utilisateur | Guide utilisateur | MOA + Rédacteur | Remis et validé |

**Livrable majeur :** Application en production, recette signée, documentation utilisateur remise.

---

### Phase 6 — Exploitation & Maintien (post-semaine 12)

| Activité | Fréquence | Livrable | Responsable |
|----------|-----------|----------|-------------|
| Monitoring (Prometheus/Grafana) | Continu | Tableaux de bord | DevOps |
| Sauvegardes et tests de restauration | Quotidien / Trimestriel | Rapports de sauvegarde | DevOps |

| Correctifs et évolutions | Selon backlog | Versions incrémentales | Équipe de dev |
| Comité de pilotage | Mensuel | Compte-rendu | Chef de projet |

## 4. Jalons et comités

| Jalon | Date cible | Objet | Décideurs |
|-------|------------|-------|-----------|
| **J0** | Semaine 1 | Lancement du projet | Chef de projet, MOA, DSI |
| **J10** | Semaine 2 | Figement des spécifications (DoR) | MOA, DSI, Architecte |
| **J14** | Semaine 4 | Fin Sprint 0 — Fondation validée | Tech Lead |
| **J28** | Semaine 6 | Fin Sprint 1 — Référentiels validés | MOA |
| **J42** | Semaine 8 | Fin Sprint 2 — Cœur du planning validé | MOA |
| **J56** | Semaine 10 | Fin Sprint 3 — Génération validée | MOA |
| **J70** | Semaine 12 | Fin Sprint 4 — Production + Recette signée | DSI, MOA, Tech Lead |
| **Comité mensuel** | Mensuel | Suivi de l'avancement et des risques | Comité de pilotage |

---

## 5. Matrice de traçabilité : Livrables → Phases → Jalons

| Livrable | Phase | Jalon associé | Validateur |
|----------|-------|---------------|------------|
| Compte-rendu de cadrage | P0 | J0 — Lancement | MOA |
| WORKFLOW_METIER.md | P0 (E0.2) | J10 | MOA + Architecte |
| SF / ST / MLD | P0 | J10 — Figement des spécifications | MOA + DSI |
| Contrats API OpenAPI | P0 | J10 | Architecte |
| Repo initial + healthcheck | P1 | J14 — Fin Sprint 0 | Tech Lead |
| API référentiel + UI CRUD | P2 | J28 — Fin Sprint 1 | MOA |
| Grille EDT + contrôle conflits | P3 | J42 — Fin Sprint 2 | MOA |
| Version publiée + exports | P4 | J56 — Fin Sprint 3 | MOA |
| Production live + CI/CD vert | P5 | J70 — Fin Sprint 4 | DSI + MOA |
| PV de recette signé | P5 | J70 | MOA + Tech Lead |
| Documentation utilisateur | P5 | J70 | MOA |

---

## 6. Gouvernance et règles de contribution

- **Branche par ticket** : `feat/` ou `fix/`, jamais de push direct sur `main`
- **Un seul push par ticket** (évite les doubles runs de CI)
- **Convention de commits** : Conventional Commits (`feat:`, `fix:`, `docs:`, `ci:`)
- **Relecture humaine obligatoire** avant tout commit
- **Chaque fonctionnalité accompagnée de ses tests**
- **Licence AGPL v3** : toute distribution impose la publication du code source complet sous AGPL v3

---

## 7. Risques et mitigations

| Phase | Risque | Probabilité | Impact | Mitigation |
|-------|--------|-------------|--------|------------|
| P0 | Spécifications incomplètes | Moyenne | Élevé | DoR stricte, relecture croisée MOA/DSI |
| P1 | Complexité du solver sous-estimée | Moyenne | Élevé | POC solver en P0, planification manuelle fallback |
| P2 | Volumétrie de données sous-estimée | Basse | Moyen | Tests de charge en P5, dimensionnement serveur prévu |
| P3 | Conflits de créneaux non détectés | Basse | Élevé | Contraintes SQL UNIQUE + tests T1, T2, T3 |
| P4 | Conflit de licence AGPL | Faible | Élevé | Licence AGPL v3 assumée, composants AGPL isolés |
| P5 | Retard de déploiement prod | Moyenne | Moyen | Environnement recette identique à prod, rollback préparé |
| Toutes | Dépendance à un seul développeur clé | Moyenne | Moyen | Documentation, revues de code, pair programming |

---

*Fin du PLAN MACRO — TAKT v1.0*
