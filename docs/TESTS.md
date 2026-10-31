# Plan de tests — TAKT (TESTS.md)

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques  
**Version :** 0.1 (E0.7 — validé)  
**Date :** 30 octobre 2026  
**Responsables :** Architecte + QA  
**Statut :** Phase 0 (E0.7) — Validé  
**Critère de sortie :** ≥ 80 % couverture sur les services critiques, 100 % des parcours critiques en E2E  
**Documents liés :** ST_TAKT.md, openapi.yaml, contract.prisma, UI_FRONTEND_SPECS.md, UI_USER_FLOWS.md, UI_INTERACTIONS.md, WORKFLOW_METIER.md, PLAN_MACRO.md

---

**Convention de nommage des fichiers de test.**
- Tests unitaires et d'intégration : `*.test.ts` ou `*.test.tsx` (voir UI_FRONTEND_SPECS.md)
- Tests E2E : `*.e2e.ts` ou `*.spec.ts` (Playwright)
- Dossiers de tests : `__tests__/` collocatés avec le code source ou `tests/` à la racine de chaque package

---

## 1. Stratégie de tests — pyramide

La stratégie suit une pyramide classique avec trois niveaux :

| Niveau | Outil | Part estimée | Objectif |
|--------|-------|-------------|----------|
| Tests unitaires | Vitest + Testing Library | ~70 % | Logique métier pure, utilitaires, composants isolés |
| Tests d'intégration | Vitest + supertest (ou équivalent) | ~20 % | API endpoints, base de données, authentification |
| Tests E2E | Playwright | ~10 % | Parcours critiques utilisateur, navigation, drag&drop |

### 1.1 Outils et configuration

| Outil | Version | Rôle |
|-------|---------|------|
| Vitest | 2.x | Tests unitaires et d'intégration (frontend + backend) |
| Testing Library | — | Tests centrés utilisateur (composants React) |
| Playwright | 1.4x | Tests E2E navigateur |
| supertest (ou équivalent NestJS) | — | Tests d'intégration API |
| @takt/db (Prisma Client) | — | Accès base de données dans les tests d'intégration |

### 1.2 Environnement de test

- **Tests unitaires** : exécution sans base de données, utilisation de mocks pour les dépendances externes (API, solver CP-SAT, système de fichiers)
- **Tests d'intégration** : base de données PostgreSQL de test séparée, migrations appliquées, seeds injectés (`SEED_DATA.sql`)
- **Tests E2E** : instance complète de l'application (frontend + backend + base de données) via Docker Compose, navigateur headless

### 1.3 Règles générales

| Règle | Description |
|-------|-------------|
| `TE-TEST-01` | Chaque fonctionnalité doit être accompagnée de ses tests (PLAN_MACRO §6) |
| `TE-TEST-02` | Les tests unitaires ne doivent pas dépendre de la base de données ni du réseau |
| `TE-TEST-03` | Les tests d'intégration utilisent une base de données de test dédiée, réinitialisée avant chaque suite |
| `TE-TEST-04` | Les tests E2E couvrent 100 % des parcours critiques (UI_FRONTEND_SPECS.md DL-FS-08) |
| `TE-TEST-05` | Le pipeline CI exécute lint + typecheck + build + tests avant tout déploiement (PLAN_MACRO E5.4) |

---

## 2. Tests unitaires

### 2.1 Périmètre

Les tests unitaires couvrent la logique métier pure et les utilitaires, sans dépendance à la base de données ni au réseau. Ils sont écrits avec Vitest et Testing Library, nommés `*.test.ts` ou `*.test.tsx`.

### 2.2 Domaines et services à tester

| Domaine | Service / composant | Scénarios à couvrir |
|---------|---------------------|---------------------|
| Authentification | Hachage argon2id | Mot de passe valide, mot de passe invalide, coût de hachage (~100 ms) |
| Authentification | Génération JWT | Access token (15 min), refresh token (7 j rotatif), signature, expiration |
| Workflow | Matrice des 19 transitions | Toutes les transitions valides, transitions invalides par rôle et état |
| Workflow | Contrôle d'accès par état | Matrice rôle × état (10 états × 4 rôles) |
| Conflits | Détection double affectation salle | Deux séances même jour/créneau/salle |
| Conflits | Détection double affectation enseignant | Deux séances même jour/créneau/enseignant |
| Conflits | Détection double affectation groupe | Deux séances même jour/créneau/groupe |
| Conflits | Conflit avec verrou | Modification d'une séance verrouillée par un autre utilisateur |
| Bail d'édition | Pose de verrou | Création d'un bail 30 min, renouvellement, expiration |
| Bail d'édition | Forçage | Libération d'un verrou abandonné par admin |
| Séances | Création | Validation des champs, unicité (versionId, jour, creneauDebut, nbCreneaux) |
| Séances | Modification | Vérification du bail d'édition avant modification |
| Génération CP-SAT | Construction du fichier dérivé | Séances, contraintes, verrous, format de sortie |
| Génération CP-SAT | Parsing des scénarios | Score global (0-100), sous-scores, sélection |
| Couverture 100 % | Vérification volumes horaires | Somme des séances vs volume horaire déclaré |
| Exports | Génération XLSX/PDF | Format de sortie, contenu des données |

### 2.3 Couverture cible

- **≥ 80 %** de lignes couvertes par les tests unitaires + intégration (UI_FRONTEND_SPECS.md)
- **100 %** des branches sur les services critiques (authentification, workflow, conflits)

### 2.4 Exemple de structure de test unitaire

```
packages/
  api/
    src/
      auth/
        auth.service.test.ts          # hachage, JWT, refresh
      versions/
        workflow.service.test.ts      # 19 transitions, matrice rôles × états
      planning/
        conflict.service.test.ts      # détection conflits salle/enseignant/groupe
        lock.service.test.ts          # bail d'édition 30 min, renouvellement
      generation/
        solver.service.test.ts        # fichier dérivé, parsing scénarios
  frontend/
    src/
      components/
        GridEdt/
          GridEdt.test.tsx            # rendu, drag&drop basique
        LockBadge/
          LockBadge.test.tsx          # affichage verrou, état expiré
```

---

## 3. Tests d'intégration

### 3.1 Périmètre

Les tests d'intégration vérifient le bon fonctionnement des endpoints API, de l'accès à la base de données et de l'authentification. Ils utilisent une base de données PostgreSQL de test dédiée, réinitialisée avant chaque suite de tests.

### 3.2 Endpoints API à tester (conformes à openapi.yaml)

| Domaine | Endpoint | Méthode | Codes HTTP attendus | Scénarios |
|---------|----------|---------|---------------------|-----------|
| Auth | `/auth/login` | POST | 200, 400, 401 | Identifiants valides, invalides, compte inactif |
| Auth | `/auth/refresh` | POST | 200, 400, 401 | Refresh token valide, expiré, invalide |
| Auth | `/auth/logout` | POST | 200, 401 | Déconnexion réussie, non authentifié |
| Utilisateurs | `/users` | GET | 200, 401, 403 | Liste paginée, filtres par rôle/département |
| Utilisateurs | `/users` | POST | 201, 400, 401, 403 | Création succès, email dupliqué, droits insuffisants |
| Utilisateurs | `/users/:id` | GET/PUT/DELETE | 200, 401, 403, 404 | Détail, modification, suppression, inexistant |
| Versions | `/versions` | GET/POST | 200, 201, 400, 401, 403 | Liste, création, filtres par semestre/état |
| Versions | `/versions/:id` | GET/PUT/DELETE | 200, 401, 403, 404 | Détail, modification, suppression |
| Versions | `/versions/:id/transition` | POST | 200, 400, 401, 403, 404, 409 | Transition valide, invalide, conflit d'état |
| Séances | `/seances` | GET/POST | 200, 201, 400, 401, 403, 409 | Liste, création, conflit de créneau |
| Séances | `/seances/:id` | PUT/PATCH/DELETE | 200, 400, 401, 403, 404, 409 | Modification, suppression, verrou |
| Verrous | `/locks` | POST | 201, 400, 401, 403, 404, 423 | Pose de verrou, conflit, déjà verrouillé |
| Verrous | `/locks/:id` | DELETE | 200, 401, 403, 404 | Levée de verrou, droits |
| Generations | `/generations` | GET/POST | 200, 202, 400, 401, 403, 409 | Liste, lancement, prérequis |
| Generations | `/generations/:id/scenarios` | GET | 200, 401, 404 | Scénarios d'une génération |
| Generations | `/generations/:id/select` | POST | 200, 400, 401, 403, 404 | Sélection de scénario |
| Exports | `/exports` | GET/POST | 200, 202, 400, 401, 403, 404 | Liste, lancement, version non publiée |
| Audit | `/audit` | GET | 200, 401, 403 | Journal d'audit avec filtres |

### 3.3 Authentification et RBAC

| Test | Description |
|------|-------------|
| Accès sans token | Toutes les routes protégées retournent 401 |
| Token expiré | Retourne 401 |
| Rôle insuffisant | Retourne 403 sur les endpoints réservés |
| Département non autorisé | Retourne 403 pour l'accès aux données d'un autre département |
| Contrôle d'accès par état de version | Vérification de la matrice rôle × état (ST_TAKT §5.3) |

### 3.4 Base de données

| Test | Description |
|------|-------------|
| Migrations | `prisma migrate` passe sur la base de test |
| Seeds | `SEED_DATA.sql` injecte un jeu de données minimal |
| Contraintes UNIQUE | Violation de contrainte retourne une erreur appropriée |
| Contraintes d'intégrité | Clés étrangères, cascade de suppression |
| Index | Les index de performance existent et sont utilisés |

### 3.5 Exemple de structure de test d'intégration

```
packages/
  api/
    src/
      auth/
        auth.controller.integration.test.ts
      versions/
        versions.controller.integration.test.ts
      planning/
        seances.controller.integration.test.ts
        locks.controller.integration.test.ts
      generations/
        generations.controller.integration.test.ts
      exports/
        exports.controller.integration.test.ts
      audit/
        audit.controller.integration.test.ts
```

---

## 4. Tests E2E (Playwright)

### 4.1 Périmètre

Les tests E2E couvrent les parcours critiques utilisateur du bout en bout, avec navigateur headless. Ils utilisent une instance complète de l'application (frontend + backend + base de données) via Docker Compose.

100 % des parcours critiques sont couverts par les tests E2E (UI_FRONTEND_SPECS.md DL-FS-08).

### 4.2 Parcours utilisateurs critiques (UF-* depuis UI_USER_FLOWS.md)

| Parcours | ID | Description | Rôle |
|----------|-----|-------------|------|
| Connexion | UF-01 | `gest` se connecte, obtient accès à l'application | gest |
| Création de version | UF-02 | `gest` crée une nouvelle version pour un semestre | gest |
| Répartition pédagogique | UF-03 | `rdep` valide/rejette la répartition de son département | rdep |
| Lancement de génération | UF-04 | `gest` lance la génération CP-SAT | gest |
| Sélection de scénario | UF-05 | `gest` sélectionne un scénario généré | gest |
| Édition des séances | UF-06 | `gest` déplace/modifie des séances en édition | gest |
| Validation direction | UF-07 | `dir` valide/rejette la version | dir |
| Publication | UF-08 | `gest` publie la version | gest |
| Archivage | UF-09 | `gest` archive une version publiée | gest |
| Export | UF-10 | `gest` génère un export XLSX/PDF/ICS | gest |
| Import année clôturée | UF-11 | `gest` importe des données depuis une année précédente | gest |
| Journal d'audit | UF-12 | `admin` consulte le journal d'audit | admin |

### 4.3 Interactions critiques (IX-* depuis UI_INTERACTIONS.md)

| Interaction | ID | Description |
|-------------|-----|-------------|
| Drag&drop séance | IX-01 | Déplacer une séance sur la grille EDT |
| Redimensionnement séance | IX-02 | Étendre/réduire une séance sur plusieurs créneaux |
| Pose de verrou | IX-03 | Verrouiller une séance pour édition exclusive |
| Conflit visuel | IX-04 | Affichage d'un conflit de créneau (salle/enseignant/groupe) |
| Thème Ramadan | IX-05 | Basculement entre thème Normal et Ramadan |
| Filtres | IX-06 | Filtrage des séances par jour, enseignant, groupe, salle |
| Transitions d'état | IX-07 | Boutons de validation/rejet selon le rôle et l'état |
| Export | IX-08 | Génération et téléchargement d'un export |

### 4.4 Scénarios E2E à automatiser

| Scénario | Parcours | Vérifications |
|----------|----------|---------------|
| Connexion réussie | UF-01 | Redirection vers le dashboard, affichage des informations utilisateur |
| Création de version complète | UF-02 → UF-03 → UF-04 → UF-05 → UF-06 → UF-07 → UF-08 | Version passe par tous les états : initial → rep_pedag → brouillon → generation → edition → valid_pedag → valid_dir → valide → publie |
| Génération CP-SAT | UF-04 | Lancement, affichage de la progression, scénarios disponibles |
| Sélection de scénario | UF-05 | Création d'une version en édition avec les séances du scénario |
| Édition avec verrou | UF-06 + IX-03 | Verrou posé, modification possible, expiration du bail |
| Conflit de créneau | UF-06 + IX-04 | Déploiement bloqué, message d'erreur affiché |
| Publication et export | UF-08 → UF-10 | Version publiée, export généré et téléchargeable |
| Thème Ramadan | IX-05 | Changement de thème, couleurs adaptées, WCAG AA respecté |
| Accès non autorisé | UF-07 (rôle rdep tente valider) | 403, message d'erreur, redirection |

### 4.5 Exemple de structure de test E2E

```
tests/
  e2e/
    auth.e2e.ts                    # UF-01
    versions.e2e.ts                # UF-02, UF-09
    workflow.e2e.ts                # UF-03, UF-07, UF-08
    generation.e2e.ts              # UF-04, UF-05
    planning.e2e.ts                # UF-06, IX-01 à IX-04
    exports.e2e.ts                 # UF-10, IX-08
    import.e2e.ts                  # UF-11
    audit.e2e.ts                   # UF-12
    theme.e2e.ts                   # IX-05
    permissions.e2e.ts             # Vérification des droits par rôle
```



---

## 5. Tests de performance

### 5.1 Objectifs de performance (ST_TAKT.md §5.6)

| Métrique | Objectif | Test associé |
|----------|----------|--------------|
| Chargement initial SPA | < 3 secondes | Lighthouse / Playwright |
| Réponse API (lecture) | < 200 ms (p95) | Tests d'intégration API |
| Réponse API (écriture) | < 500 ms (p95) | Tests d'intégration API |
| Génération CP-SAT | < 5 minutes pour version standard | Test de performance génération |
| Export XLSX/PDF | < 30 secondes | Test de performance export |
| Utilisateurs concurrents | 50 simultanés | Test de charge |

### 5.2 Scénarios de performance

| Scénario | Description | Seuils |
|----------|-------------|--------|
| Génération CP-SAT | Version avec 200+ séances | < 5 min |
| Export XLSX | Version publiée complète | < 30 s |
| Export PDF | Version publiée complète | < 30 s |
| Chargement grille EDT | Affichage d'une version avec séances | < 3 s |
| Connexion simultanée | 50 utilisateurs connectés | Aucune erreur 5xx |

---

## 6. Tests de sécurité

### 6.1 Authentification

| Test | Description |
|------|-------------|
| Hachage argon2id | Mot de passe jamais stocké en clair |
| JWT access token | Durée de vie 15 min, expiration vérifiée |
| JWT refresh token | Durée de vie 7 j, rotation à chaque usage |
| Stockage cookie | HttpOnly, Secure, SameSite=Strict |
| Tentatives de connexion | Rate limiting par IP et par utilisateur |

### 6.2 Contrôle d'accès (RBAC)

| Test | Description |
|------|-------------|
| Matrice rôle × état | Vérification des 10 états × 4 rôles (ST_TAKT §5.3) |
| Département non autorisé | Accès refusé aux données d'un autre département |
| Forçage de verrou | Seulement `admin` peut forcer un verrou |
| Route protégée | Accès sans token retourne 401 |

### 6.3 Sécurité des données

| Test | Description |
|------|-------------|
| Immutabilité publiée | Une version `publie` ne peut que passer en `archive` |
| Journal d'audit immuable | Pas de DELETE/UPDATE sur JournalAudit |
| Export autorisé | Seuls les utilisateurs autorisés peuvent télécharger les exports |
| Fichiers dérivés CP-SAT | Aucun accès direct au solver depuis l'extérieur du worker |

---

## 7. Couverture de tests

### 7.1 Cibles de couverture

| Niveau | Cible | Mesure |
|--------|-------|--------|
| Tests unitaires + intégration | ≥ 80 % de lignes couvertes | UI_FRONTEND_SPECS.md |
| Services critiques | 100 % des branches | Authentification, workflow, conflits |
| Parcours E2E | 100 % des parcours critiques | 12 parcours UF-* |

### 7.2 Services critiques (couverture 100 % branches)

1. **Authentification** : hachage argon2id, génération/validation JWT, refresh rotatif
2. **Workflow** : 19 transitions, matrice rôle × état
3. **Contrôle des conflits** : double affectation salle/enseignant/groupe, verrous
4. **Génération CP-SAT** : construction du fichier dérivé, parsing des scénarios
5. **Bail d'édition** : pose, renouvellement, expiration, forçage

---

## 8. Intégration CI/CD

### 8.1 Pipeline CI (PLAN_MACRO E5.4, E1.6)

| Étape | Outil | Commande | Condition de succès |
|-------|-------|----------|---------------------|
| Lint | ESLint | `pnpm lint` | Aucune erreur |
| Typecheck | TypeScript | `pnpm typecheck` | Aucune erreur de type |
| Build | Vite / NestJS | `pnpm build` | Build réussit |
| Tests unitaires | Vitest | `pnpm test:unit` | Tous les tests passent, coverage ≥ 80 % |
| Tests d'intégration | Vitest + DB de test | `pnpm test:integration` | Tous les tests passent |
| Tests E2E | Playwright | `pnpm test:e2e` | Tous les parcours critiques passent |
| Build Docker | Docker | `docker-compose build` | Image construite |

### 8.2 Seuil de blocage

Le pipeline est bloqué si :
- Un test unitaire ou d'intégration échoue
- La couverture des services critiques est < 100 %
- Un test E2E sur un parcours critique échoue
- Le lint ou le typecheck échoue

---

## 9. Données de test

### 9.1 Seeds de référence (`SEED_DATA.sql`)

Un jeu de données minimal est injecté pour les tests d'intégration et E2E, incluant :
- 1 année universitaire, 2 semestres
- 3 départements (ex: Informatique, Mathématiques, Physique)
- 4 utilisateurs (1 par rôle : admin, gest, rdep, dir)
- Plusieurs enseignants, groupes, salles, matières
- 1 version en état `initial` pour les tests de workflow

### 9.2 Réinitialisation

La base de données de test est réinitialisée (migrations + seeds) avant chaque suite de tests d'intégration et avant chaque scénario E2E.

---

**Fin du plan de tests E0.7 — TESTS.md**  
*Document validé par l'Architecte et le QA avant passage en phase E1.*

