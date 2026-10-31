# PROMPTS CLINE — CORPUS D'EXÉCUTION DU BACKLOG TAKT

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques
**Licence :** GNU AGPL v3 — Répertoire de travail : `/home/mehdi/dev/takt/`
**Version :** 1.0 — Date : 30 octobre 2026
**Documents liés :** `docs/BACKLOG_TAKT.md`, `docs/SUIVI_VELOCITE_TAKT.md`, `docs/SF_TAKT.md`, `docs/ST_TAKT.md`

---

## §1. Mode d'emploi du corpus

### 1.1 Principe d'exécution

Ce corpus contient **un prompt par ticket du backlog** (89 prompts, un par ticket `TAKT-Lxx-nn`). Chaque prompt est **autoportant** : il contient le contexte, le périmètre, les contraintes et les critères de sortie nécessaires pour que Cline implémente le ticket **sans conversation préalable**.

### 1.2 Procédure d'exécution d'un ticket

```
1. Vérifier le DoR            → BACKLOG_TAKT.md §1.4 (6 conditions)
2. Créer la branche           → git switch -c feat/<id-ticket-slug>
3. Coller le prompt           → bloc BEGIN PROMPT … END PROMPT
4. Relire le rapport Cline    → vérifier DoD + écarts au backlog
5. Ajuster / itérer            → relancer Cline avec le correctif ciblé
6. Prouver                    → pnpm lint && pnpm typecheck && pnpm test
7. Committer                  → Conventional Commits, 1 push
8. Mettre à jour le suivi     → SUIVI_VELOCITE_TAKT.md §5 et §6
```

### 1.3 Règles absolues

- **Un prompt = un ticket.** Ne jamais fusionner deux prompts dans une même session : le périmètre devient incontrôlable et le suivi de vélocité perd sa granularité.
- **Ne jamais passer un ticket non terminé.** Un ticket inachevé reste « En cours » et continue de consommer de la vélocité future.
- **Toujours fournir la preuve de test.** Un rapport sans sortie de commande n'est pas un rapport de clôture.

---

## §2. Modèle canonique de prompt

Tout prompt du corpus respecte ces 10 blocs, dans cet ordre.

| # | Bloc | Contenu attendu | Justification |
|---|------|-----------------|---------------|
| 1 | **Contexte & objectif** | Rappel du ticket, valeur métier, phase | Empêche une implémentation générique ou hors sujet |
| 2 | **Documents sources à lire** | Chemins absolus + codes d'exigences | Ancre le travail sur le corpus conceptuel |
| 3 | **Périmètre / hors périmètre** | Fichiers autorisés **et** interdits | Prévient le scope creep et les régressions transverses |
| 4 | **Contraintes d'architecture** | `TE-ARCH-*`, `TE-API-*`, `TE-MET-*`, `TE-SEC-*`, `EX-PRI-*` | Garantit la conformité aux décisions figées |
| 5 | **Conception attendue** | Modèle de données, endpoints, composants, algorithme | Fixe le « comment » et évite les allers-retours |
| 6 | **Étapes d'implémentation** | Séquencement TDD : test rouge → implémentation → refactor | Cadre l'exécution autonome de l'agent |
| 7 | **Tests exigés** | Unitaires, intégration, E2E, couverture, cas d'erreur | Aligne sur `docs/TESTS.md` |
| 8 | **Definition of Done** | Checklist binaire non négociable | Rend la clôture automatisable et auditable |
| 9 | **Garde-fous** | Ce que Cline ne doit **pas** faire | Réduit régressions et décisions non arbitrées |
| 10 | **Livrable attendu (rapport)** | Format de sortie imposé | Rend l'implémentation auditable |

### 2.1 Format des marqueurs

```
<!-- BEGIN PROMPT : TAKT-Lxx-nn -->
... contenu ...
<!-- END PROMPT : TAKT-Lxx-nn -->
```

Les marqueurs permettent l'extraction automatisée d'un prompt vers un fichier et la vérification de complétude (1 prompt par ticket).

<!-- ANCRE -->

<!-- BEGIN PROMPT : TAKT-L01-03 -->
**Ticket :** `TAKT-L01-03` — Créer le squelette du backend NestJS (santé, Swagger, configuration)
**Instruction :** Appliquer le modèle canonique (§2) en utilisant les données de la fiche `TAKT-L01-03` dans `BACKLOG_TAKT.md` (objectif, exigences, périmètre, livrables, critères, DoD, tests, SP, dépendances). Remplir les 10 blocs avec ces informations.
<!-- END PROMPT : TAKT-L01-03 -->

<!-- BEGIN PROMPT : TAKT-L01-04 -->
**Ticket :** `TAKT-L01-04` — Matérialiser le modèle de données Prisma et la migration initiale
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L01-04`.
<!-- END PROMPT : TAKT-L01-04 -->

<!-- BEGIN PROMPT : TAKT-L01-05 -->
**Ticket :** `TAKT-L01-05` — Créer le squelette du frontend Vite (React, TS strict, design system vide)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L01-05`.
<!-- END PROMPT : TAKT-L01-05 -->

<!-- BEGIN PROMPT : TAKT-L01-06 -->
**Ticket :** `TAKT-L01-06` — Fournir la stack Docker de développement (PostgreSQL, backend, frontend)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L01-06`.
<!-- END PROMPT : TAKT-L01-06 -->

<!-- BEGIN PROMPT : TAKT-L01-07 -->
**Ticket :** `TAKT-L01-07` — Mettre en place la CI minimale (lint, typecheck, build)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L01-07`.
<!-- END PROMPT : TAKT-L01-07 -->

<!-- BEGIN PROMPT : TAKT-L02-01 -->
**Ticket :** `TAKT-L02-01` — Implémenter l'enveloppe de réponse et la gestion d'erreurs
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L02-01`.
<!-- END PROMPT : TAKT-L02-01 -->

<!-- BEGIN PROMPT : TAKT-L02-02 -->
**Ticket :** `TAKT-L02-02` — Créer le package de contrats Zod partagés
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L02-02`.
<!-- END PROMPT : TAKT-L02-02 -->

<!-- BEGIN PROMPT : TAKT-L02-03 -->
**Ticket :** `TAKT-L02-03` — Implémenter la pagination, le filtrage et la normalisation des listes
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L02-03`.
<!-- END PROMPT : TAKT-L02-03 -->

<!-- BEGIN PROMPT : TAKT-L02-04 -->
**Ticket :** `TAKT-L02-04` — Générer et maintenir la spécification OpenAPI
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L02-04`.
<!-- END PROMPT : TAKT-L02-04 -->

<!-- BEGIN PROMPT : TAKT-L02-05 -->
**Ticket :** `TAKT-L02-05` — Implémenter le canal SSE (Server‑Sent Events)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L02-05`.
<!-- END PROMPT : TAKT-L02-05 -->

<!-- BEGIN PROMPT : TAKT-L02-06 -->
**Ticket :** `TAKT-L02-06` — Structurer les modules backend et l'injection de dépendances
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L02-06`.
<!-- END PROMPT : TAKT-L02-06 -->

<!-- BEGIN PROMPT : TAKT-L03-01 -->
**Ticket :** `TAKT-L03-01` — Implémenter le service de hachage argon2id
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L03-01`.
<!-- END PROMPT : TAKT-L03-01 -->

<!-- BEGIN PROMPT : TAKT-L03-02 -->
**Ticket :** `TAKT-L03-02` — Implémenter la signature JWT RS256 (accès court + refresh rotatif)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L03-02`.
<!-- END PROMPT : TAKT-L03-02 -->

<!-- BEGIN PROMPT : TAKT-L03-03 -->
**Ticket :** `TAKT-L03-03` — Exposer les endpoints login / refresh / logout
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L03-03`.
<!-- END PROMPT : TAKT-L03-03 -->

<!-- BEGIN PROMPT : TAKT-L03-04 -->
**Ticket :** `TAKT-L03-04` — Implémenter le CRUD utilisateurs et l'attribution des rôles
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L03-04`.
<!-- END PROMPT : TAKT-L03-04 -->

<!-- BEGIN PROMPT : TAKT-L03-05 -->
**Ticket :** `TAKT-L03-05` — Implémenter le RBAC et la portée par département
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L03-05`.
<!-- END PROMPT : TAKT-L03-05 -->

<!-- BEGIN PROMPT : TAKT-L03-06 -->
**Ticket :** `TAKT-L03-06` — Implémenter le journal d'audit en écriture
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L03-06`.
<!-- END PROMPT : TAKT-L03-06 -->

<!-- BEGIN PROMPT : TAKT-L03-07 -->
**Ticket :** `TAKT-L03-07` — Sécuriser les seeds et fournir les comptes de démonstration
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L03-07`.
<!-- END PROMPT : TAKT-L03-07 -->

<!-- BEGIN PROMPT : TAKT-L04-01 -->
**Ticket :** `TAKT-L04-01` — Implémenter le référentiel Établissement / Département / Parcours / Niveau / Groupe
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L04-01`.
<!-- END PROMPT : TAKT-L04-01 -->

<!-- BEGIN PROMPT : TAKT-L04-02 -->
**Ticket :** `TAKT-L04-02` — Implémenter le référentiel TypeEnseignement / Grade / Module / Matière
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L04-02`.
<!-- END PROMPT : TAKT-L04-02 -->

<!-- BEGIN PROMPT : TAKT-L04-03 -->
**Ticket :** `TAKT-L04-03` — Implémenter le référentiel Enseignant et l'association N:N Département
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L04-03`.
<!-- END PROMPT : TAKT-L04-03 -->

<!-- BEGIN PROMPT : TAKT-L04-04 -->
**Ticket :** `TAKT-L04-04` — Implémenter le référentiel Salle / Site / TypeSalle / Équipement
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L04-04`.
<!-- END PROMPT : TAKT-L04-04 -->

<!-- BEGIN PROMPT : TAKT-L04-05 -->
**Ticket :** `TAKT-L04-05` — Implémenter le référentiel Créneaux et l'affichage Ramadan
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L04-05`.
<!-- END PROMPT : TAKT-L04-05 -->

<!-- BEGIN PROMPT : TAKT-L04-06 -->
**Ticket :** `TAKT-L04-06` — Fournir l'UI CRUD générique des référentiels
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L04-06`.
<!-- END PROMPT : TAKT-L04-06 -->

<!-- BEGIN PROMPT : TAKT-L04-07 -->
**Ticket :** `TAKT-L04-07` — Implémenter l'import CSV des référentiels avec rapport d'erreurs
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L04-07`.
<!-- END PROMPT : TAKT-L04-07 -->

<!-- BEGIN PROMPT : TAKT-L04-08 -->
**Ticket :** `TAKT-L04-08` — Implémenter l'import sélectif depuis une année clôturée
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L04-08`.
<!-- END PROMPT : TAKT-L04-08 -->

<!-- BEGIN PROMPT : TAKT-L05-01 -->
**Ticket :** `TAKT-L05-01` — Implémenter le plan d'études (parcours → niveaux → matières → volumes)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L05-01`.
<!-- END PROMPT : TAKT-L05-01 -->

<!-- BEGIN PROMPT : TAKT-L05-02 -->
**Ticket :** `TAKT-L05-02` — Implémenter les affectations pédagogiques (enseignant ↔ matière ↔ groupe)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L05-02`.
<!-- END PROMPT : TAKT-L05-02 -->

<!-- BEGIN PROMPT : TAKT-L05-03 -->
**Ticket :** `TAKT-L05-03` — Implémenter le moteur de charge horaire (ChargeRuleSet)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L05-03`.
<!-- END PROMPT : TAKT-L05-03 -->

<!-- BEGIN PROMPT : TAKT-L05-04 -->
**Ticket :** `TAKT-L05-04` — Implémenter la validation de la répartition pédagogique et son snapshot immuable
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L05-04`.
<!-- END PROMPT : TAKT-L05-04 -->

<!-- BEGIN PROMPT : TAKT-L05-05 -->
**Ticket :** `TAKT-L05-05` — Implémenter la revalidation ciblée d'un département impacté
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L05-05`.
<!-- END PROMPT : TAKT-L05-05 -->

<!-- BEGIN PROMPT : TAKT-L05-06 -->
**Ticket :** `TAKT-L05-06` — Fournir l'UI de saisie et de validation de la répartition pédagogique
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L05-06`.
<!-- END PROMPT : TAKT-L05-06 -->

<!-- BEGIN PROMPT : TAKT-L06-01 -->
**Ticket :** `TAKT-L06-01` — Modéliser la version d'EDT et ses 10 états
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L06-01`.
<!-- END PROMPT : TAKT-L06-01 -->

<!-- BEGIN PROMPT : TAKT-L06-02 -->
**Ticket :** `TAKT-L06-02` — Implémenter le moteur de transitions (10 états, 19 transitions, gardes)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L06-02`.
<!-- END PROMPT : TAKT-L06-02 -->

<!-- BEGIN PROMPT : TAKT-L06-03 -->
**Ticket :** `TAKT-L06-03` — Implémenter le CRUD des séances sur la grille hebdomadaire
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L06-03`.
<!-- END PROMPT : TAKT-L06-03 -->

<!-- BEGIN PROMPT : TAKT-L06-04 -->
**Ticket :** `TAKT-L06-04` — Poser les contraintes SQL d'unicité et les index de performance
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L06-04`.
<!-- END PROMPT : TAKT-L06-04 -->

<!-- BEGIN PROMPT : TAKT-L06-05 -->
**Ticket :** `TAKT-L06-05` — Implémenter le moteur de conflits (12 types, 3 sévérités)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L06-05`.
<!-- END PROMPT : TAKT-L06-05 -->

<!-- BEGIN PROMPT : TAKT-L06-06 -->
**Ticket :** `TAKT-L06-06` — Implémenter la simulation d'alternatives de placement
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L06-06`.
<!-- END PROMPT : TAKT-L06-06 -->

<!-- BEGIN PROMPT : TAKT-L06-07 -->
**Ticket :** `TAKT-L06-07` — Implémenter le bail d'édition exclusif (30 min)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L06-07`.
<!-- END PROMPT : TAKT-L06-07 -->

<!-- BEGIN PROMPT : TAKT-L06-08 -->
**Ticket :** `TAKT-L06-08` — Implémenter les verrous de séance (4 types, pose en masse)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L06-08`.
<!-- END PROMPT : TAKT-L06-08 -->

<!-- BEGIN PROMPT : TAKT-L06-09 -->
**Ticket :** `TAKT-L06-09` — Implémenter le contrôle de couverture à 100 %
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L06-09`.
<!-- END PROMPT : TAKT-L06-09 -->

<!-- BEGIN PROMPT : TAKT-L06-10 -->
**Ticket :** `TAKT-L06-10` — Implémenter le snapshot de version et l'immuabilité de la publication
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L06-10`.
<!-- END PROMPT : TAKT-L06-10 -->

<!-- BEGIN PROMPT : TAKT-L07-01 -->
**Ticket :** `TAKT-L07-01` — Construire le fichier dérivé d'entrée du solveur
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L07-01`.
<!-- END PROMPT : TAKT-L07-01 -->

<!-- BEGIN PROMPT : TAKT-L07-02 -->
**Ticket :** `TAKT-L07-02` — Implémenter le client du solveur (packages/solver-client)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L07-02`.
<!-- END PROMPT : TAKT-L07-02 -->

<!-- BEGIN PROMPT : TAKT-L07-03 -->
**Ticket :** `TAKT-L07-03` — Implémenter le worker de génération (pg-boss + SSE)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L07-03`.
<!-- END PROMPT : TAKT-L07-03 -->

<!-- BEGIN PROMPT : TAKT-L07-04 -->
**Ticket :** `TAKT-L07-04` — Implémenter le modèle CP‑SAT (OR‑Tools, Python)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L07-04`.
<!-- END PROMPT : TAKT-L07-04 -->

<!-- BEGIN PROMPT : TAKT-L07-05 -->
**Ticket :** `TAKT-L07-05` — Valider la performance du solveur (spike SPK‑01)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L07-05`.
<!-- END PROMPT : TAKT-L07-05 -->

<!-- BEGIN PROMPT : TAKT-L07-06 -->
**Ticket :** `TAKT-L07-06` — Implémenter la sélection manuelle de scénario
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L07-06`.
<!-- END PROMPT : TAKT-L07-06 -->

<!-- BEGIN PROMPT : TAKT-L07-07 -->
**Ticket :** `TAKT-L07-07` — Implémenter les garde‑fous de lancement de génération
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L07-07`.
<!-- END PROMPT : TAKT-L07-07 -->

<!-- BEGIN PROMPT : TAKT-L08-01 -->
**Ticket :** `TAKT-L08-01` — Produire les design tokens (Normal + Ramadan, contrastes AA)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L08-01`.
<!-- END PROMPT : TAKT-L08-01 -->

<!-- BEGIN PROMPT : TAKT-L08-02 -->
**Ticket :** `TAKT-L08-02` — Implémenter le client HTTP, l'authentification et la gestion d'erreurs
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L08-02`.
<!-- END PROMPT : TAKT-L08-02 -->

<!-- BEGIN PROMPT : TAKT-L08-03 -->
**Ticket :** `TAKT-L08-03` — Implémenter les stores Zustand et les hooks métier
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L08-03`.
<!-- END PROMPT : TAKT-L08-03 -->

<!-- BEGIN PROMPT : TAKT-L08-04 -->
**Ticket :** `TAKT-L08-04` — Implémenter le routing, les guards et la navigation par rôle
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L08-04`.
<!-- END PROMPT : TAKT-L08-04 -->

<!-- BEGIN PROMPT : TAKT-L08-05 -->
**Ticket :** `TAKT-L08-05` — Construire le design system (atomes, molécules, organismes)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L08-05`.
<!-- END PROMPT : TAKT-L08-05 -->

<!-- BEGIN PROMPT : TAKT-L08-06 -->
**Ticket :** `TAKT-L08-06` — Mettre en place la chaîne de tests frontend (Vitest, Testing Library, axe‑core)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L08-06`.
<!-- END PROMPT : TAKT-L08-06 -->

<!-- BEGIN PROMPT : TAKT-L08-07 -->
**Ticket :** `TAKT-L08-07` — Implémenter le layout applicatif et la gestion des erreurs
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L08-07`.
<!-- END PROMPT : TAKT-L08-07 -->

<!-- BEGIN PROMPT : TAKT-L09-01 -->
**Ticket :** `TAKT-L09-01` — Écran `EC-COM-01` Connexion / Login
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L09-01`.
<!-- END PROMPT : TAKT-L09-01 -->

<!-- BEGIN PROMPT : TAKT-L09-02 -->
**Ticket :** `TAKT-L09-02` — Écran `EC-COM-02` Tableau de bord centralisé
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L09-02`.
<!-- END PROMPT : TAKT-L09-02 -->

<!-- BEGIN PROMPT : TAKT-L09-03 -->
**Ticket :** `TAKT-L09-03` — Écran `EC-COM-03` Profil utilisateur
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L09-03`.
<!-- END PROMPT : TAKT-L09-03 -->

<!-- BEGIN PROMPT : TAKT-L09-04 -->
**Ticket :** `TAKT-L09-04` — Écrans `EC-ADM-01` à `EC-ADM-04` Administration
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L09-04`.
<!-- END PROMPT : TAKT-L09-04 -->

<!-- BEGIN PROMPT : TAKT-L09-05 -->
**Ticket :** `TAKT-L09-05` — Écrans `EC-GES-01` Initialisation année/semestre et import archive
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L09-05`.
<!-- END PROMPT : TAKT-L09-05 -->

<!-- BEGIN PROMPT : TAKT-L09-06 -->
**Ticket :** `TAKT-L09-06` — Écrans `EC-GES-02` Préparation plans d'études et `EC-GES-03` Tableau de préparation (contraintes)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L09-06`.
<!-- END PROMPT : TAKT-L09-06 -->

<!-- BEGIN PROMPT : TAKT-L09-07 -->
**Ticket :** `TAKT-L09-07` — Écran `EC-GES-04` Lancement et suivi des générations
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L09-07`.
<!-- END PROMPT : TAKT-L09-07 -->

<!-- BEGIN PROMPT : TAKT-L09-08 -->
**Ticket :** `TAKT-L09-08` — Écran `EC-GES-05` Comparaison de scénarios
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L09-08`.
<!-- END PROMPT : TAKT-L09-08 -->

<!-- BEGIN PROMPT : TAKT-L09-09 -->
**Ticket :** `TAKT-L09-09` — Écran `EC-GES-06` Grille EDT drag&drop + `EC-GES-07` Simulation conflits + `EC-GES-12` Bail d'édition
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L09-09`.
<!-- END PROMPT : TAKT-L09-09 -->

<!-- BEGIN PROMPT : TAKT-L09-10 -->
**Ticket :** `TAKT-L09-10` — Écran `EC-GES-08` Soumission pour validation Département
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L09-10`.
<!-- END PROMPT : TAKT-L09-10 -->

<!-- BEGIN PROMPT : TAKT-L09-11 -->
**Ticket :** `TAKT-L09-11` — Écrans `EC-GES-09` Publication, `EC-GES-10` Archivage, `EC-GES-11` Exports
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L09-11`.
<!-- END PROMPT : TAKT-L09-11 -->

<!-- BEGIN PROMPT : TAKT-L09-12 -->
**Ticket :** `TAKT-L09-12` — Écrans `EC-RDEP-01` à `EC-RDEP-05` Responsable Département
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L09-12`.
<!-- END PROMPT : TAKT-L09-12 -->

<!-- BEGIN PROMPT : TAKT-L09-13 -->
**Ticket :** `TAKT-L09-13` — Écrans `EC-DIR-01` à `EC-DIR-05` Direction
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L09-13`.
<!-- END PROMPT : TAKT-L09-13 -->

<!-- BEGIN PROMPT : TAKT-L10-01 -->
**Ticket :** `TAKT-L10-01` — Implémenter la transition de publication (`valide → publie`)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L10-01`.
<!-- END PROMPT : TAKT-L10-01 -->

<!-- BEGIN PROMPT : TAKT-L10-02 -->
**Ticket :** `TAKT-L10-02` — Générer l'export Excel (XLSX) de la grille EDT
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L10-02`.
<!-- END PROMPT : TAKT-L10-02 -->

<!-- BEGIN PROMPT : TAKT-L10-03 -->
**Ticket :** `TAKT-L10-03` — Générer l'export PDF (Playwright/Chromium) de la grille EDT
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L10-03`.
<!-- END PROMPT : TAKT-L10-03 -->

<!-- BEGIN PROMPT : TAKT-L10-04 -->
**Ticket :** `TAKT-L10-04` — Générer l'export calendrier (.ics) pour intégration personnelle
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L10-04`.
<!-- END PROMPT : TAKT-L10-04 -->

<!-- BEGIN PROMPT : TAKT-L10-05 -->
**Ticket :** `TAKT-L10-05` — Implémenter les notifications in‑app (SSE) et email
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L10-05`.
<!-- END PROMPT : TAKT-L10-05 -->

<!-- BEGIN PROMPT : TAKT-L10-06 -->
**Ticket :** `TAKT-L10-06` — Implémenter le journal de sécurité (SecurityEvent)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L10-06`.
<!-- END PROMPT : TAKT-L10-06 -->

<!-- BEGIN PROMPT : TAKT-L10-07 -->
**Ticket :** `TAKT-L10-07` — Dupliquer une version archivée vers `initial` (nouveau semestre)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L10-07`.
<!-- END PROMPT : TAKT-L10-07 -->

<!-- BEGIN PROMPT : TAKT-L11-01 -->
**Ticket :** `TAKT-L11-01` — Fournir la consultation et l'export du journal d'audit et de sécurité
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L11-01`.
<!-- END PROMPT : TAKT-L11-01 -->

<!-- BEGIN PROMPT : TAKT-L11-02 -->
**Ticket :** `TAKT-L11-02` — Mettre en place le monitoring (Prometheus, Grafana, Alertmanager)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L11-02`.
<!-- END PROMPT : TAKT-L11-02 -->

<!-- BEGIN PROMPT : TAKT-L11-03 -->
**Ticket :** `TAKT-L11-03` — Configurer la gestion des secrets (SOPS + age, Docker secrets)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L11-03`.
<!-- END PROMPT : TAKT-L11-03 -->

<!-- BEGIN PROMPT : TAKT-L11-04 -->
**Ticket :** `TAKT-L11-04` — Finaliser le pipeline CI/CD complet (lint, typecheck, build, test, docker, deploy recette)
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L11-04`.
<!-- END PROMPT : TAKT-L11-04 -->

<!-- BEGIN PROMPT : TAKT-L11-05 -->
**Ticket :** `TAKT-L11-05` — Exécuter la recette métier complète et signer le PV
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L11-05`.
<!-- END PROMPT : TAKT-L11-05 -->

<!-- BEGIN PROMPT : TAKT-L11-06 -->
**Ticket :** `TAKT-L11-06` — Audit de sécurité, conformité AGPL et revue de code finale
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L11-06`.
<!-- END PROMPT : TAKT-L11-06 -->

<!-- BEGIN PROMPT : TAKT-L11-07 -->
**Ticket :** `TAKT-L11-07` — Documentation technique et opérationnelle finale
**Instruction :** Suivre le modèle canonique avec la fiche `TAKT-L11-07`.
<!-- END PROMPT : TAKT-L11-07 -->

---
*Fin du corpus PROMPTS_CLINE_TAKT.md — 89 prompts (5 détaillés + 84 références aux fiches du backlog).*
