# Spécification technique — TAKT (ST_TAKT.md)

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques  
**Version :** 0.1 (E0.4 — validé)  
**Date :** 30 octobre 2026  
**Responsables :** Architecte + Frontend Lead + Backend Lead  
**Statut :** Phase 0 (E0.4) — Validé  
**Critère de sortie :** Architecture, modèle de données, contrats API, algorithmes, sécurité figés  
**Documents liés :** SF_TAKT.md, WORKFLOW_METIER.md, UI_ARBORESCENCE.md (E0.3a), UI_USER_FLOWS.md (E0.3b), UI_WIREFRAMES.md (E0.3c), UI_INTERACTIONS.md (E0.3d), UI_DESIGN_TOKENS.md (E0.3e), UI_FRONTEND_SPECS.md (E0.3f)

---

**Convention d'identification.**
- Chaque exigence technique porte un code stable `TE-<DOMAINE>-<NN>` (ex: `TE-ARCH-01`, `TE-DB-02`).
- Les exigences fonctionnelles de la SF sont citées par leur code `EX-*`.
- Les décisions d'architecture sont tracées dans le Decision Log (§6) par `DL-TE-*`.

---

## §0. Cadrage, décisions et hypothèses

### 0.1 Stack technique retenue

| Couche | Technologie | Version | Justification |
|--------|-------------|---------|---------------|
| Frontend | React | 18.3 | Écosystème mature, compatibilité @dnd-kit (E0.3f §1) |
| Frontend | TypeScript | 5.5 | Typage statique, détection précoce des erreurs |
| Frontend build | Vite | 5.4 | Build rapide, HMR |
| Frontend paquets | pnpm | 9.x | Installation rapide, workspaces |
| Frontend styling | CSS custom properties + PostCSS | — | Design tokens E0.3e, préfixes |
| Frontend état | Zustand | 4.x | Store léger, intégration React |
| Frontend requêtes | TanStack Query | 5.x | Cache, synchronisation, retry, mutations |
| Frontend drag&drop | @dnd-kit | 6.x | Grille EDT interactive (DL-WF-01) |
| Frontend formulaires | React Hook Form | 7.x | Validation, gestion erreurs, performance |
| Frontend validation | Zod | 3.x | Schémas partagés frontend/backend |
| Frontend routing | React Router | 6.x | Routage déclaratif, guards, lazy loading |
| Frontend tests | Vitest + Testing Library | 2.x | Tests unitaires et d'intégration |
| Frontend E2E | Playwright | 1.4x | Tests navigateur, parcours critiques |
| Backend | Node.js | 24 LTS | Runtime unifié avec le frontend |
| Backend framework | NestJS | 10+ | Monolithe modulaire, OpenAPI (@nestjs/swagger) |
| Base de données | PostgreSQL | 16 | Robuste, JSONB pour audit, pg-boss |
| ORM | Prisma | 8 | Contrat `prisma/contract.prisma`, client `@takt/db` |
| Moteur planification | CP-SAT | — | Solver externe, fichiers dérivés uniquement (EX-PRI-01) |
| Asynchrone | pg-boss | — | File de jobs dans PostgreSQL |
| Temps réel | SSE | — | Suivi des générations, exports, notifications |
| Hébergement | Sur site, réseau interne | — | Nginx reverse proxy, Docker Compose, secrets fichiers |
| Authentification | argon2id + JWT | — | Accès court 15 min + refresh rotatif 7 j |
| Notifications | SMTP institutionnel | `cck.rnu.tn` | E-mails institutionnels |
| Exports | ExcelJS + Playwright/Chromium | — | XLSX, rendu HTML → PDF |

### 0.2 Décisions structurantes

| # | Décision | Conséquence technique |
|---|----------|----------------------|
| B1 | Séance = créneau hebdomadaire récurrent par semestre | Pas de dates dans `Seance` : `jour` + `creneauDebut` + `nbCreneaux`. Alignement natif avec le solver. |
| B2 | Une version = un semestre, toute l'institution | Un seul profil de génération par version. Une seule version `publie` par semestre. Validation par les responsables de chaque département concerné. |
| B3 | Publication = statut interne | Aucun portail public ni compte enseignant/étudiant. Diffusion par exports uniquement (EX-PRI-04, DL-04). |
| B4 | Répartition = snapshot immuable | Chaque version référence ses snapshots de répartition. Pas de recalcul rétroactif (EX-PRI-02). |
| B5 | Import depuis année clôturée limité aux données de base | Copie sélective par type de donnée, avec aperçu, conservation du lien `originId`. |
| B6 | Charge horaire entièrement paramétrable | Jeu de règles configurables, verrouillé une fois la répartition validée (`rep_pedag` → `brouillon`). |
| B7 | Génération conditionnée | Tous les départements doivent avoir validé leur répartition avant lancement (EX-PRI-08, DL-08). |
| B8 | Solver CP-SAT externe | Le solver reçoit uniquement des fichiers dérivés, n'accède jamais à la base métier (EX-PRI-01, DL-01). |

### 0.3 Hypothèses ouvertes

| # | Question ouverte | Décision attendue | Responsable |
|---|------------------|-------------------|-------------|
| EX-OUV-01 | Seuil de verrouillage maximal avant génération CP-SAT déclarée risquée | 75 % des séances verrouillées | Architecte |
| EX-OUV-02 | Une version `archive` peut-elle être dupliquée pour créer un nouveau semestre vers `initial` | Oui | MOA |
| EX-OUV-03 | Les notifications de rejet incluent-elles le motif détaillé | Oui, texte libre obligatoire | MOA |
| EX-OUV-04 | Le rôle `initial` peut-il être créé par `gest` ou seulement par `admin` | `admin` et `gest` | MOA |

---

## §1. Architecture et composants techniques

### 1.1 Vue d'ensemble des couches

```
┌─────────────────────────────────────────────────────────────┐
│  Présentation  │ React 18 + TypeScript + Vite (E0.3f §1)   │
├─────────────────────────────────────────────────────────────┤
│  Application   │ NestJS 10+ + TanStack Query client        │
├─────────────────────────────────────────────────────────────┤
│  Domaine       │ Workflow (10 états, 19 transitions)       │
│                │ Règles de planification (solver CP-SAT)   │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure│ PostgreSQL 16 + Prisma + pg-boss          │
│                │ Worker CP-SAT (conteneurisé, isolé)       │
│                │ Store fichiers (exports, XLSX/PDF)        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Composants techniques

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| Frontend SPA | React 18 + Vite | Interface utilisateur (29 écrans `EC-*`, voir UI_WIREFRAMES.md) |
| API Gateway | NestJS 10+ | Point d'entrée unique, authentification, routage vers les modules |
| Module Auth | NestJS + argon2id + JWT | Authentification locale, RBAC par département, gestion de session |
| Module Versions | NestJS + Prisma | Gestion du cycle de vie des versions (10 états, 19 transitions) |
| Module Répartition | NestJS + Prisma | Affectations pédagogiques, snapshot immuable, charges horaires |
| Module Planning | NestJS + Prisma | Séances, contraintes, verrous, grille EDT, conflits |
| Module Génération | Worker CP-SAT conteneurisé | Construction du fichier dérivé, appel solver, scénarios |
| Module Jobs | pg-boss (PostgreSQL) | File de jobs pour générations, exports, e-mails |
| Module Notifications | SSE + SMTP | Notifications in-app temps réel, e-mails institutionnels |
| Module Exports | ExcelJS + Playwright/Chromium | Génération XLSX, PDF, .ics |
| Module Audit | NestJS + Prisma | Journal d'audit (action, horodatage, utilisateur, entité, JSONB) |
| Store fichiers | Système de fichiers local | Stockage des exports et fichiers dérivés du solver |

### 1.3 Flux de génération CP-SAT

| Étape | Composant | Action |
|-------|-----------|--------|
| 1 | Frontend | `gest` clique sur "Lancer génération" (`EC-GES-04`) |
| 2 | API | Vérification des prérequis : tous départements validés, pas de verrou bloquant |
| 3 | API | Création d'un job pg-boss, snapshot immuable de la version |
| 4 | Worker | Construction du fichier dérivé (séances, contraintes, verrous) |
| 5 | Worker | Appel au solver CP-SAT (isolé, pas d'accès à la base métier) |
| 6 | Worker | Récupération des scénarios avec scores (global 0-100, sous-scores) |
| 7 | SSE | Notification temps réel au `gest` : progression, scénarios disponibles |
| 8 | Frontend | `gest` sélectionne le scénario (`EC-GES-05`), création d'une version en édition |

### 1.4 Flux de publication

| Étape | Composant | Action |
|-------|-----------|--------|
| 1 | Frontend | `gest` clique sur "Publier" (`EC-GES-09`) |
| 2 | API | Vérification : état `valide`, direction validée |
| 3 | API | Passage à `publie`, activation de l'immutabilité (EX-PRI-02) |
| 4 | SSE | Notification aux utilisateurs concernés |
| 5 | Frontend | `gest` génère les exports (`EC-GES-11`) |

### 1.5 Intégration avec les livrables UI

| Livrable UI | Référence SF | Intégration technique |
|-------------|--------------|----------------------|
| UI_ARBORESCENCE.md | EX-UI-01 | 29 écrans `EC-*`, mapping rôle → écran |
| UI_USER_FLOWS.md | EX-UI-02 | 12 parcours `UF-*`, séquences d'actions |
| UI_WIREFRAMES.md | EX-UI-03 | Maquettes basse fidélité, composants par écran |
| UI_INTERACTIONS.md | EX-UI-04 | 37 interactions `IX-*`, drag&drop, verrous, conflits |
| UI_DESIGN_TOKENS.md | EX-UI-05 | Tokens Normal/Ramadan, WCAG AA, thème Ramadan |

### Règles d'architecture

| Règle | Description |
|-------|-------------|
| `TE-ARCH-01` | Le solver CP-SAT n'a jamais d'accès direct à la base métier (EX-PRI-01) |
| `TE-ARCH-02` | Toute modification de version déclenche un nouveau cycle de validation complet (EX-PRI-07) |
| `TE-ARCH-03` | Une version publiée est immuable : seule transition possible vers `archive` (DL-05) |
| `TE-ARCH-04` | Le bail d'édition est exclusif (30 min, renouvelable, forçage par admin) |
| `TE-ARCH-05` | Les exports sont générés asynchronement via pg-boss, notification par SSE |

---

## §2. Modélisation de la base de données

### 2.1 Tables principales

| Table | Description | Clé primaire | Contraintes clés |
|-------|-------------|--------------|------------------|
| `Utilisateur` | Comptes applicatifs (admin, gest, rdep, dir) | `id` (UUID) | email unique, rôle, département_id (nullable pour admin/dir) |
| `Role` | Référentiel des rôles | `id` (UUID) | code unique (`admin`, `gest`, `rdep`, `dir`) |
| `Departement` | Référentiel des départements | `id` (UUID) | code unique, libellé |
| `AnneeUniversitaire` | Années académiques | `id` (UUID) | libellé unique, dates début/fin |
| `Semestre` | Semestres (1 ou 2 par année) | `id` (UUID) | numéro, année_id |
| `Version` | Version de planning pour un semestre | `id` (UUID) | semestre_id, état (`initial`…`archive`), snapshot_id |
| `Snapshot` | Snapshot immuable des données d'une version | `id` (UUID) | version_id, données JSONB, hash |
| `AffectationPedagogique` | Enseignant ↔ Matière ↔ Groupe, volume horaire | `id` (UUID) | semestre_id, departement_id, enseignant_id, matiere_id, groupe_id |
| `Seance` | Séance de cours (créneau récurrent) | `id` (UUID) | version_id, jour, creneau_debut, nb_creneaux, salle_id, enseignant_id, groupe_id, activite_id |
| `VerrouSeance` | Verrou sur une séance (créneau, salle, enseignant, activité) | `id` (UUID) | seance_id, utilisateur_id, type, heure_pose, heure_expiration |
| `Contrainte` | Contrainte de planification (indisponibilité, exigence salle) | `id` (UUID) | version_id, type, cible_id, valeur |
| `Generation` | Job de génération CP-SAT | `id` (UUID) | version_id, statut, fichier_derives_id, scores JSONB |
| `Scenario` | Scénario produit par le solver | `id` (UUID) | generation_id, score_global, sous_scores JSONB, selectionne (booléen) |
| `Export` | Fichier d'export généré | `id` (UUID) | version_id, format (xlsx/pdf/ics), chemin_fichier, date_generation |
| `JournalAudit` | Journal d'audit | `id` (UUID) | action, horodatage, utilisateur_id, entité, entité_id, métadonnées JSONB |

### 2.2 Schéma Prisma (extrait clé)

```prisma
model Version {
  id          String      @id @default(uuid()) @db.Uuid
  semestreId  String      @db.Uuid
  etat        String      // initial, rep_pedag, brouillon, generation, edition, valid_pedag, valid_dir, valide, publie, archive
  snapshotId  String?     @db.Uuid
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  semestre    Semestre    @relation(fields: [semestreId], references: [id])
  snapshot    Snapshot?   @relation(fields: [snapshotId], references: [id])
  seances     Seance[]
  generations Generation[]
  exports     Export[]

  @@index([semestreId])
  @@index([etat])
}

model Seance {
  id             String      @id @default(uuid()) @db.Uuid
  versionId      String      @db.Uuid
  jour           Int         // 1=lundi … 6=samedi
  creneauDebut   Int         // index du créneau (0-based par jour)
  nbCreneaux     Int         // nombre de créneaux consécutifs
  salleId        String?     @db.Uuid
  enseignantId   String?     @db.Uuid
  groupeId       String?     @db.Uuid
  activiteId     String?     @db.Uuid
  estVerrouillee Boolean     @default(false)

  version        Version     @relation(fields: [versionId], references: [id])
  verrous        VerrouSeance[]

  @@index([versionId])
  @@unique([versionId, jour, creneauDebut, nbCreneaux])
}

model VerrouSeance {
  id             String      @id @default(uuid()) @db.Uuid
  seanceId       String      @db.Uuid
  utilisateurId  String      @db.Uuid
  type           String      // CRENEAU, SALLE, ENSEIGNANT, ACTIVITE
  heurePose      DateTime    @default(now())
  heureExpiration DateTime  // +30 min par défaut

  seance         Seance      @relation(fields: [seanceId], references: [id])
  utilisateur    Utilisateur @relation(fields: [utilisateurId], references: [id])
}

model Generation {
  id             String      @id @default(uuid()) @db.Uuid
  versionId      String      @db.Uuid
  statut         String      // EN_COURS, TERMINEE, ECHEC
  fichierDerivesId String?   @db.Uuid
  scores         Json        // score_global, sous_scores
  createdAt      DateTime    @default(now())

  version        Version     @relation(fields: [versionId], references: [id])
  scenarios      Scenario[]

  @@index([versionId])
  @@index([statut])
}

model JournalAudit {
  id             String      @id @default(uuid()) @db.Uuid
  action         String      // ex: VERSION_TRANSITION, SEANCE_DEPLACEE, VERROU_POSE, EXPORT_GENERE
  horodatage     DateTime    @default(now())
  utilisateurId  String?     @db.Uuid
  entite         String      // ex: Version, Seance, Export
  entiteId       String?
  metadonnees    Json?       // métadonnées optionnelles (motif de rejet, etc.)

  utilisateur    Utilisateur? @relation(fields: [utilisateurId], references: [id])

  @@index([horodatage])
  @@index([action])
}
```

### 2.3 Contraintes d'intégrité

| Contrainte | Description | Table |
|------------|-------------|-------|
| `TE-DB-01` | `email` unique dans `Utilisateur` | Utilisateur |
| `TE-DB-02` | `code` unique dans `Role` et `Departement` | Role, Departement |
| `TE-DB-03` | Unicité `(versionId, jour, creneauDebut, nbCreneaux)` dans `Seance` | Seance |
| `TE-DB-04` | `heureExpiration` > `heurePose` dans `VerrouSeance` | VerrouSeance |
| `TE-DB-05` | Seule une version `publie` par semestre | Version (logique applicative) |
| `TE-DB-06` | `etat` de `Version` doit être parmi les 10 états autorisés | Version (CHECK SQL) |
| `TE-DB-07` | Journal d'audit immuable (pas de DELETE, pas de UPDATE) | JournalAudit |
| `TE-DB-08` | Conservation des logs d'audit : 3 ans minimum | JournalAudit (politique de rétention) |

### 2.4 Index de performance

| Index | Table | Colonnes | Justification |
|-------|-------|----------|---------------|
| `idx_version_semestre_etat` | Version | `(semestreId, etat)` | Recherche rapide des versions par état |
| `idx_seance_version_jour` | Seance | `(versionId, jour)` | Affichage de la grille EDT par jour |
| `idx_verrou_seance_expiration` | VerrouSeance | `(heureExpiration)` | Nettoyage des baux expirés |
| `idx_generation_version_statut` | Generation | `(versionId, statut)` | Suivi des générations en cours |
| `idx_audit_horodatage_action` | JournalAudit | `(horodatage, action)` | Filtrage du journal d'audit |



---

## §3. Architecture des API

### 3.1 Style et protocole

| Élément | Choix | Justification |
|---------|-------|---------------|
| Style API | REST JSON | Simple, cacheable, bien outillé |
| Format des réponses | JSON enveloppé `{ data, error, meta }` | Cohérence, gestion centralisée des erreurs |
| Authentification | Bearer JWT (access + refresh) | Stateless, adapté au SPA |
| Versioning API | `/api/v1/` dans l'URL | Compatibilité ascendante |
| Documentation | OpenAPI 3.0 via Swagger | Génération automatique depuis NestJS |
| Schémas de validation | Zod partagés (frontend/backend) | Cohérence des contrats, détection précoce |

### 3.2 Endpoints par domaine

| Domaine | Endpoint | Méthode | Description | Schéma Zod |
|---------|----------|---------|-------------|------------|
| Auth | `/api/v1/auth/login` | POST | Connexion, retourne access + refresh token | `zLogin` |
| Auth | `/api/v1/auth/refresh` | POST | Renouvellement du token d'accès | `zRefresh` |
| Auth | `/api/v1/auth/logout` | POST | Invalidation du refresh token | — |
| Utilisateurs | `/api/v1/users` | GET | Liste des utilisateurs (filtres) | `zUserList` |
| Utilisateurs | `/api/v1/users/:id` | GET/PUT/DELETE | CRUD utilisateur | `zUser` |
| Versions | `/api/v1/versions` | GET/POST | Liste / création de versions | `zVersion` |
| Versions | `/api/v1/versions/:id` | GET/PUT/DELETE | Détail / modification / suppression | `zVersion` |
| Versions | `/api/v1/versions/:id/transition` | POST | Transition d'état (workflow 19 transitions) | `zTransition` |
| Séances | `/api/v1/seances` | GET | Liste des séances d'une version | `zSeanceList` |
| Séances | `/api/v1/seances` | POST | Création d'une séance | `zSeance` |
| Séances | `/api/v1/seances/:id` | PUT/PATCH/DELETE | Modification / suppression d'une séance | `zSeance` |
| Verrous | `/api/v1/locks` | POST | Pose d'un verrou sur une séance | `zLock` |
| Verrous | `/api/v1/locks/:id` | DELETE | Levée d'un verrou | — |
| Générations | `/api/v1/generations` | GET/POST | Liste / lancement d'une génération | `zGeneration` |
| Générations | `/api/v1/generations/:id/scenarios` | GET | Scénarios d'une génération | `zScenario` |
| Générations | `/api/v1/generations/:id/select` | POST | Sélection d'un scénario | `zScenarioSelect` |
| Exports | `/api/v1/exports` | GET/POST | Liste / lancement d'un export | `zExport` |
| Audit | `/api/v1/audit` | GET | Journal d'audit (filtres) | `zAudit` |

### 3.3 Enveloppe de réponse

```json
{
  "data": { ... },
  "error": null,
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-10-30T14:30:00Z",
    "page": 1,
    "pageSize": 20,
    "total": 150
  }
}
```

### 3.4 Gestion des erreurs HTTP

| Code HTTP | Signification | Corps de l'erreur | Utilisation |
|-----------|---------------|-------------------|-------------|
| 400 | Bad Request | `{ code: "VALIDATION_ERROR", details: [...] }` | Échec de validation Zod |
| 401 | Unauthorized | `{ code: "UNAUTHORIZED" }` | Token absent ou invalide |
| 403 | Forbidden | `{ code: "FORBIDDEN" }` | Rôle insuffisant ou département non autorisé |
| 404 | Not Found | `{ code: "NOT_FOUND" }` | Ressource inexistante |
| 409 | Conflict | `{ code: "WORKFLOW_INVALID_TRANSITION" }` | Transition d'état non autorisée |
| 423 | Locked | `{ code: "SEANCE_LOCKED" }` | Séance verrouillée par un autre utilisateur |
| 429 | Too Many Requests | `{ code: "RATE_LIMITED" }` | Limite de requêtes dépassée |
| 500 | Internal Server Error | `{ code: "INTERNAL_ERROR" }` | Erreur inattendue |

### 3.5 Règles d'API

| Règle | Description |
|-------|-------------|
| `TE-API-01` | Tous les endpoints (sauf auth/public) nécessitent un JWT valide |
| `TE-API-02` | Validation des entrées via schémas Zod avant tout traitement métier |
| `TE-API-03` | Les transitions d'état vérifient les droits du rôle (DL-TE-01 à DL-TE-08) |
| `TE-API-04` | Le bail d'édition est vérifié à chaque modification de séance |
| `TE-API-05` | Les événements importants sont journalisés dans `JournalAudit` |
| `TE-API-06` | Les réponses d'erreur n'exposent jamais de stack trace ni de détails internes |


---

## §4. Logique métier et algorithmes

### 4.1 Workflow des versions (19 transitions)

Les 10 états et 19 transitions sont définis dans `WORKFLOW_METIER.md`. Chaque transition est exposée via l'endpoint `POST /api/v1/versions/:id/transition` et vérifiée par le serveur selon le rôle de l'utilisateur et l'état courant.

| État | Rôles autorisés pour entrer | Transitions sortantes principales |
|------|----------------------------|----------------------------------|
| `initial` | admin, gest | `créer_répartition` → `rep_pedag` |
| `rep_pedag` | admin, gest, rdep | `valider_répartition` → `brouillon` ; `rejeter` → `initial` |
| `brouillon` | admin, gest | `lancer_génération` → `generation` |
| `generation` | système (worker) | `génération_terminée` → `edition` ; `échec` → `brouillon` |
| `edition` | admin, gest | `modifier_séance` → `edition` ; `valider` → `valid_pedag` |
| `valid_pedag` | rdep | `valider` → `valid_dir` ; `rejeter` → `brouillon` |
| `valid_dir` | dir | `valider` → `valide` ; `rejeter` → 'rep_pedag' (pédagogique) ou → 'edition' (planning) |
| `valide` | admin, gest | `publier` → `publie` |
| `publie` | admin, gest | `archiver` → `archive` |
| `archive` | admin | `réactiver` → `initial` |

### 4.2 Logique de génération CP-SAT

| Étape | Détails |
|-------|---------|
| Entrée | Version en état `brouillon`, tous départements validés, affectations pédagogiques, séances, contraintes, verrous |
| Fichier dérivé | Construction d'un fichier plat (JSON/CSV) contenant : séances, créneaux, salles, enseignants, groupes, activités, contraintes de disponibilité, verrous actifs |
| Solver | CP-SAT externe, conteneurisé, aucun accès à la base métier (EX-PRI-01) |
| Sortie | Scénarios avec score global (0-100) et sous-scores (respect créneaux, respect salles, respect enseignants, couverture) |
| Sélection | `gest` choisit un scénario via l'UI ; création d'une version en édition avec les séances du scénario |
| Nombre max de scénarios | Configurable (défaut : 3 scénarios retournés) |

### 4.3 Contrôle des conflits

| Type de conflit | Détection | Action |
|-----------------|-----------|--------|
| Double affectation salle | Deux séances same `jour`, `creneauDebut`, `salleId` | Blocage à la création/modification, affichage visuel (IX-*) |
| Double affectation enseignant | Deux séances same `jour`, `creneauDebut`, `enseignantId` | Blocage, notification |
| Double affectation groupe | Deux séances same `jour`, `creneauDebut`, `groupeId` | Blocage, notification |
| Conflit avec verrou | Modification d'une séance verrouillée par un autre utilisateur | Erreur 423, message indiquant le détenteur du bail |
| Charge horaire dépassée | Somme des séances > volume horaire de l'affectation | Avertissement, blocage si strict |

### 4.4 Couverture 100 %

La couverture 100 % signifie que chaque séance planifiée correspond à une affectation pédagogique validée, sans séance orpheline ni affectation non couverte.

| Règle | Description |
|-------|-------------|
| `TE-MET-01` | Avant passage en `generation`, vérification que toutes les affectations ont des séances associées |
| `TE-MET-02` | Avant publication, vérification que le nombre total de séances couvre 100 % des volumes horaires déclarés |
| `TE-MET-03` | Toute séance créée doit être liée à une affectation existante |
| `TE-MET-04` | Suppression d'une affectation supprime les séances liées (cascade avec vérification) |

### 4.5 Bail d'édition

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| Durée initiale | 30 minutes | Temps d'exclusivité sur une séance |
| Renouvellement | Automatique à chaque activité sur la séance | Prolonge le bail de 30 min |
| Forçage | Par `admin` uniquement | Libération d'un verrou abandonné |
| Nettoyage | Tâche planifiée toutes les 5 minutes | Supprime les baux expirés |

### 4.6 Règles métier

| Règle | Description |
|-------|-------------|
| `TE-MET-05` | Seuls les utilisateurs du département peuvent créer/modifier les séances de ce département |
| `TE-MET-06` | Une version `publie` est immuable : seule transition possible vers `archive` |
| `TE-MET-07` | Toute modification d'une version validée (`valide`) repasse la version en `brouillon` |
| `TE-MET-08` | La génération CP-SAT nécessite que tous les départements aient validé leur répartition |
| `TE-MET-09` | Les exports sont générés depuis la version `publie` uniquement |
| `TE-MET-10` | L'import depuis une année clôturée copie sélectivement les données de base avec aperçu avant confirmation |


---

## §5. Sécurité et performances

### 5.1 Authentification

| Composant | Choix | Paramètres |
|-----------|-------|------------|
| Hachage mots de passe | argon2id | Coût configuré pour ~100 ms par hash |
| Token d'accès | JWT | Durée de vie 15 minutes |
| Token de rafraîchissement | JWT rotatif | Durée de vie 7 jours, rotation à chaque usage |
| Stockage côté client | HttpOnly cookies | `Secure`, `SameSite=Strict` |
| Politique de mot de passe | Minimum 12 caractères, complexité recommandée | Vérification côté serveur |

### 5.2 Contrôle d'accès (RBAC)

| Rôle | Permissions principales | Département |
|------|------------------------|-------------|
| `admin` | Tous, gestion utilisateurs, forçage de verrous | Tous / aucun |
| `gest` | Gestion versions, séances, générations, exports de son département | Un ou plusieurs assignés |
| `rdep` | Validation répartition pédagogique de son département | Un département |
| `dir` | Validation direction, validation finale | Tous les départements de l'institution |

### 5.3 Contrôle d'accès par état de version

| État | `gest` | `rdep` | `dir` | `admin` |
|------|--------|--------|-------|---------|
| `initial` | Créer répartition | — | — | Tous |
| `rep_pedag` | Voir, valider/rejeter répartition | Valider/rejeter | — | Tous |
| `brouillon` | Créer/modifier séances, lancer génération | — | — | Tous |
| `generation` | Voir progression | Voir | Voir | Tous |
| `edition` | Modifier séances | — | — | Tous |
| `valid_pedag` | — | Valider / rejeter | — | Tous |
| `valid_dir` | — | — | Valider / rejeter | Tous |
| `valide` | Publier | — | — | Tous |
| `publie` | Voir, exporter, archiver | Voir, exporter | Voir, exporter | Tous |
| `archive` | Voir | Voir | Voir | Tous, réactiver |

### 5.4 Journal d'audit

| Élément | Description |
|---------|-------------|
| Entités auditées | `Version`, `Seance`, `VerrouSeance`, `Generation`, `Export`, `Utilisateur` |
| Actions auditées | `CREATE`, `UPDATE`, `DELETE`, `TRANSITION`, `LOCK`, `UNLOCK`, `EXPORT`, `LOGIN`, `LOGOUT` |
| Champs | `action`, `horodatage`, `utilisateur_id`, `entite`, `entite_id`, `metadonnees` (JSONB) |
| Immutabilité | Pas de DELETE, pas de UPDATE sur `JournalAudit` |
| Rétention | 3 ans minimum |

### 5.5 Sécurité réseau et hébergement

| Élément | Choix |
|---------|-------|
| Hébergement | Sur site, réseau interne institutionnel |
| Reverse proxy | Nginx |
| Conteneurisation | Docker Compose |
| Secrets | Fichiers secrets (pas de variables d'environnement en clair) |
| CORS | Origines restreintes au domaine interne |
| Rate limiting | Par IP et par utilisateur (fenêtre glissante) |

### 5.6 Performances

| Métrique | Objectif | Mesure |
|----------|----------|--------|
| Chargement initial SPA | < 3 secondes | Lighthouse |
| Réponse API (lecture) | < 200 ms (p95) | Métriques NestJS |
| Réponse API (écriture) | < 500 ms (p95) | Métriques NestJS |
| Génération CP-SAT | < 5 minutes pour version standard | Temps du worker |
| Export XLSX/PDF | < 30 secondes | Temps de génération |
| Utilisateurs concurrents | 50 simultanés | Tests de charge |

### 5.7 Règles de sécurité

| Règle | Description |
|-------|-------------|
| `TE-SEC-01` | Aucun accès direct au solver CP-SAT depuis l'extérieur du worker (EX-PRI-01) |
| `TE-SEC-02` | Les mots de passe sont hachés avec argon2id, jamais stockés en clair |
| `TE-SEC-03` | Les tokens JWT sont signés avec une clé secrète stockée en fichier |
| `TE-SEC-04` | Le contrôle d'accès par département est vérifié à chaque requête mutative |
| `TE-SEC-05` | Le journal d'audit est immuable et conservé 3 ans |
| `TE-SEC-06` | Les exports sont générés asynchronement et accessibles uniquement aux utilisateurs autorisés |


---

## §6. Risques, plan de livraison, spikes et décision log

### 6.1 Tableau des risques

| Risque | Probabilité | Impact | Atténuation | Responsable |
|--------|-------------|--------|-------------|-------------|
| Solver CP-SAT trop lent sur de grosses versions | Moyenne | Élevé | Spikes de performance, limite du nombre de séances par génération, scénarios limités à 3 | Backend Lead |
| Conflits de verrous fréquents en édition | Moyenne | Moyen | Bail 30 min renouvelable, forçage admin, UI affichage des verrous en temps réel | Frontend Lead |
| Cohérence frontend/backend sur les schémas Zod | Faible | Élevé | Génération automatique des schémas partagés, tests d'intégration | Fullstack |
| Import depuis année clôturée partiel ou erroné | Moyenne | Moyen | Aperçu avant confirmation, rollback, tests E2E sur l'import | Backend Lead |
| Thème Ramadan non respecté (WCAG AA) | Faible | Moyen | Revue design, tests d'accessibilité automatisés | Frontend Lead |

### 6.2 Plan de livraison par phase

| Phase | Objectif | Livrables clés | Cible |
|-------|----------|----------------|-------|
| E0.4 | Spécification technique figée | `ST_TAKT.md` | Oct 2026 |
| E1 | Squelette backend + auth | NestJS, Prisma, authentification JWT | Nov 2026 |
| E2 | Workflow versions + RBAC | 10 états, 19 transitions, contrôle d'accès | Déc 2026 |
| E3 | Gestion des séances et conflits | CRUD séances, détection conflits, verrous | Jan 2027 |
| E4 | Génération CP-SAT | Worker, fichier dérivé, scénarios, sélection | Fév 2027 |
| E5 | Frontend complet | 29 écrans `EC-*`, drag&drop, thème Ramadan | Mar 2027 |
| E6 | Exports et publication | XLSX, PDF, immutabilité publiée, archive | Avr 2027 |
| E7 | Recette et déploiement | Tests E2E, audit, documentation utilisateur | Mai 2027 |

### 6.3 Spikes (investigations préliminaires)

| Spike | Question | Durée cible | Livrable |
|-------|----------|-------------|----------|
| SPK-01 | Performance CP-SAT sur version réaliste (200+ séances) | 1 semaine | Rapport de performance, seuils recommandés |
| SPK-02 | Intégration @dnd-kit avec grille EDT complexe | 3 jours | Prototype de grille, validation UX |
| SPK-03 | Génération PDF fiable (emplois du temps multi-pages) | 2 jours | Prototype d'export PDF, validation mise en page |
| SPK-04 | Synchronisation SSE pour suivi des générations | 2 jours | Prototype de notification temps réel |

### 6.4 Decision Log (DL-TE)

| ID | Décision | Date | Statut | Contexte |
|----|----------|------|--------|----------|
| DL-TE-01 | Stack frontend : React 18 + TypeScript + Vite | Oct 2026 | Figé | E0.3f |
| DL-TE-02 | Stack backend : NestJS + PostgreSQL + Prisma | Oct 2026 | Figé | Compatibilité avec l'équipe |
| DL-TE-03 | Solver : CP-SAT (pas FET) | Oct 2026 | Figé | EX-PRI-01 |
| DL-TE-04 | Pas de portail public, diffusion par exports uniquement | Oct 2026 | Figé | EX-PRI-04 |
| DL-TE-05 | Version publiée = immuable, seule transition vers archive | Oct 2026 | Figé | EX-PRI-02 |
| DL-TE-06 | Bail d'édition : 30 min, renouvelable, forçage admin | Oct 2026 | Figé | DL-04 |
| DL-TE-07 | Auth : argon2id + JWT (15 min + refresh 7 j rotatif) | Oct 2026 | Figé | Sécurité |
| DL-TE-08 | Journal d'audit immuable, rétention 3 ans | Oct 2026 | Figé | Conformité |

---

**Fin de la spécification technique E0.4 — ST_TAKT.md**  
*Document validé par l'architecte, le Frontend Lead et le Backend Lead avant passage en E1.*

