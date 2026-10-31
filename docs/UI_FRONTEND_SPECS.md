# Spécifications frontend détaillées — TAKT (UI_FRONTEND_SPECS.md)

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques  
**Version :** 0.1 (E0.3f — validé)  
**Date :** 30 octobre 2026  
**Responsables :** Frontend Lead + UX Designer  
**Statut :** Phase 0 (E0.3f) — Validé  
**Critère de sortie :** Stack, composants, état, intégration API figés  
**Documents liés :** UI_ARBORESCENCE.md (E0.3a), UI_USER_FLOWS.md (E0.3b), UI_WIREFRAMES.md (E0.3c), UI_INTERACTIONS.md (E0.3d), UI_DESIGN_TOKENS.md (E0.3e)

---

**Convention d'identification.**
- Chaque spécification frontend porte un code stable `FS-<DOMAINE>-<NN>` (ex: `FS-STATE-01`, `FS-API-02`).
- Le code est cité dans les tâches de développement et les tests, jamais le numéro de section.

---

## §1. Stack technique frontend

| Couche | Technologie | Version | Justification |
|--------|-------------|---------|---------------|
| Framework | React | 18.3 | Écosystème mature, forte communauté, compatibilité avec dnd-kit |
| Langage | TypeScript | 5.5 | Typage statique, meilleure maintenabilité, détection précoce des erreurs |
| Build tool | Vite | 5.4 | Build rapide, HMR, configuration minimale |
| Gestionnaire de paquets | pnpm | 9.x | Installation rapide, gestion des workspaces |
| Styling | CSS custom properties + PostCSS | — | Design tokens (E0.3e), préprocesseur pour les préfixes |
| Gestion d'état | Zustand | 4.x | Store léger, API simple, bonne intégration React |
| Requêtes serveur | TanStack Query (React Query) | 5.x | Cache, synchronisation, retry, mutations optimistes |
| Drag&drop | @dnd-kit | 6.x | Décision DL-WF-01, grille EDT interactive |
| Formulaires | React Hook Form | 7.x | Validation, gestion des erreurs, performance |
| Validation | Zod | 3.x | Schémas de validation partagés frontend/backend |
| Routing | React Router | 6.x | Routage déclaratif, guards, lazy loading |
| Tests unitaires | Vitest | 2.x | Compatible Vite, rapide |
| Tests d'intégration | Testing Library + Vitest | — | Tests centrés utilisateur |
| Tests E2E | Playwright | 1.4x | Tests navigateur, couverture des parcours critiques |
| Linting | ESLint + TypeScript ESLint | — | Qualité de code, règles TS strictes |

---

## §2. Architecture composants

### Organisation des dossiers

```
src/
  components/
    atoms/          # Composants de base (Bouton, Input, Badge, Chip, etc.)
    molecules/      # Composants combinés (SearchBar, DataTableRow, etc.)
    organisms/      # Composants complexes (GrilleEDT, FormulaireContraintes, etc.)
    templates/      # Mises en page de page (Layout, Sidebar, Header, etc.)
    pages/          # Pages complètes (une par écran EC-*)
  hooks/
    useEdtGrid.ts   # Logique de la grille EDT
    useEditionLock.ts # Gestion du bail d'édition
    useVersion.ts   # Gestion de l'état de version
  stores/
    versionStore.ts # État global de la version courante
    userStore.ts    # État utilisateur (rôle, département, session)
  lib/
    api.ts          # Client HTTP (TanStack Query + Axios/Fetch)
    validation.ts   # Schémas Zod partagés
    tokens.ts       # Design tokens importés depuis packages/design-tokens/
  utils/
    conflict.ts     # Détection et résolution de conflits de séance
    lock.ts         # Utilitaires de verrouillage optimiste
```

### Règles de nommage

- Composants : `PascalCase` (ex: `GrilleEDT.tsx`, `BoutonSoumission.tsx`)
- Hooks : `usePascalCase` (ex: `useEdtGrid.ts`)
- Stores : `PascalCaseStore` (ex: `versionStore.ts`)
- Fichiers de test : `*.test.tsx` ou `*.test.ts`
- Fichiers de types : `*.types.ts`

### Principes de conception

- **Atomic Design** : atomes → molécules → organismes → templates → pages
- **Un composant = une responsabilité** : pas de composant « fourre-tout »
- **Props typées** : interfaces TypeScript explicites pour tous les props
- **États de composant** : `état vide`, `état chargé`, `état erreur`, `état loading`, `état succès` (cohérence avec UI_WIREFRAMES.md §2)
| Formatage | Prettier | — | Style de code uniforme |

**Dépendances clés :** `@dnd-kit/core`, `@dnd-kit/sortable`, `@tanstack/react-query`, `zustand`, `react-hook-form`, `zod`, `react-router-dom`.

---

## §3. Gestion d'état

### État global (Zustand)

| Store | Contenu | Persistance | Synchronisation |
|-------|---------|-------------|-----------------|
| `versionStore` | Version courante (ID, état workflow, scores, séances, verrous) | sessionStorage | TanStack Query (invalidation après mutation) |
| `userStore` | Utilisateur connecté (ID, email, rôle, département, token) | localStorage | Aucun (auth JWT côté client) |
| `uiStore` | Thème actif (normal/ramadan), sidebar ouverte, notifications | localStorage | Aucun |

### État local (React)

- Formulaires : `react-hook-form` avec schéma Zod
- Grille EDT : état local des positions de séances, verrous actifs
- Modals : état d'ouverture/fermeture local

### Règles d'état

| Règle | Description |
|-------|-------------|
| `FS-STATE-01` | La version courante est la source unique de vérité pour l'EDT |
| `FS-STATE-02` | Tout changement d'état de workflow passe par TanStack Query mutation |
| `FS-STATE-03` | Les séances non placées sont stockées séparément des séances placées |
| `FS-STATE-04` | Les verrous de séance sont stockés avec l'ID de l'utilisateur qui les a posés |
| `FS-STATE-05` | L'état `loading` est affiché pendant toute mutation en cours |

---

## §4. Intégration API

### Client HTTP

- **Base :** TanStack Query (React Query) pour les requêtes GET
- **Mutations :** `useMutation` pour POST/PUT/DELETE
- **Retry :** 3 tentatives avec backoff exponentiel (1s, 2s, 4s)
- **Cache :** 5 minutes de stale-time pour les données de référence
- **Invalidation :** manuelle après mutation réussie (ex: `invalidateQueries(['version'])`)

### Contrats API

| Endpoint | Méthode | Description | Schéma de validation |
|----------|---------|-------------|----------------------|
| `/api/versions` | GET | Liste des versions | `ZodVersionList` |
| `/api/versions/:id` | GET | Détail d'une version | `ZodVersion` |
| `/api/versions` | POST | Créer une version | `ZodVersionCreate` |
| `/api/versions/:id/state` | PATCH | Changer l'état de workflow | `ZodStateTransition` |
| `/api/sessions` | GET | Liste des séances d'une version | `ZodSessionList` |
| `/api/sessions/:id` | PATCH | Modifier une séance (déplacer, verrou) | `ZodSessionUpdate` |
| `/api/locks` | POST | Poser un verrou de séance | `ZodLockCreate` |
| `/api/locks/:id` | DELETE | Lever un verrou | — |
| `/api/generate` | POST | Lancer génération CP-SAT | `ZodGenerationRequest` |
| `/api/exports` | POST | Générer un export (XLSX, PDF, .ics) | `ZodExportRequest` |

### Gestion des erreurs API

| Code HTTP | Comportement UI |
|-----------|-----------------|

---

## §5. Routing et navigation

### Structure des routes

| Route | Composant | Guard | Rôle autorisé |
|-------|-----------|-------|---------------|
| `/login` | `EC-COM-01` | `GuestGuard` | Tous (non authentifiés) |
| `/dashboard` | `EC-COM-02` | `AuthGuard` | Tous |
| `/profile` | `EC-COM-03` | `AuthGuard` | Tous |
| `/admin/users` | `EC-ADM-01` | `AuthGuard` + `RoleGuard('admin')` | `admin` |
| `/admin/referentiels` | `EC-ADM-02` | `AuthGuard` + `RoleGuard('admin')` | `admin` |
| `/admin/params` | `EC-ADM-03` | `AuthGuard` + `RoleGuard('admin')` | `admin` |
| `/admin/audit` | `EC-ADM-04` | `AuthGuard` + `RoleGuard('admin')` | `admin` |
| `/ges/init` | `EC-GES-01` | `AuthGuard` + `RoleGuard('gest')` | `gest` |
| `/ges/plans` | `EC-GES-02` | `AuthGuard` + `RoleGuard('gest')` | `gest` |
| `/ges/constraints` | `EC-GES-03` | `AuthGuard` + `RoleGuard('gest')` | `gest` |
| `/ges/generate` | `EC-GES-04` | `AuthGuard` + `RoleGuard('gest')` | `gest` |
| `/ges/scenarios` | `EC-GES-05` | `AuthGuard` + `RoleGuard('gest')` | `gest` |
| `/ges/edt` | `EC-GES-06` | `AuthGuard` + `RoleGuard('gest')` + `EditionLockGuard` | `gest` |
| `/ges/conflicts` | `EC-GES-07` | `AuthGuard` + `RoleGuard('gest')` | `gest` |
| `/ges/submit` | `EC-GES-08` | `AuthGuard` + `RoleGuard('gest')` | `gest` |
| `/ges/publish` | `EC-GES-09` | `AuthGuard` + `RoleGuard('gest')` | `gest` |
| `/ges/archive` | `EC-GES-10` | `AuthGuard` + `RoleGuard('gest', 'admin')` | `gest`, `admin` |
| `/ges/exports` | `EC-GES-11` | `AuthGuard` + `RoleGuard('gest')` | `gest` |
| `/ges/locks` | `EC-GES-12` | `AuthGuard` + `RoleGuard('gest')` | `gest` |
| `/rdep/allocation` | `EC-RDEP-01` | `AuthGuard` + `RoleGuard('rdep')` + `DeptGuard` | `rdep` |
| `/rdep/charges` | `EC-RDEP-02` | `AuthGuard` + `RoleGuard('rdep')` + `DeptGuard` | `rdep` |
| `/rdep/validate` | `EC-RDEP-03` | `AuthGuard` + `RoleGuard('rdep')` | `rdep` |
| `/rdep/revalidate` | `EC-RDEP-04` | `AuthGuard` + `RoleGuard('rdep')` | `rdep` |
| `/rdep/consult` | `EC-RDEP-05` | `AuthGuard` + `RoleGuard('rdep')` | `rdep` |
| `/dir/scenario` | `EC-DIR-01` | `AuthGuard` + `RoleGuard('dir')` | `dir` |
| `/dir/decision` | `EC-DIR-02` | `AuthGuard` + `RoleGuard('dir')` | `dir` |
| `/dir/reject` | `EC-DIR-03` | `AuthGuard` + `RoleGuard('dir')` | `dir` |
| `/dir/archive` | `EC-DIR-04` | `AuthGuard` + `RoleGuard('dir')` | `dir` |
| `/dir/exports` | `EC-DIR-05` | `AuthGuard` + `RoleGuard('dir')` | `dir` |

### Guards

| Guard | Rôle | Description |
|-------|------|-------------|
| `AuthGuard` | Tous | Redirige vers `/login` si non authentifié |
| `GuestGuard` | Tous | Redirige vers `/dashboard` si déjà authentifié |
| `RoleGuard(role)` | Vérifie le rôle de l'utilisateur | Retourne 403 si le rôle ne correspond pas |
| `DeptGuard` | `rdep` | Vérifie que l'utilisateur accède à son propre département |
| `EditionLockGuard` | `gest` | Vérifie que le bail d'édition est acquis avant d'accéder à `EC-GES-06` |

### Lazy loading

Chaque page est chargée paresseusement via `React.lazy()` avec un composant `Skeleton` de chargement.

---

## §6. Formulaires et validation

### Schémas Zod partagés

| Schéma | Utilisé par | Champs validés |
|--------|-------------|----------------|
| `ZodVersionCreate` | `EC-GES-01` | année (number, 4 chiffres), semestre (1 ou 2) |
| `ZodSessionUpdate` | `EC-GES-06`, `EC-GES-07` | créneau, salle, enseignant, activité, verrous |
| `ZodLockCreate` | `EC-GES-08`, `EC-GES-12` | type (créneau/salle/enseignant/activité), portée |
| `ZodStateTransition` | `EC-GES-08`, `EC-RDEP-03`, `EC-DIR-02`, `EC-DIR-03` | état cible, motif (optionnel/obligatoire selon le rejet) |
| `ZodGenerationRequest` | `EC-GES-04` | versionId, options solver |
| `ZodExportRequest` | `EC-GES-11`, `EC-DIR-05` | format (xlsx/pdf/ics), versionId |

### Règles de formulaire

| Règle | Description |
|-------|-------------|
| `FS-FORM-01` | Chaque champ obligatoire affiche un astérisque rouge |
| `FS-FORM-02` | Les erreurs de validation s'affichent sous le champ concerné |
| `FS-FORM-03` | Le bouton de soumission est disabled tant que le formulaire n'est pas valide |
| `FS-FORM-04` | Les messages d'erreur utilisent le libellé + icône (pas la seule couleur) |
| `FS-FORM-05` | La validation se déclenche à la soumission (pas en temps réel à chaque frappe) |
| 400 | Message d'erreur de validation affiché sous le champ concerné |
| 401 | Redirection vers `EC-COM-01` (connexion) |
| 403 | Message « Accès non autorisé pour votre rôle » |

---

## §7. Grille EDT drag&drop

### Implémentation @dnd-kit

| Composant | Rôle |
|-----------|------|
| `DndContext` | Contexte global du drag&drop, encapsule toute la grille |
| `GridEDT` | Grille principale (créneaux × jours) |
| `SalleCarte` | Carte de séance déplaçable |
| `SalleNonPlacee` | Zone des séances non placées (droppable) |
| `CollisionDetector` | Détecte les collisions (verrous, conflits de créneau) |

### Comportement

| Action | Réaction |
|--------|----------|
| Glisser une séance sur un créneau libre | Prévisualisation (surbrillance du créneau cible) |
| Lâcher sur un créneau libre | Déplacement immédiat, recalcul des conflits |
| Glisser sur un créneau verrouillé | Surbrillance rouge, déplacement refusé au lâcher |
| Lâcher hors de la grille | Retour à la position initiale |
| Séance en conflit après déplacement | Badge d'alerte affiché, bouton « Résoudre le conflit » visible |

### Règles

| Règle | Description |
|-------|-------------|
| `FS-DND-01` | Un verrou de séance bloque le drag&drop sur cette séance |
| `FS-DND-02` | Un verrou de créneau/salle/enseignant bloque le dépôt sur ce créneau |
| `FS-DND-03` | Le recalcul des conflits se fait en temps réel pendant le drag |
| `FS-DND-04` | Le déplacement est annulé si un conflit dur est créé |
| `FS-DND-05` | Les séances `NON_PLACÉE` sont listées dans une zone dédiée |

---

## §8. Bail d'édition et contrôle optimiste

### Bail d'édition

| Composant | Rôle |
|-----------|------|
| `EditionLockIndicator` | Affiche le compte à rebours (30 min) et le statut du bail |
| `EditionLockRenewButton` | Bouton « Renouveler le bail » |
| `EditionLockForceRelease` | Bouton « Forcer la libération » (admin uniquement) |

### Logique

| Étape | Action |
|-------|--------|
| 1 | Ouverture de `EC-GES-06` → requête de bail d'édition (`POST /api/locks/edition`) |
| 2 | Si bail accordé → compte à rebours de 30 min démarré |
| 3 | Si bail détenu par un autre utilisateur → passage en lecture seule, message d'information |
| 4 | Clic « Renouveler » → prolongation de 30 min |
| 5 | Fermeture de l'onglet ou expiration → libération automatique du bail |

### Contrôle optimiste

| Situation | Comportement |
|-----------|--------------|
| Deux utilisateurs modifient la même séance | Second utilisateur reçoit une erreur 409 au moment de la sauvegarde |
| Conflit de version | Message : « Cette séance a été modifiée par un autre utilisateur. Veuillez recharger. » |
| Bail expiré pendant l'édition | Passage en lecture seule, invitation à renouveler ou recharger |
| 404 | Message « Ressource introuvable » |
| 409 | Conflit : message détaillant le conflit (verrou, doublon, etc.) |
| 422 | Erreur de validation métier (conflit de séance, couverture < 100 %) |
| 500 | Message générique « Erreur serveur », retry possible |

---

## §9. Accessibilité (WCAG AA)

| Règle | Implémentation |
|-------|----------------|
| `FS-A11Y-01` | Contraste minimum 4.5:1 pour le texte normal, 3:1 pour le texte large (vérifié sur les deux thèmes) |
| `FS-A11Y-02` | États jamais rendus par la seule couleur : libellé + icône obligatoire |
| `FS-A11Y-03` | Focus visible sur tous les éléments interactifs (anneau de focus 2px, couleur Primary) |
| `FS-A11Y-04` | Navigation clavier complète (Tab, Entrée, Espace, Échappement pour fermer modals) |
| `FS-A11Y-05` | Annonces lecteurs d'écran pour les changements d'état (ARIA-live) |
| `FS-A11Y-06` | Labels associés à tous les champs de formulaire |
| `FS-A11Y-07` | Pas de mode sombre en v1.0 (seuls Normal et Ramadan) |

---

## §10. Thème et design tokens

### Consommation des tokens

```ts
// src/lib/tokens.ts
export const tokens = {
  color: {
    primary: 'var(--dt-color-primary)',
    // ...
  },
  // ...
}
```

### Switch de thème

- Variable CSS `--dt-theme` sur l'élément racine (`normal` ou `ramadan`)
- Fichiers CSS séparés : `tokens-normal.css`, `tokens-ramadan.css`
- Préférence stockée dans `uiStore` (localStorage)

### Tokens utilisés par composant

| Composant | Tokens consommés |
|-----------|------------------|
| Bouton | `DT-COMP-01`, `DT-COMP-02`, `DT-COLOR-01/02/03`, `DT-BORDER-02` |
| Champ de saisie | `DT-COMP-03`, `DT-COLOR-08/09/10/11`, `DT-BORDER-01` |
| Carte | `DT-COLOR-05`, `DT-BORDER-02`, `DT-BORDER-06` |
| Grille EDT cellule | `DT-COMP-07`, `DT-COLOR-05/11` |
| Badge | `DT-COMP-06`, `DT-TYPO-08`, `DT-COLOR-20/21/22/23/24/25` |

---

## §11. Tests

### Tests unitaires (Vitest)

| Domaine | Cible | Couverture minimale |
|---------|-------|---------------------|
| Utilitaires de conflit | `src/utils/conflict.ts` | 90% |
| Utilitaires de verrou | `src/utils/lock.ts` | 90% |
| Schémas Zod | `src/lib/validation.ts` | 100% |
| Stores Zustand | `src/stores/*.ts` | 80% |

### Tests d'intégration (Testing Library)

| Scénario | Écran | Couverture |
|----------|-------|------------|
| Connexion réussie | `EC-COM-01` | ✅ |
| Connexion échouée | `EC-COM-01` | ✅ |
| Déplacer une séance | `EC-GES-06` | ✅ |
| Poser/lever un verrou | `EC-GES-12` | ✅ |
| Soumettre validation | `EC-GES-08` | ✅ |
| Rejet avec motif | `EC-DIR-03` | ✅ |

### Tests E2E (Playwright)

| Parcours | Écrans | Critère |
|----------|--------|---------|
| `UF-GES-01` → `UF-GES-03` | `EC-GES-01` → `EC-GES-04` | Création version, lancement génération |
| `UF-GES-04` → `UF-GES-06` | `EC-GES-05` → `EC-GES-08` | Sélection scénario, soumission |
| `UF-RDEP-01` → `UF-RDEP-02` | `EC-RDEP-01` → `EC-RDEP-03` | Saisie répartition, validation |
| `UF-DIR-01` | `EC-DIR-01` → `EC-DIR-03` | Validation ou rejet Direction |
| `UF-GES-07` | `EC-GES-09` → `EC-GES-11` | Publication, export |

**Couverture cible :** 80% de lignes couvertes par les tests unitaires + intégration, 100% des parcours critiques couverts par les tests E2E.

---

## §12. Decision Log Frontend

| # | Décision | Conséquence |
|---|----------|-------------|
| DL-FS-01 | React 18 + TypeScript + Vite | Stack moderne, typage statique, build rapide |
| DL-FS-02 | Zustand pour l'état global | Store léger, pas de boilerplate Redux |
| DL-FS-03 | TanStack Query pour les requêtes serveur | Cache, synchronisation, retry intégrés |
| DL-FS-04 | @dnd-kit pour la grille EDT | Dépendance DL-WF-01, gestion avancée des collisions |
| DL-FS-05 | React Hook Form + Zod pour les formulaires | Validation partagée frontend/backend, UX cohérente |
| DL-FS-06 | React Router pour le routage | Routage déclaratif, guards d'accès par rôle |
| DL-FS-07 | CSS custom properties pour les design tokens | Switch de thème instantané, pas de rechargement |
| DL-FS-08 | Vitest + Testing Library + Playwright | Pyramide de tests complète, couverture des parcours critiques |

---

*Fin du UI_FRONTEND_SPECS.md — TAKT v0.1 (E0.3f — validé)*