# BACKLOG PROJET — TAKT

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques
**Licence :** GNU AGPL v3 (toute distribution impose la publication du code source complet)
**Répertoire :** `/home/mehdi/dev/takt/`
**Version :** 1.0 — Date : 30 octobre 2026
**Statut :** Backlog de référence — prêt à exécution en flux continu
**Documents liés :** `PLAN_MACRO.md`, `docs/SF_TAKT.md`, `docs/ST_TAKT.md`, `docs/WORKFLOW_METIER.md`, `docs/TESTS.md`, `docs/PROMPTS_CLINE_TAKT.md`, `docs/SUIVI_VELOCITE_TAKT.md`

---

## §1. Principes de construction du backlog

### 1.1 Principes directeurs

| # | Principe | Justification |
|---|----------|---------------|
| B-01 | **Traçabilité obligatoire** : chaque ticket référence au moins un code d'exigence stable (`EX-*`, `EC-*`, `IX-*`, `UF-*`, `HC-*`, `SC-*`, `TE-*`, `DL-*`). | Le dossier conceptuel impose des identifiants stables (« jamais des numéros de section, qui peuvent changer »). Le backlog doit reprendre cette convention. |
| B-02 | **Granularité « une session Cline »** : un ticket = unité réalisable en 0,5 à 3 jours-homme avec un périmètre non négociable et vérifiable. | Un ticket trop large produit des implémentations approximatives ; un ticket trop étroit produit de la friction de revue. |
| B-03 | **DoD binaire** : tout critère de sortie est vrai/faux ; les jugements (« propre », « performant ») sont proscrits. | Sans critère binaire, ni l'agent ni la revue ne peuvent conclure ; le suivi de vélocité devient ininterprétable. |
| B-04 | **Tests obligatoires** : tout ticket produit du code accompagné de ses tests (`TE-TEST-01`). | Cible contractuelle : ≥ 80 % de lignes, 100 % de branches sur 5 services critiques (`TESTS.md §7`). |
| B-05 | **Conformité aux décisions figées** : aucune dépendance, aucun pattern, aucun écran non prévu par le corpus conceptuel. | Le dossier est en Phase 0 validée (DoR signé) : le backlog l'exécute, il ne le rediscute pas. |
| B-06 | **Ordre de dépendance strict** : un ticket n'est lancé que si tous ses prérequis sont « Terminé ». | Évite le travail jeté et le rework sur les modules transverses (auth, RBAC, enveloppe API). |
| B-07 | **Isolation des divergences** : les 7 divergences documentaires sont traitées en Lot 0, hors flux de code. | Du code écrit sur une spécification contradictoire produit un défaut de conception non rattrapable en recette. |
| B-08 | **Journal d'audit natif** : tout ticket modifiant des données métier écrit dans `JournalAudit`. | `EX-DAT-05`, `TE-API-05`, `TE-SEC-05` : journal immuable, conservé 3 ans. |
| B-09 | **Réversibilité** : tout ticket modifiant le schéma fournit la migration **et** son rollback (`down.sql`). | `docs/DOC_MIGRATION_DB.md` impose la traçabilité des migrations. |
| B-10 | **Unité de livraison atomique** : un ticket = une branche = une PR = un commit conventionnel. | `PLAN_MACRO §6` : branche par ticket, un seul push, Conventional Commits. |

### 1.2 Convention d'identification des tickets

```
TAKT-<LOT>-<NN>
      │     │    └── Numéro séquentiel dans le lot (01 → 12)
      │     └─────── Identifiant de lot (L00 → L11)
      └───────────── Préfixe projet
```

Exemples : `TAKT-L06-05` (moteur de conflits), `TAKT-L09-10` (grille EDT drag&drop).

| Lot | Phase PLAN_MACRO | Jalon |
|-----|------------------|-------|
| L00 | P0 — Cadrage (complément) | J10 — Figement des spécifications |
| L01 | P1 — Fondation | J14 — Fin Sprint 0 |
| L02 | P1 — Fondation | J14 |
| L03 | P1 — Fondation | J14 |
| L04 | P2 — Référentiels | J28 — Fin Sprint 1 |
| L05 | P3 — Cœur du planning | J42 — Fin Sprint 2 |
| L06 | P3 — Cœur du planning | J42 |
| L07 | P4 — Génération | J56 — Fin Sprint 3 |
| L08 | P2 — Socle frontend | J28 |
| L09 | P3/P4 — Frontend métier | J42 / J56 |
| L10 | P4 — Exports & publication | J56 |
| L11 | P5 — Production & Recette | J70 — Recette signée |

### 1.3 Échelle d'estimation

Story Points sur échelle Fibonacci : **1, 2, 3, 5, 8, 13, 21**.

| Type de ticket | SP typique | Exemples |
|----------------|-----------|----------|
| Documentation / arbitrage / registre | 2–3 | `TAKT-L00-05` |
| Configuration, outillage, squelette | 3–5 | `TAKT-L01-02`, `TAKT-L08-07` |
| API CRUD sur référentiel | 5–6 | `TAKT-L04-01` |
| Service métier avec algorithme | 8 | `TAKT-L05-03`, `TAKT-L06-05` |
| Composant complexe / grille interactive | 13 | `TAKT-L09-10` |
| Infrastructure transverse | 5–8 | `TAKT-L11-04` |

### 1.4 Definition of Ready (DoR) — conditions de lancement

Un ticket ne peut être lancé que si les **6 conditions** sont réunies :

1. Exigences tracées stables et non contradictoires (garanti par le Lot 0).
2. Dépendances terminées.
3. Périmètre fichiers défini (inclus / exclus).
4. Critères d'acceptation Given/When/Then écrits.
5. Commande de test identifiée et exécutable.
6. Prompt Cline correspondant présent dans `docs/PROMPTS_CLINE_TAKT.md`.

### 1.5 Definition of Done (DoD) — conditions de clôture

1. Code implémenté ; `pnpm lint` et `pnpm typecheck` verts.
2. Tests unitaires et d'intégration écrits et passants ; couverture conforme.
3. Critères d'acceptation Given/When/Then vérifiés par test ou preuve.
4. OpenAPI synchronisé si endpoint touché ; migration + `down.sql` si schéma touché.
5. Journal d'audit écrit pour toute mutation métier.
6. Commit conventionnel sur branche dédiée, PR descriptive.
7. Rapport de clôture Cline produit (fichiers, commandes, résultats, écarts).

<!-- ANCRE -->

## §2. Vue d'ensemble par lot

| Lot | Intitulé | Tickets | SP | Phase | Jalon | Dépendance |
|-----|----------|---------|-----|-------|-------|------------|
| **L00** | Arbitrage documentaire & registre de décision | 5 | 13 | P0 | J10 | — |
| **L01** | Fondation : monorepo, outillage, Git, CI/CD de base | 7 | 24 | P1 | J14 | L00 |
| **L02** | Socle API : enveloppe, erreurs, contrats, SSE | 6 | 27 | P1 | J14 | L01 |
| **L03** | Authentification, utilisateurs, RBAC, audit | 7 | 34 | P1 | J14 | L02 |
| **L04** | Référentiels métier & import | 8 | 44 | P2 | J28 | L03 |
| **L05** | Répartition pédagogique & charge horaire | 6 | 34 | P3 | J42 | L04 |
| **L06** | Versions, séances, conflits, bail, verrous | 10 | 62 | P3 | J42 | L05 |
| **L07** | Génération CP-SAT | 7 | 47 | P4 | J56 | L06 |
| **L08** | Socle frontend & design system | 7 | 38 | P2 | J28 | L02, L03 |
| **L09** | Frontend métier : 26 écrans `EC-*` | 12 | 88 | P3/P4 | J42/J56 | L04→L07, L08 |
| **L10** | Publication, exports, notifications | 7 | 44 | P4 | J56 | L06, L07, L09 |
| **L11** | Qualité, exploitation, déploiement, recette | 7 | 49 | P5 | J70 | L09, L10 |
| | **TOTAL** | **89** | **504** | | | |

### 2.1 Répartition de la charge

| Lot | % des SP | % cumul | Lecture managériale |
|-----|----------|---------|---------------------|
| L00 | 2,6 % | 2,6 % | Investissement faible, risque évité élevé (arbitrage des 7 divergences) |
| L01 | 4,8 % | 7,4 % | Socle non négociable, aucun parallélisme possible |
| L02 | 5,4 % | 12,7 % | Socle transverse, conditionne tous les lots aval |
| L03 | 6,7 % | 19,4 % | Sécurité : non négociable, bloquant pour tout le reste |
| L04 | 8,7 % | 28,2 % | Volume CRUD élevé, faible risque technique |
| L05 | 6,7 % | 34,9 % | Logique métier sensible (snapshots, charge horaire) |
| L06 | 12,3 % | 47,2 % | **Lot le plus lourd** : cœur applicatif, 5 services critiques |
| L07 | 9,3 % | 56,5 % | Risque technique principal (performance du solveur) |
| L08 | 7,5 % | 64,1 % | Socle frontend, parallélisable avec L04–L07 |
| L09 | 17,5 % | 81,5 % | **2e lot le plus lourd** : 26 écrans + grille drag&drop |
| L10 | 8,7 % | 90,3 % | Formats hétérogènes (XLSX/PDF/ICS), dépendance Chromium |
| L11 | 9,7 % | 100 % | Industrialisation et recette |

### 2.2 Chemin critique

```
L00 → L01 → L02 → L03 → L04 → L05 → L06 → L07 → L09 → L10 → L11
                                                ↘ L08 (parallélisable)
```

**Lecture :** 8 lots (L01–L07 puis L09–L11) forment un enchaînement **strictement séquentiel** de 465 SP, soit **92 % du backlog**. L'unique voie de parallélisation réelle est **L08** (38 SP), mobilisable dès que L02 et L03 sont terminés, en parallèle de L04 à L07 (121 SP). C'est la seule source de gain de cycle de vie : elle doit être exploitée dès que possible.

**Point de vigilance critique :** `TAKT-L07-06` (spike de performance CP-SAT) doit être exécuté **dès que L06 est fonctionnel**, en parallèle de L08, car il conditionne la faisabilité de la promesse de performance du solveur.

---

## §3. Matrice de dépendances inter-lots

| Lot ↓ / Lot → | L01 | L02 | L03 | L04 | L05 | L06 | L07 | L08 | L09 | L10 | L11 |
|----------------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| **L01** | — | ● | | | | | | | | | |
| **L02** | | — | ● | | | | | ○ | | | |
| **L03** | | | — | ● | | | | ○ | | | |
| **L04** | | | | — | ● | | | | ● | | |
| **L05** | | | | | — | ● | | | ● | | |
| **L06** | | | | | | — | ● | | ● | ● | |
| **L07** | | | | | | | — | | ● | ● | ○ |
| **L08** | | | | | | | | — | ● | | ○ |
| **L09** | | | | | | | | | — | ● | ● |
| **L10** | | | | | | | | | | — | ● |
| **L11** | | | | | | | | | | | — |

`●` = dépendance bloquante (le lot aval ne démarre pas) · `○` = parallélisation possible (contrainte de ressource, pas de dépendance fonctionnelle)

---

## §4. Fiches de ticket

> **Format de fiche** : Objectif · Exigences tracées · Périmètre (fichiers autorisés / hors périmètre) · Livrables · Critères d'acceptation Given/When/Then · DoD · Tests exigés · SP · Dépendances · Ticket bloqué par ce ticket.

### Lot L00 — Arbitrage documentaire & registre de décision (5 tickets · 13 SP)

#### TAKT-L00-01 — Trancher les transitions de rejet (divergences D1 / D5)
- **Objectif :** Établir une version unique et non contradictoire de la machine à 19 transitions avant toute implémentation du workflow.
- **Exigences :** `EX-WKF-02`, `EX-WKF-03`, `EX-WKF-07`, `EX-WKF-08`, `WORKFLOW_METIER §3`, `ST_TAKT §4.1`.
- **Périmètre :** `docs/WORKFLOW_METIER.md`, `docs/SF_TAKT.md`, `docs/ST_TAKT.md`, `docs/SUIVI_VELOCITE_TAKT.md`. **Hors périmètre :** tout code applicatif.
- **Livrables :** Matrice des 19 transitions de `WORKFLOW_METIER §3` corrigée (rejet `valid_pedag` → `edition` ; rejet `valid_dir` → `rep_pedag` motif pédagogique **ou** `edition` motif planning ; aucun rejet vers `brouillon`), §4.1 de `ST_TAKT` aligné, Decision Log entries `DL-WF-05`/`DL-WF-06`.
- **Critères :** *Given* une version en `valid_pedag`, *When* le `rdep` rejette avec motif, *Then* la version passe en `edition` et non en `brouillon`. *Given* une version en `valid_dir`, *When* la Direction rejette avec motif pédagogique, *Then* la version repasse en `rep_pedag`. *Given* un rejet, *When* la transition est demandée sans motif, *Then* la requête est refusée (motif obligatoire).
- **DoD :** Les trois documents portent la même matrice ; aucune cellule ne mentionne `brouillon` comme cible de rejet ; chaque divergence est tracée dans le Decision Log ; le compte rendu liste les documents modifiés.
- **Tests exigés :** revue documentaire croisée (table des transitions vérifiée ligne à ligne) — aucun test automatisé à ce stade.
- **SP :** 3 · **Dépend de :** — · **Bloque :** `TAKT-L06-01`, `TAKT-L06-02`.

#### TAKT-L00-02 — Trancher le seuil de verrouillage « génération risquée » (D2)
- **Objectif :** Supprimer la contradiction 75 % vs 80 % et faire du seuil un paramètre système administrable.
- **Exigences :** `EX-OUV-01`, `WF-01`, `RB-UI-07`, `EC-ADM-03`.
- **Périmètre :** `docs/SF_TAKT.md`, `docs/WORKFLOW_METIER.md`, `docs/ST_TAKT.md`, `docs/SPEC_CONTRAINTES_GENERATION.md`, `packages/db/prisma/contract.prisma` (champ paramètre uniquement). **Hors périmètre :** implémentation du moteur de génération.
- **Livrables :** Valeur canonique retenue et documentée (recommandation : **75 %**, avec mention de l'écart de 5 points absorbé par la marge P80), paramètre `seuilVerrouillageGeneration` documenté comme configurable par l'`admin` (`EC-ADM-03`).
- **Critères :** *Given* un paramètre système, *When* il est modifié par l'`admin`, *Then* la garde de génération utilise la nouvelle valeur. *Given* 76 % de séances verrouillées, *When* le `gest` lance une génération, *Then* un avertissement bloquant est présenté.
- **DoD :** Une seule valeur par défaut dans tout le corpus ; le caractère configurable est acté ; le `contract.prisma` expose le champ ; l'impact est documenté dans `ST_TAKT §5.6`.
- **Tests exigés :** revue documentaire + validation `prisma db verify` si schéma modifié.
- **SP :** 2 · **Dépend de :** `TAKT-L00-01` · **Bloque :** `TAKT-L07-07`.

#### TAKT-L00-03 — Trancher le pas de temps et le nombre d'écrans (D3 / D4)
- **Objectif :** Fixer le référentiel horaire (pas de temps, jours ouvrés, créneaux) et la liste définitive des écrans.
- **Exigences :** `EX-PER-01`, `EX-REF-06`, `HC-STR-01` à `HC-STR-03`, `EX-UI-01`, `UI_ARBORESCENCE §1`.
- **Périmètre :** `docs/SF_TAKT.md`, `docs/ST_TAKT.md`, `docs/UI_ARBORESCENCE.md`, `docs/UI_WIREFRAMES.md`, `docs/SPEC_CONTRAINTES_GENERATION.md`, `docs/UI_FRONTEND_SPECS.md`. **Hors périmètre :** maquettes.
- **Livrables :** Règle unique : pas de temps **30 min, 24 créneaux/jour, lundi–samedi** (EX-REF-06 réécrit en « les créneaux sont définis par jour et ordre consécutif, subdivisés en pas de 30 min ») ; inventaire écran canonique = **26 écrans** (10 transversaux + 16 par rôle), avec table de correspondance `EC-* ↔ workflow` réconciliée ; `ST_TAKT §1.5` corrigé (« 29 écrans » → « 26 écrans »).
- **Critères :** *Given* le corpus conceptuel, *When* on recherche le nombre d'écrans, *Then* un seul nombre apparaît (26). *Given* une liste de créneaux, *When* on l'affiche, *Then* chaque jour comporte des créneaux contigus de 30 min.
- **DoD :** Zéro occurrence des valeurs contradictoires dans le corpus ; inventaire `EC-*` dédupliqué ; les references croisées (`UI_WIREFRAMES`, `UI_INTERACTIONS`, `UI_FRONTEND_SPECS`) pointent sur les 26 écrans.
- **Tests exigés :** revue documentaire (grep des valeurs contradictoires) — script de contrôle à proposer en annexe.
- **SP :** 3 · **Dépend de :** — · **Bloque :** `TAKT-L04-02`, `TAKT-L08-05`, `TAKT-L09-01`.

#### TAKT-L00-04 — Trancher la stratégie de session (D7) et préparer l'initialisation Git (D6)
- **Objectif :** Fixer la stratégie de stockage des jetons et lever le blocage opérationnel « dépôt Git absent ».
- **Exigences :** `EX-SEC-01`, `TE-API-01`, `TESTS.md §6.1`, `PLAN_MACRO §6`.
- **Périmètre :** `docs/ST_TAKT.md` (§5.1), `docs/TESTS.md` (§6.1), `docs/SF_TAKT.md` (§13), `docs/SPEC_SECRETS.md`. **Hors périmètre :** code applicatif (le dépôt Git est créé par `TAKT-L01-01`).
- **Livrables :** Stratégie retenue : **access token en mémoire + refresh token en cookie `HttpOnly`/`Secure`/`SameSite=Strict`**, cohérente avec `TESTS.md §6.1` et compatible avec le SPA (suppression du stockage en `localStorage`, prévention XSS) ; procedure de création du dépôt Git (branche `main` protégée, `develop`, règles de nommage de branches) actée.
- **Critères :** *Given* un refresh token, *When* il est émis, *Then* il est transporté par cookie `HttpOnly` et non exposé au JavaScript. *Given* un access token expiré, *When* une requête est émise, *Then* le client déclenche silencieusement un `/auth/refresh` avant rejeu.
- **DoD :** Les trois documents décrivent la même stratégie ; la procédure Git (commandes, branches, protection) figure dans le compte rendu et dans `TAKT-L01-01`.
- **Tests exigés :** revue documentaire.
- **SP :** 3 · **Dépend de :** — · **Bloque :** `TAKT-L03-03`, `TAKT-L08-02`.

#### TAKT-L00-05 — Constituer le registre de décision unifié
- **Objectif :** Créer un registre unique des décisions structurantes couvrant les 3 Decision Logs existants, condition de la gouvernance des 89 tickets.
- **Exigences :** `DL-01` à `DL-08`, `DL-TE-01` à `DL-TE-08`, `DL-UI-01` à `DL-UI-04`, `DL-FS-*`.
- **Périmètre :** `docs/DECISIONS.md` (nouveau), `docs/SF_TAKT.md`, `docs/ST_TAKT.md`, `docs/UI_ARBORESCENCE.md`, `docs/UI_FRONTEND_SPECS.md`. **Hors périmètre :** aucun code.
- **Livrables :** `docs/DECISIONS.md` : tableau `ID | Date | Statut | Décision | Conséquence technique | Documents impactés | Ticket backlog`, consolidant les ~25 décisions et les 7 arbitrages L00.
- **Critères :** *Given* une décision `DL-*`, *When* on la recherche dans le registre, *Then* son identifiant, sa conséquence et les tickets impactés sont renseignés. *Given* un nouveau ticket du backlog, *When* il applique une décision, *Then* cette décision est référencée dans le registre.
- **DoD :** Registre existant, ≥ 25 décisions consolidées, 7 arbitrages L00 tracés, aucun Decision Log contradictoire résiduel dans les documents sources.
- **Tests exigés :** revue documentaire (complétude : chaque `DL-*` du corpus figure au registre).
- **SP :** 2 · **Dépend de :** `TAKT-L00-01`…`TAKT-L00-04` · **Bloque :** aucun (amélioration continue).

### Lot L01 — Fondation : monorepo, outillage, Git, CI/CD de base (7 tickets · 24 SP)

#### TAKT-L01-01 — Initialiser le dépôt Git et la gouvernance de branches
- **Objectif :** Créer le dépôt Git (absent à ce jour) et installer la gouvernance `PLAN_MACRO §6` avant toute production de code.
- **Exigences :** `PLAN_MACRO §6`, `GG-12`, `TAKT-L00-04`.
- **Périmètre :** `/home/mehdi/dev/takt/.git/`, `.gitignore`, `.gitattributes`, `.github/`. **Hors périmètre :** aucun code applicatif.
- **Livrables :** `git init` sur `main` (défaut), branche `develop`, `.gitignore` couvrant `node_modules/`, `dist/`, `.next/`, `.env`, `.env.*` (sauf `.env.example`), artefacts de coverage, `.turbo/` ; `.gitattributes` (LF, UTF-8) ; template de PR et de ticket (checklist DoR/DoD) ; règle de protection de `main` documentée.
- **Critères :** *Given* le dépôt initialisé, *When* on exécute `git status`, *Then* les secrets et artefacts de build sont ignorés. *Given* un commit, *When* on lance `git log`, *Then* le message respecte Conventional Commits. *Given* `main`, *When* on tente un push direct, *Then* la règle de protection l'interdit.
- **DoD :** Dépôt initialisé avec historique ; `.gitignore` vérifié par `git check-ignore` sur 5 cas (`.env`, `node_modules`, `dist`, `coverage`, `.turbo`) ; branche `develop` créée ; modèle de PR créé ; aucune donnée sensible dans l'index.
- **Tests exigés :** script de vérification shell des règles d'ignorance (à committer dans `scripts/`).
- **SP :** 2 · **Dépend de :** `TAKT-L00-04` · **Bloque :** tous les tickets applicatifs.

#### TAKT-L01-02 — Initialiser le monorepo pnpm + Turborepo
- **Objectif :** Mettre en place l'espace de travail qui supportera `apps/backend`, `apps/frontend` et `packages/*`.
- **Exigences :** `ST_TAKT §0.1`, `ST_TAKT §1.2`, `PLAN_MACRO E1.1`, `GG-02`.
- **Périmètre :** `package.json` (racine), `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`, `tsconfig.base.json`, `.eslintrc` partagé. **Hors périmètre :** le contenu des apps (tickets L01-03 et L01-05).
- **Livrables :** Workspace pnpm 9 (`packages: apps/*, packages/*`), Turborepo pilotant `build`, `lint`, `typecheck`, `test`, `dev` ; `tsconfig.base.json` en `strict: true` avec alias `@takt/*` ; configuration ESLint + Prettier homogènes ; `.npmrc` avec `auto-install-peers=true` et `strict-peer-dependencies=false`.
- **Critères :** *Given* le workspace, *When* on exécute `pnpm install`, *Then* l'installation réussit sans erreur de peer dependency. *Given* les workspaces, *When* on exécute `pnpm turbo build`, *Then* le cache Turbo fonctionne (2e exécution plus rapide). *Given* un import de `@takt/db`, *Then* le typage est résolu sans configuration supplémentaire.
- **DoD :** `pnpm install` sans erreur ; `pnpm turbo build` et `pnpm turbo typecheck` verts sur un squelette vide ; alias `@takt/*` fonctionnels ; versions des outils alignées sur `ST_TAKT §0.1`.
- **Tests exigés :** test d'intégration « smoke » du pipeline Turbo (build vide) ; `pnpm lint` sans erreur.
- **SP :** 5 · **Dépend de :** `TAKT-L01-01` · **Bloque :** `TAKT-L01-03`, `TAKT-L01-05`, `TAKT-L02-02`.

#### TAKT-L01-03 — Créer le squelette du backend NestJS (santé, Swagger, configuration)
- **Objectif :** Disposer d'un backend exécutable, typé, observable et documentable avant d'implémenter le moindre domaine métier.
- **Exigences :** `ST_TAKT §1.2`, `ST_TAKT §3.1`, `PLAN_MACRO E1.3`, `TE-API-06`.
- **Périmètre :** `apps/backend/src/**`, `apps/backend/package.json`, `apps/backend/tsconfig.json`, `apps/backend/Dockerfile` (existant, à vérifier). **Hors périmètre :** `apps/backend/src/auth/**` (L03), tout module métier.
- **Livrables :** Application NestJS 10+ avec `AppModule`, `main.ts` (prefixe `/api/v1`, `ValidationPipe` global Zod, `enableCors` restreint, `helmet`), module `HealthController` (`GET /health` → 200 `{ status, uptime, version }`), `SwaggerModule` en `/api/docs` à partir d'`openapi.yaml`, `ConfigModule` avec validation de schéma d'environnement (variables manquantes = échec au démarrage).
- **Critères :** *Given* le backend démarré, *When* `GET /health` est appelé, *Then* la réponse est 200 avec `status: "ok"`. *Given* une variable d'environnement requise absente, *When* l'application démarre, *Then* elle s'arrête avec une erreur explicite listant les variables manquantes. *Given* une route inexistante, *When* elle est appelée, *Then* la réponse 404 suit l'enveloppe `{ data, error, meta }`.
- **DoD :** `GET /health` répond 200 ; `GET /api/docs` expose la spécification ; un `GET /api/v1/unknown` renvoie l'enveloppe d'erreur normalisée ; aucune variable secrète en dur ; en-têtes AGPL en place.
- **Tests exigés :** test d'intégration `supertest` sur `/health` et sur une route 404 (enveloppe d'erreur).
- **SP :** 3 · **Dépend de :** `TAKT-L01-02` · **Bloque :** `TAKT-L02-01`, `TAKT-L02-04`.

#### TAKT-L01-04 — Matérialiser le modèle de données Prisma et la migration initiale
- **Objectif :** Transformer le contrat Prisma (`contract.prisma`, 15 modèles) en schéma exécutable avec migration initiale réversible.
- **Exigences :** `PLAN_MACRO E1.2`, `ST_TAKT §2`, `TE-DB-*`, `GG-08`, `docs/DOC_MIGRATION_DB.md`.
- **Périmètre :** `packages/db/prisma/schema.prisma` (nouveau, dérivé de `contract.prisma`), `packages/db/prisma/migrations/**`, `packages/db/src/**` (client généré + export), `packages/db/package.json`. **Hors périmètre :** `contract.prisma` (reste le contrat de référence, non modifié sans décision).
- **Livrables :** `schema.prisma` complet (15 modèles, `Uuid` en PK, `DateTime` UTC, index et contraintes UNIQUE de `ST_TAKT §2.3`/`§2.4`), provider `postgresql`, `DATABASE_URL` par environnement ; migration initiale `2026_init/` avec `migration.sql` **et** `down.sql` de rollback ; `@takt/db` exportant le client Prisma typé.
- **Critères :** *Given* un PostgreSQL vierge, *When* `prisma migrate deploy` est exécuté, *Then* toutes les tables, index et contraintes sont créés sans erreur. *Given* la migration appliquée, *When* le `down.sql` est exécuté, *Then* le schéma revient à l'état initial. *Given* un import de `@takt/db`, *Then* les types des 15 modèles sont autocomplétés.
- **DoD :** `prisma db verify` passe ; `prisma migrate dev` puis `prisma migrate reset` réussissent en local ; `down.sql` testé ; `pnpm --filter @takt/db build` produit un client importable ; seed idempotent branché sur `packages/db/prisma/seed.ts` existant.
- **Tests exigés :** test d'intégration « schéma appliqué » : compter tables/index/contraintes après migration ; test d'idempotence du seed.
- **SP :** 5 · **Dépend de :** `TAKT-L01-02` · **Bloque :** tous les tickets à persistance.

#### TAKT-L01-05 — Créer le squelette du frontend Vite (React, TypeScript strict, design system vide)
- **Objectif :** Disposer d'un frontend compilable, typé strict, structuré selon l'Atomic Design défini, avant l'implémentation des écrans.
- **Exigences :** `ST_TAKT §0.1`, `UI_FRONTEND_SPECS §2`, `GG-03`, `GG-04`.
- **Périmètre :** `apps/frontend/src/**`, `apps/frontend/package.json`, `apps/frontend/tsconfig.json`, `apps/frontend/vite.config.ts`, `apps/frontend/index.html`. **Hors périmètre :** écrans métier (L09), composants métier (L08-05).
- **Livrables :** Vite 5.4 + React 18.3 + TS 5.5 strict ; arborescence `components/{atoms,molecules,organisms,templates,pages}`, `hooks/`, `stores/`, `lib/`, `utils/` ; `index.html` avec `<html lang="fr">` ; Vite configuré (alias `@/` et `@takt/*`, proxy `/api` vers le backend) ; ESLint + Prettier + plugins React ; page d'accueil temporaire « TAKT » avec en-tête AGPL.
- **Critères :** *Given* le frontend, *When* `pnpm --filter frontend build` est exécuté, *Then* le build Vite réussit sans avertissement bloquant. *Given* un composant contenant `any`, *When* le lint est exécuté, *Then* une erreur est levée. *Given* un import de `@takt/db` (types), *Then* le type est résolu.
- **DoD :** Build vert ; `pnpm lint` et `pnpm typecheck` verts ; arborescence conforme à `UI_FRONTEND_SPECS §2` ; `lang="fr"` présent ; alias configurés ; aucun `any` non justifié.
- **Tests exigés :** test Vitest minimale sur un atome placeholder ; configuration Vitest opérationnelle (`pnpm test:unit` vert).
- **SP :** 3 · **Dépend de :** `TAKT-L01-02` · **Bloque :** `TAKT-L08-01`…`TAKT-L08-07`, `TAKT-L09-01`.

#### TAKT-L01-06 — Fournir la stack Docker de développement (PostgreSQL, backend, frontend)
- **Objectif :** Permettre à tout développeur de démarrer l'environnement complet en une commande, sans installation locale de base de données.
- **Exigences :** `PLAN_MACRO E1.5`, `docs/DEPLOIEMENT.md §4`, `GG-11`.
- **Périmètre :** `docker-compose.yml` (nouveau, dev), `docker-compose.override.yml` (si besoin), `.env.example` (existant, à compléter), `apps/backend/Dockerfile` (existant), `apps/frontend/Dockerfile` (existant), `apps/frontend/nginx.conf` (existant). **Hors périmètre :** `docker-compose.prod.yml` et `docker-compose.test.yml` (existants, hors périmètre de ce ticket).
- **Livrables :** Compose dev avec services `postgres` (pg_boss dédié `pg_boss` + base `takt`), `backend` (build Dockerfile, `DATABASE_URL` injectée, healthcheck `/health`), `frontend` (nginx, proxy `/api` → backend, SPA fallback) ; healthchecks sur tous les services ; `depends_on: condition: service_healthy` ; variables uniquement via `.env.local` (jamais commité) ; commande unique `docker compose up -d --build` documentée.
- **Critères :** *Given* un poste vierge avec Docker, *When* `docker compose up -d --build` est lancé, *Then* les 3 services montent et sont `healthy`. *Given* la stack démarrée, *When* `curl http://localhost:3000/health` est appelé, *Then* la réponse est 200. *Given* le frontend, *When* la SPA est servie sur une route profonde, *Then* le fallback nginx renvoie `index.html`.
- **DoD :** Stack monte de bout en bout ; healthchecks verts ; aucun secret en dur (tout par variable d'environnement) ; `docker compose down -v` puis `up` reproductible ; procédure de démarrage documentée dans le compte rendu.
- **Tests exigés :** script de smoke test `scripts/smoke-dev.sh` : monte la stack, attend les healthchecks, appelle `/health`, ожидает 200, démonte.
- **SP :** 3 · **Dépend de :** `TAKT-L01-03`, `TAKT-L01-05` · **Bloque :** `TAKT-L02-05`, `TAKT-L11-04`.

#### TAKT-L01-07 — Mettre en place la CI minimale (lint, typecheck, build)
- **Objectif :** Garantir qu'aucun code non conforme n'atteint `main`.
- **Exigences :** `PLAN_MACRO E1.6`, `TE-TEST-05`, `TESTS.md §8.1`, `GG-12`.
- **Périmètre :** `.github/workflows/ci.yml` (existant, à simplifier/valider), scripts de pipeline. **Hors périmètre :** jobs de déploiement et E2E (L11-04).
- **Livrables :** Pipeline GitHub Actions déclenché sur `push` et `pull_request` : installation pnpm + Node 24 LTS, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm build` ; job `docker-build` de validation d'image (conservé, non bloquant sur PR hors main) ; cache pnpm et Turbo.
- **Critères :** *Given* une Pull Request avec une erreur de lint, *When* la CI s'exécute, *Then* le job échoue et la PR est bloquée. *Given* un push sur `main`, *When* la CI s'exécute, *Then* lint, typecheck et build sont verts. *Given* deux exécutions successives, *Then* la seconde est accélérée par le cache.
- **DoD :** Pipeline vert sur `main` ; une PR volontairement cassée est rejetée (preuve de l'échec) ; durée totale < 10 min ; `pnpm-lock.yaml` commité.
- **Tests exigés :** vérification des 3 étapes en échec (lancées localement avec une erreur injectée puis révoquée).
- **SP :** 3 · **Dépend de :** `TAKT-L01-02`, `TAKT-L01-03`, `TAKT-L01-05` · **Bloque :** `TAKT-L11-04`.

### Lot L02 — Socle API : enveloppe, erreurs, contrats, SSE (6 tickets · 27 SP)

#### TAKT-L02-01 — Implémenter l'enveloppe de réponse et la gestion d'erreurs
- **Objectif :** Garantir que **100 %** des endpoints NestJS répondent au contrat `{ data, error, meta }` et au catalogue d'erreurs HTTP, sans fuite technique.
- **Exigences :** `ST_TAKT §3.3`, `ST_TAKT §3.4`, `TE-API-06`, `EX-UI-01`.
- **Périmètre :** `apps/backend/src/common/interceptors/**`, `apps/backend/src/common/filters/**`, `apps/backend/src/common/exceptions/**`, `apps/backend/src/common/dto/**`. **Hors périmètre :** logique métier.
- **Livrables :** Intercepteur global de sérialisation `{ data, error, meta }` ; `meta` contenant `requestId`, `timestamp`, `page`, `pageSize`, `total` ; filtre d'exception global mappant les erreurs métier (`ValidationError`→400 `VALIDATION_ERROR` avec `details`, `Unauthorized`→401, `Forbidden`→403, `NotFound`→404, `Conflict`→409 `WORKFLOW_INVALID_TRANSITION`, `Locked`→423 `SEANCE_LOCKED`, `RateLimit`→429) ; classe `ApiError` de base ; masquage systématique des stack traces en production.
- **Critères :** *Given* un endpoint qui renvoie une liste paginée, *When* on l'appelle, *Then* la réponse contient `data`, `error: null` et `meta.page`/`meta.total`. *Given* une validation Zod échouée, *Then* la réponse est 400 avec `details` listant champ et message, en français. *Given* une exception non gérée, *Then* la réponse est 500 `{ code: "INTERNAL_ERROR" }` **sans stack trace ni nom de classe interne**.
- **DoD :** Un endpoint de démonstration renvoie l'enveloppe complète ; les 8 codes HTTP du catalogue sont atteignables par un test ; aucune stack trace exposée (test automatisé) ; enveloppe appliquée automatiquement à tous les contrôleurs.
- **Tests exigés :** tests d'intégration `supertest` sur les 8 codes d'erreur + vérification de l'enveloppe.
- **SP :** 5 · **Dépend de :** `TAKT-L01-03` · **Bloque :** tous les tickets API.

#### TAKT-L02-02 — Créer le package de contrats Zod partagés
- **Objectif :** Garantir la cohérence frontend/backend par des schémas de validation **partagés** (source unique de vérité).
- **Exigences :** `TE-API-02`, `ST_TAKT §3.1`, `ST_TAKT §6.1` (risque « cohérence frontend/backend »), `UI_FRONTEND_SPECS §4`.
- **Périmètre :** `packages/contracts/**` (nouveau : `src/auth.ts`, `src/referentiels.ts`, `src/versions.ts`, `src/seances.ts`, `src/common.ts`, `src/index.ts`), configuration `package.json`, alias `@takt/contracts`. **Hors périmètre :** schémas propres à un seul écran.
- **Livrables :** Package TypeScript buildé, exportant les schémas nommés du `ST_TAKT §3.2` (`zLogin`, `zRefresh`, `zUser`, `zUserList`, `zVersion`, `zTransition`, `zSeance`, `zSeanceList`, `zLock`, `zGeneration`, `zScenario`, `zScenarioSelect`, `zExport`, `zAudit`) + schémas de pagination/filtres ; types infersés (`z.infer`) ; schémas.refine pour les règles composites (ex. unicité du couple jour/créneau/salle).
- **Critères :** *Given* un schéma importé dans le backend et dans le frontend, *Then* une même charge utile invalide est rejetée par les deux côtés avec le même message. *Given* un schéma modifié, *Then* le type TypeScript inféré change automatiquement.
- **DoD :** Package publishable dans le workspace ; les 14 schémas du `ST_TAKT §3.2` présents et typés ; aucun `any` dans les exports ; test de parité backend/frontend sur 3 charges utiles.
- **Tests exigés :** tests unitaires sur les `.refine` de chaque domaine + test de parité.
- **SP :** 5 · **Dépend de :** `TAKT-L01-02` · **Bloque :** `TAKT-L02-03`, `TAKT-L03-03`, `TAKT-L04-06`.

#### TAKT-L02-03 — Implémenter la pagination, le filtrage et la normalisation des listes
- **Objectif :** Uniformiser les endpoints de liste (pagination, tri, filtres, recherche textuelle) pour éviter 15 implémentations divergentes.
- **Exigences :** `ST_TAKT §3.3` (`meta.page`, `meta.pageSize`, `meta.total`), `ST_TAKT §3.5`, `IX-ADM-07`, `IX-RDEP-05`.
- **Périmètre :** `apps/backend/src/common/pagination/**`, `apps/backend/src/common/filters/**`, helpers Prisma de requête. **Hors périmètre :** chaque module métier.
- **Livrables :** DTO générique `PaginationDto` (défaut 20, max 200) ; intercepteur/pipe de normalisation ; helper `buildPrismaQuery` (filtre, `search` multi-champs, tri whitelisté — **jamais** d'injection brute du nom de champ) ; DTO d'erreur de filtre.
- **Critères :** *Given* 150 utilisateurs et `?page=2&pageSize=50`, *Then* `meta.total = 150` et `meta.page = 2`. *Given* un tri sur un champ inexistant, *Then* la requête est rejetée 400 (liste blanche). *Given* `?search=nom`, *Then* le filtre porte sur les champs déclarés du domaine.
- **DoD :** 3 endpoints pilotes utilisent le helper ; un test vérifie le rejet d'un champ de tri non whitelisté ; `meta.total` exact sur une table de 150 lignes.
- **Tests exigés :** tests d'intégration sur pagination, tri invalide, recherche.
- **SP :** 5 · **Dépend de :** `TAKT-L02-01`, `TAKT-L02-02` · **Bloque :** `TAKT-L04-06`, `TAKT-L11-01`.

#### TAKT-L02-04 — Générer et maintenir la spécification OpenAPI
- **Objectif :** Faire de `docs/openapi.yaml` le contrat Living, synchronisé avec le code et publié automatiquement.
- **Exigences :** `ST_TAKT §3.1`, `PLAN_MACRO E0.6`, `TE-API-01` à `TE-API-06`.
- **Périmètre :** `apps/backend/src/**` (annotations Swagger), `docs/openapi.yaml` (mis à jour), `scripts/check-openapi.ts`. **Hors périmètre :** logique métier.
- **Livrables :** Annotations `@nestjs/swagger` sur DTO et contrôleurs ; script `check-openapi` comparant le YAML généré au YAML commité (échec si divergence) ; en-têtes `securitySchemes: bearerAuth` sur les routes protégées ; documentation des 8 codes d'erreur du catalogue dans `responses`.
- **Critères :** *Given* une modification de DTO, *When* la CI exécute `check-openapi`, *Then* le job échoue si `docs/openapi.yaml` n'est pas régénéré. *Given* une route protégée, *Then* `security: [{ bearerAuth: [] }]` est présent.
- **DoD :** `pnpm check-openapi` vert ; le YAML cover tous les endpoints implémentés ; les 8 codes d'erreur documentés ; le YAML généré est déterministe (deux exécutions → fichiers identiques).
- **Tests exigés :** script de dérive OpenAPI + test d'intégration sur la présence du schéma de sécurité.
- **SP :** 4 · **Dépend de :** `TAKT-L02-01` · **Bloque :** `TAKT-L08-02`, `TAKT-L11-04`.

#### TAKT-L02-05 — Implémenter le canal SSE (Server-Sent Events)
- **Objectif :** Fournir le canal temps réel unique pour la progression des générations, la disponibilité des exports et les notifications.
- **Exigences :** `ST_TAKT §1.2`, `ST_TAKT §1.3` (étape 7), `TE-ARCH-05`, `EX-NOT-01`, `SPK-04`.
- **Périmètre :** `apps/backend/src/events/**` (module SSE, hub d'événements, contrôleur `GET /api/v1/events`), `apps/backend/src/auth/**` (guard du canal). **Hors périmètre :** Worker et logique de génération.
- **Livrables :** Hub SSE avec `EventSource` par utilisateur (authentification par Bearer ou query token), file d'attente par client, heartbeat toutes les 25 s (commentaire `: ping`) pour maintenir la connexion derrière Nginx, limites (max 5 clients par utilisateur, backpressure : abandon du client le plus ancien si saturation), typage des événements (`generation.progress`, `generation.done`, `export.ready`, `notification`), `Last-Event-ID` non requis (reconnexionkal = re-fetch REST de l'état).
- **Critères :** *Given* un utilisateur authentifié, *When* il ouvre le canal, *Then* il reçoit un heartbeat en moins de 30 s. *Given* un client non authentifié, *Then* la connexion est refusée 401. *Given* 5 clients déjà connectés pour un utilisateur, *When* un 6e se connecte, *Then* le plus ancien est déconnecté proprement.
- **DoD :** Connexion authentifiée fonctionnelle via `EventSource` ; heartbeat < 30 s ; 4 types d'événements typés ; aucun memory leak (test 1000 messages) ; configuration Nginx `proxy_buffering off` documentée.
- **Tests exigés :** tests d'intégration (auth refusée, heartbeat, rétention du dernier message) + test de tenue en charge du hub.
- **SP :** 4 · **Dépend de :** `TAKT-L01-06`, `TAKT-L02-01` · **Bloque :** `TAKT-L07-03`, `TAKT-L10-05`.

#### TAKT-L02-06 — Structurer les modules backend et l'injection de dépendances
- **Objectif :** Fixer l'architecture modulaire NestJS (9 modules) et les règles de dépendance avant l'implémentation des domaines.
- **Exigences :** `ST_TAKT §1.2`, `ST_TAKT §1.5`, `TE-ARCH-02`, `TE-ARCH-05`.
- **Périmètre :** `apps/backend/src/modules/**` (arborescence vide des 9 modules), `apps/backend/src/app.module.ts`, `apps/backend/src/common/di/**`. **Hors périmètre :** implémentation des modules.
- **Livrables :** 9 dossiers de modules (`auth`, `users`, `referentiels`, `repartition`, `versions`, `planning`, `generation`, `exports`, `audit`, `notifications`, `events`) avec `*.module.ts` déclarant les imports ; règles de dépendance documentées (un module ne connaît que les services d'un module antérieur + `common`) ; tokens d'injection pour les collaborateurs externes (solveur, SMTP, stockage de fichiers) permettant le test par double.
- **Critères :** *Given* un module `planning`, *When* on inspecte ses imports, *Then* il ne dépend que de `common`, `referentiels` et `versions`. *Given* un service de génération, *When* on l'instancie en test, *Then* le solveur est un double injecté (aucun appel réel).
- **DoD :** Arborescence des 11 modules créée ; règle de dépendance écrite dans `docs/ARCHITECTURE_BACKEND.md` ; un test vérifie qu'aucun import circulaire de module n'existe (script de contrôle).
- **Tests exigés :** script de détection d'imports interdits + test d'injection d'un double.
- **SP :** 4 · **Dépend de :** `TAKT-L01-03` · **Bloque :** tous les tickets métier backend.

### Lot L03 — Authentification, utilisateurs, RBAC, audit (7 tickets · 34 SP)

#### TAKT-L03-01 — Implémenter le service de hachage argon2id
- **Objectif :** Sécuriser le stockage des mots de passe avec argon2id et des paramètres calibrés.
- **Exigences :** `EX-SEC-01`, `ST_TAKT §5.1`, `DL-TE-07`, `TESTS.md §6.1`.
- **Périmètre :** `apps/backend/src/modules/auth/**` (service `PasswordService`), `apps/backend/src/config/password.config.ts`. **Hors périmètre :** endpoints (L03-03).
- **Livrables :** `PasswordService` : `hash` (argon2id, `memoryCost` 19456 KiB = 19 MiB, `timeCost` 2, `parallelism` 1), `verify` à temps constant ; politique de rehash si les paramètres évoluent ; utilitaire de mesure de coût de hachage exposé pour les tests ; **aucun log de mot de passe ni de hash**.
- **Critères :** *Given* un mot de passe valide, *When* il est haché, *Then* le hachage prend ~100 ms (± 50 %) et commence par `$argon2id$`. *Given* un mot de passe erroné, *When* il est vérifié, *Then* `verify` retourne `false` sans révéler d'information. *Given* deux hachages du même mot de passe, *Then* ils diffèrent (sel aléatoire).
- **DoD :** Coût mesuré et consigné ; sel aléatoire vérifié ; aucun secret journalisé ; réhash supporté ; les 3 tests de `TESTS.md §2.2` passent.
- **Tests exigés :** tests unitaires du `PasswordService` (hachage, vérification, coût, unicité du sel, rehash).
- **SP :** 5 · **Dépend de :** `TAKT-L01-03` · **Bloque :** `TAKT-L03-03`.

#### TAKT-L03-02 — Implémenter la signature JWT RS256 (accès court + refresh rotatif)
- **Objectif :** Produire et valider les jetons d'accès (15 min) et de rafraîchissement (7 j, rotation à chaque usage).
- **Exigences :** `EX-SEC-01`, `ST_TAKT §5.1`, `DL-TE-07`, `TE-API-01`, `TESTS.md §6.1`.
- **Périmètre :** `apps/backend/src/modules/auth/**` (`TokenService`, `JwtStrategy`, clés RSA), `apps/backend/src/config/auth.config.ts`. **Hors périmètre :** stockage des refresh tokens (L03-03).
- **Livrables :** `TokenService` : accès RS256 TTL 15 min (claims `sub`, `role`, `departementIds`, `jti`), refresh RS256 TTL 7 j avec `jti` unique ; pairage de clés publique/privée (fichiers PEM, jamais en dur) ; rotation des clés supportée (`kid` dans l'en-tête) ; validation stricte (signature, `exp`, `nbf`, `iss`, `aud`) ; blacklist des refresh tokens révoqués.
- **Critères :** *Given* un access token signé avec une autre clé, *When* il est vérifié, *Then* la vérification échoue. *Given* un access token expiré, *Then* 401 `UNAUTHORIZED`. *Given* un refresh token déjà utilisé, *When* il est rejoué, *Then* il est rejeté (rotation = détection de rejeu) et la famille de tokens est révoquée.
- **DoD :** Access 15 min / refresh 7 j respectés (test sur l' Claims `exp`) ; rejeu détecté ; clés hors du code ; `kid` supporté ; tests de `TESTS.md §2.2` verts.
- **Tests exigés :** tests unitaires (signature, expiration, mauvais algorithme — rejet de `alg: none`, révocation).
- **SP :** 5 · **Dépend de :** `TAKT-L03-01` · **Bloque :** `TAKT-L03-03`, `TAKT-L03-04`.

#### TAKT-L03-03 — Exposer les endpoints login / refresh / logout
- **Objectif :** Livrer le parcours d'authentification complet, conforme à la stratégie de session arbitrée en `TAKT-L00-04`.
- **Exigences :** `EX-SEC-01`, `TE-API-01`, `ST_TAKT §3.2`, `IX-COM-01`, `IX-COM-02`, `UF-*` auth.
- **Périmètre :** `apps/backend/src/modules/auth/auth.controller.ts`, `auth.service.ts`, `apps/frontend/src/pages/auth/**`, `apps/frontend/src/stores/userStore.ts`. **Hors périmètre :** gestion des utilisateurs (L03-04).
- **Livrables :** `POST /api/v1/auth/login` (200 : access token + cookie refresh `HttpOnly`/`Secure`/`SameSite=Strict` ; 401 compte inactif ou mot de passe faux **sans distinguer les deux**) ; `POST /api/v1/auth/refresh` (rotation : nouveau refresh, révocation de l'ancien) ; `POST /api/v1/auth/logout` (révoque la famille de refresh) ; limitation de débit (5 tentatives / 15 min / IP + utilisateur, 429) ; page `EC-COM-01` de connexion avec formulaire React Hook Form + Zod.
- **Critères :** *Given* des identifiants valides, *When* on se connecte, *Then* un access token est retourné et un cookie refresh est posé. *Given* un mot de passe invalide, *Then* la réponse est 401 `UNAUTHORIZED` **sans** révéler si l'utilisateur existe. *Given* 6 tentatives échouées en 15 min, *Then* la 6ᵉ est 429. *Given* un logout, *Then* le refresh token est révoqué.
- **DoD :** Les 3 endpoints implémentés et testés ; le cookie porte bien les 3 attributs ; rate limiting actif ; le message d'erreur ne distingue pas compte inexistant / mot de passe faux ; page de connexion fonctionnelle et accessible clavier.
- **Tests exigés :** tests d'intégration des 3 endpoints (200/400/401/429), test du cookie (`Set-Cookie` vérifié), test E2E Playwright du parcours `EC-COM-01`.
- **SP :** 5 · **Dépend de :** `TAKT-L02-02`, `TAKT-L03-01`, `TAKT-L03-02`, `TAKT-L00-04` · **Bloque :** `TAKT-L03-04`, `TAKT-L03-05`, `TAKT-L09-01`.

#### TAKT-L03-04 — Implémenter le CRUD utilisateurs et l'attribution des rôles
- **Objectif :** Permettre à l'`admin` de gérer les comptes (création, édition, activation/désactivation) et les 4 rôles.
- **Exigences :** `EX-ROL-01`, `EX-ROL-02`, `IX-ADM-01` à `IX-ADM-03`, `EC-ADM-01`, `ST_TAKT §3.2`.
- **Périmètre :** `apps/backend/src/modules/users/**`, `packages/db/prisma/schema.prisma` (modèles `Utilisateur`, `Role`), `apps/frontend/src/pages/admin/...utilisateurs`. **Hors périmètre :** `EC-ADM-01` complet (L09-04).
- **Livrables :** Endpoints `GET/POST /api/v1/users`, `GET/PUT/DELETE /api/v1/users/:id` ; 4 rôles `admin`, `gest`, `rdep`, `dir` (table `Role`, table de jonction pour les rôles multiples) ; désactivation = soft delete (`actif = false`, pas de suppression physique si l'utilisateur a un audit) ; affectation des départements pour `rdep` ; unicité de l'email (contrainte UNIQUE, erreur 400 métier) ; journalisation de chaque création/modification/désactivation.
- **Critères :** *Given* un email déjà utilisé, *When* on crée un utilisateur, *Then* 400 avec message explicite. *Given* un utilisateur désactivé, *When* il tente de se connecter, *Then* 401. *Given* un `rdep` affecté à 2 départements, *Then* ses jetons portent les 2 `departementIds`.
- **DoD :** CRUD complet testé ; rôles restricted aux 4 valeurs de `DL-03` ; désactivation effective ; audit écrit ; `admin` non supprimable (auto-protection testée).
- **Tests exigés :** tests d'intégration du CRUD (201/400/401/403/404) + test d'unicité email + test de désactivation.
- **SP :** 5 · **Dépend de :** `TAKT-L03-03`, `TAKT-L04-01` · **Bloque :** `TAKT-L03-05`, `TAKT-L09-04`.

#### TAKT-L03-05 — Implémenter le RBAC et la portée par département
- **Objectif :** Garantir qu'un `rdep` ne voit et ne modifie que son périmètre, et que chaque endpoint est protégé par rôle.
- **Exigences :** `EX-SEC-02`, `EX-ROL-02`, `RB-UI-01`, `ST_TAKT §5.2`, `ST_TAKT §5.3`, `TE-API-03`.
- **Périmètre :** `apps/backend/src/common/guards/**`, `apps/backend/src/common/decorators/**`, `apps/backend/src/common/rbac/**`. **Hors périmètre :** la matrice des transitions (L06-02).
- **Livrables :** Décorateurs `@Roles('admin','gest')`, `@RequireVersionStates('edition','valid_pedag')`, `@DepartmentScope()` ; guard `RolesGuard` (rôle) ; guard `VersionStateGuard` (état de version) ; guard `DepartmentScopeGuard` (filtre automatique des requêtes Prisma sur `departementId`) ; table de correspondance rôle × endpoint ; toute tentative d'accès hors périmètre → 403 `FORBIDDEN` (jamais 404 pour ne pas discloser l'existence de la ressource hors périmètre… arbitrage à documenter).
- **Critères :** *Given* un `rdep` du département A, *When* il liste les affectations du département B, *Then* le résultat est filtré sur A. *Given* un `dir`, *When* il tente un CRUD de référentiel, *Then* 403. *Given* un `admin`, *When* il consulte le journal d'audit, *Then* 200.
- **DoD :** Matrice rôle × endpoint documentée dans `docs/ARCHITECTURE_BACKEND.md` ; 3 guards unit-testés ; test automatique vérifiant qu'**aucun** endpoint métier n'est sans guard (scan du code) ; filtrage département testé sur 2 départements.
- **Tests exigés :** tests d'intégration de la matrice 4 rôles × 4 catégories de ressource ; test de scan « endpoint non protégé ».
- **SP :** 5 · **Dépend de :** `TAKT-L03-03`, `TAKT-L03-04` · **Bloque :** `TAKT-L06-02`, `TAKT-L09-02`.

#### TAKT-L03-06 — Implémenter le journal d'audit en écriture
- **Objectif :** Tracer toute mutation métier de façon immuable et exploitable.
- **Exigences :** `EX-DAT-05`, `TE-API-05`, `TE-SEC-05`, `ST_TAKT §5.4`, `EC-ADM-04`.
- **Périmètre :** `apps/backend/src/modules/audit/**` (service d'écriture, intercepteur d'audit), `packages/db/prisma/schema.prisma` (modèle `JournalAudit`). **Hors périmètre :** consultation/filtrage (L11-01).
- **Livrables :** Service `AuditService.record()` : champs `action`, `horodatage`, `utilisateurId`, `entite`, `entiteId`, `metadata` JSONB ; catalogue d'actions normalisé (`CREATION`, `MODIFICATION`, `SUPPRESSION`, `TRANSITION_ETAT`, `POSE_VERROU`, `LEVEE_VERROU`, `EXPORT`, `PUBLICATION`, `CONNEXION`, `FORCAGE_BAIL`) ; écriture **asynchrone** (file pg-boss) pour ne pas ralentir la requête ; table sans `updatedAt` et sans endpoint d'écriture (immuabilité applicative) ; rétention 3 ans (policy + tâche de purge).
- **Critères :** *Given* une transition d'état, *When* elle réussit, *Then* une ligne d'audit contient l'état source, l'état cible et l'identifiant de version. *Given* une suppression de référentiel, *Then* la ligne d'audit est **insérée avant** l'opération destructive. *Given* une tentative de modification d'une ligne d'audit, *Then* aucun endpoint ne le permet.
- **DoD :** Audit écrit sur les 10 actions du catalogue ; métadonnées JSONB exploitées ; écriture asynchrone sans perte (test : 100 mutations → 100 lignes) ; politique de rétention documentée.
- **Tests exigés :** tests d'intégration d'écriture + test de non-perte en mode asynchrone.
- **SP :** 5 · **Dépend de :** `TAKT-L03-05`, `TAKT-L01-04` · **Bloque :** `TAKT-L11-01`.

#### TAKT-L03-07 — Sécuriser les seeds et fournir les comptes de démonstration
- **Objectif :** Garantir un environnement reproductible avec 1 compte par rôle, sans aucun secret réel en dépôt.
- **Exigences :** `PLAN_MACRO E2.5`, `TESTS.md §9.1`, `GG-11`, `GG-03`.
- **Périmètre :** `packages/db/prisma/seed.ts` (existant), `scripts/seed-demo.ts`, `.env.example`. **Hors périmètre :** production (le seed est désactivé en prod).
- **Livrables :** Seed idempotent (`upsert`)(create 1 année / 2 semestres, 3 départements, 4 utilisateurs `admin`/`gest`/`rdep`/`dir`, enseignants, groupes, salles, matières, 1 version `initial`) ; mots de passe de démonstration lus depuis `SEED_DEMO_PASSWORD` (variable d'environnement, défaut uniquement en développement) ; **jamais** de mot de passe en dur ; garde `NODE_ENV=production` refusant l'exécution du seed ; documentation du jeu de données.
- **Critères :** *Given* un seed exécuté 2 fois, *Then* le résultat est identique (idempotence). *Given* `SEED_DEMO_PASSWORD` absente en développement, *Then* une valeur de développement est générée et affichée une seule fois en console. *Given* `NODE_ENV=production`, *Then* le seed refuse de s'exécuter.
- **DoD :** Idempotence vérifiée ; 4 comptes créés ; aucune valeur secrète dans le dépôt ; exécution refusée en production ; jeu de données conforme à `TESTS.md §9.1`.
- **Tests exigés :** test d'intégration du seed (idempotence, comptes, refus en production).
- **SP :** 4 · **Dépend de :** `TAKT-L03-04` · **Bloque :** `TAKT-L04-08`, `TAKT-L11-05`.

### Lot L04 — Référentiels métier & import (8 tickets · 44 SP)

#### TAKT-L04-01 — Implémenter le référentiel Établissement / Département / Parcours / Niveau / Groupe
- **Objectif :** Poser la hiérarchie institutionnelle de base, fondatrice de toute la portée RBAC.
- **Exigences :** `EX-REF-01`, `EX-REF-04`, `ST_TAKT §2.1`, `PLAN_MACRO E2.1`, `EC-ADM-02`.
- **Périmètre :** `packages/db/prisma/schema.prisma` (modèles `Etablissement`, `Departement`, `Parcours`, `Niveau`, `Groupe`), `apps/backend/src/modules/referentiels/**`, migration + `down.sql`. **Hors périmètre :** `Enseignant`, `Salle` (L04-03, L04-04).
- **Livrables :** 5 modèles avec PK `Uuid`, `code` fonctionnel UNIQUE par périmètre, `libelle`, relations (`Departement` → `Etablissement` ; `Groupe` → `Niveau` → `Parcours` → `Departement`) ; endpoints CRUD `GET/POST /api/v1/referentiels/<type>` avec filtres ; garde `admin` en écriture, lecture filtrée par les autres rôles (`EX-REF-04`) ; protection de suppression si des enfants existent (409 + message).
- **Critères :** *Given* un département créé avec un code déjà utilisé, *Then* 400 `VALIDATION_ERROR`. *Given* un groupe rattaché à un niveau inexistant, *Then* 400. *Given* un `rdep`, *When* il liste les groupes, *Then* il ne voit que ceux de son département. *Given* une tentative de suppression d'un département ayant des groupes, *Then* 409 et aucune suppression.
- **DoD :** 5 modèles migrés avec `down.sql` ; 5 endpoints CRUD testés ; unicité du code garantie par contrainte SQL **et** par schéma Zod ; garde `admin` vérifiée par test ; hiérarchie lisible via un endpoint de lecture « arbre ».
- **Tests exigés :** tests d'intégration CRUD par type (201/200/400/403/404/409) + test de portée `rdep`.
- **SP :** 5 · **Dépend de :** `TAKT-L03-04` · **Bloque :** `TAKT-L04-02`…`TAKT-L04-05`, `TAKT-L05-01`.

#### TAKT-L04-02 — Implémenter le référentiel TypeEnseignement / Grade / Module / Matière
- **Objectif :** Constituer le catalogue pédagogique (types d'enseignement, grades, modules, matières) et la matrice type × grade.
- **Exigences :** `EX-REF-01`, `EX-REF-04`, `PLAN_MACRO E2.2`, `ST_TAKT §2.1`, `EC-ADM-02`.
- **Périmètre :** `packages/db/prisma/schema.prisma` (modèles `TypeEnseignement`, `Grade`, `Module`, `Matiere`, table `ChargeRuleSet` amorcée), `apps/backend/src/modules/referentiels/**`. **Hors périmètre :** moteur de charge (L05-03).
- **Livrables :** 4 modèles + table associative `GradeTypeEnseignement` (matrice type × grade) ; endpoints CRUD ; champs `couleur` par type d'enseignement (affichage dans la grille EDT) ; seed des types standards (`CM`, `TD`, `TP`, `PROJET`) et grades ; garde `admin` en écriture.
- **Critères :** *Given* un grade sans type associé, *When* il est créé, *Then* la règle est refusée (le couple doit exister). *Given* la matrice type × grade, *When* elle est lue, *Then* elle est complète et ordonnée. *Given* une suppression de type utilisé par une matière, *Then* 409.
- **DoD :** 4 modèles + table associative migrés avec rollback ; matrice lisible via endpoint dédié ; seed des 4 typesstandards ; couleur par type présente ; tests CRUD verts.
- **Tests exigés :** tests d'intégration (matrice, couleur, protection de suppression).
- **SP :** 6 · **Dépend de :** `TAKT-L04-01` · **Bloque :** `TAKT-L05-01`, `TAKT-L05-03`.

#### TAKT-L04-03 — Implémenter le référentiel Enseignant et l'association N:N Département
- **Objectif :** Gérer les 400 enseignants et leur appartenance multi-département, fondement de la répartition pédagogique.
- **Exigences :** `EX-REF-02`, `EX-REF-01`, `SF_TAKT §2` (400 enseignants), `PLAN_MACRO E2.3`.
- **Périmètre :** `packages/db/prisma/schema.prisma` (modèles `Enseignant`, `EnseignantDepartement`), `apps/backend/src/modules/referentiels/**`, recherche plein texte (code, nom, prénom). **Hors périmètre :** affectations pédagogiques (L05-02).
- **Livrables :** Modèle `Enseignant` (matricule UNIQUE, nom, prénom, email, grade FK, actif) ; table `EnseignantDepartement` (PK composite) ; endpoints CRUD + recherche `/api/v1/referentiels/enseignants?search=` ; import CSV (L04-07) ; seed de 400 enseignants de démonstration.
- **Critères :** *Given* un enseignant rattaché à 2 départements, *When* il est enregistré, *Then* les 2 liens sont persistés. *Given* une recherche `?search=Benoit`, *Then* les résultats correspondent au nom **ou** au prénom. *Given* un matricule déjà existant, *Then* 400.
- **DoD :** Association N:N opérationnelle (jointure) ; recherche fonctionnelle sur 400 lignes ; unicité du matricule ; seed 400 enseignants ; test de la relation N:N.
- **Tests exigés :** tests d'intégration (CRUD, N:N, recherche, unicité).
- **SP :** 5 · **Dépend de :** `TAKT-L04-01`, `TAKT-L04-02` · **Bloque :** `TAKT-L05-02`.

#### TAKT-L04-04 — Implémenter le référentiel Salle / Site / TypeSalle / Équipement
- **Objectif :** Gérer les 150 salles transverses, avec typage, capacité et équipements, support des contraintes HC-ROOM-01 à HC-ROOM-03.
- **Exigences :** `EX-REF-03`, `HC-ROOM-01`, `HC-ROOM-02`, `HC-ROOM-03`, `PLAN_MACRO E2.3`.
- **Périmètre :** `packages/db/prisma/schema.prisma` (modèles `Site`, `TypeSalle`, `Salle`, `Equipement`, `SalleEquipement`), `apps/backend/src/modules/referentiels/**`. **Hors périmètre :** la salle est transverse à tout département (aucun FK `departementId`).
- **Livrables :** 5 modèles (`Salle` : code UNIQUE, `typeSalleId`, `capacite`, FK `siteId` ; `SalleEquipement` : N:N avec quantité) ; endpoints CRUD ; recherche par type / capacité / site / équipement disponible (indispensable au moteur de conflits et au solveur) ; seed 150 salles réparties sur 3 sites.
- **Critères :** *Given* une recherche `?capaciteMin=40&equipement=VIDEO`, *Then* seules les salles conforme sont retournées. *Given* une salle sans type, *Then* 400 (le type conditionne les contraintes d'affectation). *Given* une capacité ≤ 0, *Then* 400.
- **DoD :** Aucun lien `departementId` sur `Salle` (exigence `EX-REF-03` respectée et vérifiée par test) ; recherche multi-critères fonctionnelle ; seed 150 salles ; rollback de migration fourni.
- **Tests exigés :** tests d'intégration (recherche capacite+équipement, absence de FK département, CRUD).
- **SP :** 6 · **Dépend de :** `TAKT-L04-01` · **Bloque :** `TAKT-L06-05`, `TAKT-L07-01`.

#### TAKT-L04-05 — Implémenter le référentiel Créneaux et l'affichage Ramadan
- **Objectif :** Modéliser la grille horaire (jours, créneaux consécutifs, pas de 30 min) et ses variantes d'affichage Ramadan.
- **Exigences :** `EX-REF-06`, `HC-STR-01` à `HC-STR-03`, `PLAN_MACRO E2.4`, `TAKT-L00-03`.
- **Périmètre :** `packages/db/prisma/schema.prisma` (modèles `Creneau`, `CreneauAffichage`, `ConfigSysteme`), `apps/backend/src/modules/referentiels/**`. **Hors périmètre :** `EC-ADM-03` (L09-06).
- **Livrables :** Modèle `Creneau` (`jour` 1..6, `ordre` **consécutif et unique par jour**, `heureDebut`, `heureFin`, `dureeMinutes` = 30) ; modèle `CreneauAffichage` (variante `NORMAL` / `RAMADAN` : décalage horaire, reduction de la plage, libellé) ; paramètres système (`pasDeTempsMinutes` = 30, `joursOuvres` = [1..6], `creneauxParJour` = 24) ; endpoint de lecture de la grille horaire.
- **Critères :** *Given* un créneau dont `ordre` rompt la continuité du jour, *Then* 400. *Given* le mode Ramadan, *When* la grille est lue, *Then* les créneaux d'affichage sont décalés par rapport au mode Normal sans modifier les créneaux réels. *Given* une modification de `creneauxParJour`, *Then* les créneaux existants sont invalides (comptés comme non contigus).
- **DoD :** Continuité des `ordre` garantie par contrainte applicative + test ; paramètres système lisibles et modifiables par `admin` ; variantes NORMAL/RAMADAN disjointes ; règle de tempsinction documentée.
- **Tests exigés :** tests unitaires (continuité, bornes, Ramadan) + tests d'intégration de la lecture de grille.
- **SP :** 5 · **Dépend de :** `TAKT-L00-03`, `TAKT-L04-01` · **Bloque :** `TAKT-L06-03`, `TAKT-L07-01`.

#### TAKT-L04-06 — Fournir l'UI CRUD générique des référentiels
- **Objectif :** Livrer un composant de gestion de référentiel réutilisable couvrant les 5 écrans `EC-ADM-02`.
- **Exigences :** `EX-REF-04`, `EC-ADM-02`, `IX-ADM-04`, `IX-ADM-05`, `UI_FRONTEND_SPECS §2`, `UI_INTERACTIONS §2`.
- **Périmètre :** `apps/frontend/src/components/molecules/DataTable/**`, `apps/frontend/src/components/organisms/ReferentielManager/**`, `apps/frontend/src/pages/admin/**`, `apps/frontend/src/lib/api.ts`. **Hors périmètre :** les écrans spécifiques du gestionnaire (L09-08, L09-09).
- **Livrables :** `DataTable` (tri, pagination, recherche, actions, états vide/chargé/erreur/succès) ; `ReferentielManager` piloté par configuration (colonnes, schéma Zod, endpoint, champs) ; formulaires React Hook Form + Zod avec messages d'erreur en français ; confirmations de suppression ; gestion des 409 (conflit de référence) ; rendu conforme WCAG AA (états jamais par la seule couleur, `DL-UI-04`).
- **Critères :** *Given* un référentiel configuré, *When* la page s'ouvre, *Then* la table est paginée avec `meta.total` exact. *Given* un champ invalide, *Then* le message d'erreur est affiché sous le champ et la requête n'est pas envoyée. *Given* un 409, *Then* un message non bloquant explique la cause. *Given* un clavier seul, *Then** la pagination et les actions sont atteignables.
- **DoD :** Le composant est réutilisé par ≥ 3 écrans sans duplication de code ; 4 états requis implémentés et testés ; 0 erreur `axe-core` sur l'écran (`TAG: wcag2aa`) ; pagination alignée sur l'API.
- **Tests exigés :** tests d'intégration Testing Library (rendu, validation, 409, états) + test axe-core + test E2E Playwright d'un CRUD.
- **SP :** 8 · **Dépend de :** `TAKT-L02-02`, `TAKT-L02-03`, `TAKT-L08-05` · **Bloque :** `TAKT-L09-05`, `TAKT-L09-08`, `TAKT-L09-09`.

#### TAKT-L04-07 — Implémenter l'import CSV des référentiels avec rapport d'erreurs
- **Objectif :** Permettre l'import en lot des référentiels avec un rapport d'erreurs ligne à ligne, sans rejet global ni perte silencieuse.
- **Exigences :** `EX-REF-05`, `PLAN_MACRO E2.3`, `IX-GES-02`, `EC-GES-01`.
- **Périmètre :** `apps/backend/src/modules/referentiels/import/**`, `packages/contracts/src/referentiels.ts` (schéma CSV), `apps/frontend/src/components/organisms/ImportAssistant/**`. **Hors périmètre :** l'import depuis une année clôturée (L04-08).
- **Livrables :** Parseur CSV (en-têtes mappés, encodage UTF-8, séparateur `;` tolérant) ; validation par schéma Zod **par ligne** ; traitement en transaction par lot avec points de sauvegarde (lignes valides importées, lignes invalides rejetées **sans** faire échouer le lot) ; rapport `{ ligne, champ, valeur, motif }` ; aperçu avant confirmation (`TE-MET-10` : aperçu obligatoire) ; import limited aux rôles `admin`/`gest`.
- **Critères :** *Given* un CSV de 100 lignes dont 3 sont invalides, *When* l'import est confirmé, *Then* 97 lignes sont importées et 3 sont listées avec motif. *Given* un CSV dont les en-têtes sont inconnus, *Then* 400 avant toute écriture. *Given* un import avec un code déjà existant, *Then* la ligne est rejetée avec motif « code déjà utilisé » et les autres lignes sont importées.
- **DoD :** Traitement ligne à ligne sans rejet global ; rapport téléchargeable ; aperçu obligatoire bloquant la confirmation sans clic ; aucune écriture partielle non tracée ; test sur 100 lignes.
- **Tests exigés :** tests d'intégration (CSV valide, partiellement invalide, en-têtes inconnus, idempotence sur re-import) + test E2E de l'assistant d'import.
- **SP :** 5 · **Dépend de :** `TAKT-L04-03`, `TAKT-L04-04`, `TAKT-L02-02` · **Bloque :** `TAKT-L09-08`.

#### TAKT-L04-08 — Implémenter l'import sélectif depuis une année clôturée
- **Objectif :** Permettre de dupliquer sélectivement les données de base d'une année antérieure en conservant le lien d'origine.
- **Exigences :** `EX-REF-05`, `EX-WKF-06`, `TE-MET-10`, `IX-GES-02`, `EX-OUV-02`.
- **Périmètre :** `apps/backend/src/modules/referentiels/import/import-archive/**`, `packages/db/prisma/schema.prisma` (champ `originId` sur les modèles importables), `apps/frontend/src/components/organisms/ImportAssistant/**` (étape « année source »). **Hors périmètre :** duplication de version EDT (L10-07).
- **Livrables :** Sélection de l'année source **et** des types de données à importer (matière, module, salle, groupe, parcours) ; aperçu chiffré (X lignes de Y type seront importées) ; conservation du `originId` pointant vers l'enregistrement source ; import idempotent (un `originId` déjà importé n'est pas réimporté) ; aucun import des séances, affectations validées ni versions.
- **Critères :** *Given* une année source et 3 types cochés, *When* l'aperçu est affiché, *Then* le compte exact par type est affiché avant confirmation. *Given* un enregistrement portant déjà un `originId` identique, *Then* il n'est pas dupliqué. *Given* une tentative d'importer des **séances**, *Then* le type est désactivé dans l'assistant.
- **DoD :** `originId` persisté et indexé ; aperçu exact (test : compte importé = compte annoncé) ; import idempotent ; liste fermée des types importables ; aucun import de données de planning.
- **Tests exigés :** tests d'intégration (import sélectif, idempotence, `originId`, types interdits).
- **SP :** 4 · **Dépend de :** `TAKT-L04-07` · **Bloque :** `TAKT-L09-08`.

### Lot L05 — Répartition pédagogique & charge horaire (6 tickets · 34 SP)

#### TAKT-L05-01 — Implémenter le plan d'études (parcours → niveaux → matières → volumes)
- **Objectif :** Modéliser et exposer le plan d'études, source des volumes horaires à planifier.
- **Exigences :** `EX-REP-01`, `EX-DAT-02`, `PLAN_MACRO E2.2`, `EC-GES-02`, `IX-GES-03`.
- **Périmètre :** `packages/db/prisma/schema.prisma` (modèles `PlanEtudes`, `PlanEtudesMatiere`, `Groupe` ↔ plan), `apps/backend/src/modules/repartition/**`. **Hors périmètre :** le calcul de charge (L05-03).
- **Livrables :** Modèle `PlanEtudes` (parcours, niveau, année, semestre, FK `departementId`) ; `PlanEtudesMatiere` (matière FK, `volumeHoraire` hebdomadaire, `typeEnseignementId`, `dureeCreneaux`, `coefficient`) ; héritage par groupe (un groupe hérite du plan de son niveau) ; endpoints CRUD + agrégat « volume total d'un plan » ; garde de department (`rdep` limité à son périmètre).
- **Critères :** *Given* un plan avec 3 matières de volumes 2 h, 2 h et 1 h, *When* le total est calculé, *Then* 5 h hebdomadaires. *Given* un `rdep`, *When* il lit un plan d'un autre département, *Then* 403 ou liste vide filtrée. *Given* un volume ≤ 0, *Then* 400.
- **DoD :** Modèles migrés avec rollback ; agrégat exact (test sur valeurs connues) ; héritage par groupe fonctionnel ; périmètre département respecté.
- **Tests exigés :** tests d'intégration (CRUD, agrégat, héritage, garde de périmètre).
- **SP :** 5 · **Dépend de :** `TAKT-L04-01`, `TAKT-L04-02` · **Bloque :** `TAKT-L05-02`, `TAKT-L05-03`.

#### TAKT-L05-02 — Implémenter les affectations pédagogiques (enseignant ↔ matière ↔ groupe)
- **Objectif :** Saisir et persister les affectations, pivot entre répartition pédagogique et planning.
- **Exigences :** `EX-REP-01`, `EX-REP-02`, `EX-DAT-01`, `TE-MET-03`, `IX-RDEP-01`.
- **Périmètre :** `packages/db/prisma/schema.prisma` (modèle `AffectationPedagogique`), `apps/backend/src/modules/repartition/**`. **Hors périmètre :** la validation (L05-04).
- **Livrables :** Modèle `AffectationPedagogique` (FK `enseignantId`, `matiereId`, `groupeId`, `typeEnseignementId`, `volumeHebdo`, `dureeCreneaux`, `departementId` dénormalisé pour le RBAC, `versionId` de la version de travail) ; unicité du triplet (enseignant, matière, groupe) dans une version ; endpoints CRUD `/api/v1/affectations` ; création en cascade depuis le plan d'études ; journal d'audit des mutations.
- **Critères :** *Given* une affectation dont le volume ne correspond pas au plan, *Then* un **avertissement** est retourné (pas un blocage — la divergence pédagogique est arbitrée par la MOA). *Given* un triplet déjà affecté dans la même version, *Then* 409. *Given* une affectation dont l'enseignant n'appartient pas au département, *Then* 400.
- **DoD :** CRUD + garde de département ; unicité testée ; divergence plan/affectation signalée sans blocage ; audit écrit ; affectsions liées à une version.
- **Tests exigés :** tests d'intégration (CRUD, 409, garde de département, avertissement de divergence).
- **SP :** 6 · **Dépend de :** `TAKT-L05-01`, `TAKT-L04-03` · **Bloque :** `TAKT-L05-03`, `TAKT-L05-04`.

#### TAKT-L05-03 — Implémenter le moteur de charge horaire (ChargeRuleSet)
- **Objectif :** Centraliser le calcul de la charge horaire : seuil, plafond, arrondi, coefficients, équilibrage.
- **Exigences :** `EX-PRI-05`, `DL-07`, `ST_TAKT §0.2 B6`, `SC-LOAD-01` à `SC-LOAD-03`, `TE-TEST-02`.
- **Périmètre :** `packages/charge-engine/**` (nouveau, package pur et déterministe), `packages/db/prisma/schema.prisma` (modèle `ChargeRuleSet`). **Hors périmètre :** l'UI de paramétrage (L09-06).
- **Livrables :** Package **pur** (aucune dépendance DB ni réseau) exportant `computeCharge(affectations, ruleSet)` ; règles : seuil d'alerte, plafond de charge, arrondi (unitaire / demi-journée / journée), coefficients par type d'enseignement, cible hebdomadaire par grade, équilibrage intra-département ; `ChargeRuleSet` versionné (une version active + historique) ; résultats : charge par enseignant, par département, taux de dépassement, écarts d'équilibrage ; **100 % des branches testées** (service critique).
- **Critères :** *Given* un enseignant à 19 h pour une cible de 19 h, *When* la charge est calculée, *Then* le taux est 100 % et aucun avertissement n'est émis. *Given* un enseignant à 22 h pour un plafond de 20 h, *Then* le dépassement est signalé **bloquant**. *Given* deux enseignants d'un même département à 20 h et 10 h, *Then* l'écart d'équilibrage est calculé. *Given* un arrondi à la demi-journée et 3 h de charge, *Then* l'arrondi est appliqué selon la règle configurée.
- **DoD :** Package sans dépendance I/O ; 100 % des branches couvertes ; règles configurables par `ChargeRuleSet` versionné ; même entrée → même sortie (test de déterminisme) ; intégration au workflow de répartition documentée.
- **Tests exigés :** tests unitaires exhaustifs (chaque règle, chaque borne, chaque arrondi) + test de déterminisme.
- **SP :** 8 · **Dépend de :** `TAKT-L05-02`, `TAKT-L04-02` · **Bloque :** `TAKT-L05-04`, `TAKT-L06-09`.

#### TAKT-L05-04 — Implémenter la validation de la répartition pédagogique et son snapshot immuable
- **Objectif :** Permettre au `rdep` de valider sa répartition, figeant la charge horaire dans un snapshot immuable.
- **Exigences :** `EX-REP-02`, `EX-REP-03`, `EX-REP-05`, `EX-DAT-01`, `EX-PRI-02`, `DL-07`, `IX-RDEP-02`.
- **Périmètre :** `apps/backend/src/modules/repartition/**` (service `RepartitionService`), `packages/db/prisma/schema.prisma` (modèle `Snapshot`). **Hors périmètre :** la machine à états des versions (L06-02).
- **Livrables :** Service de validation : vérifie la complétude de la répartition du département (toutes les matières du plan ont une affectation), calcule la charge via le moteur (L05-03), **fige** la répartition + la charge dans un `Snapshot` JSONB immuable (horodaté, `versionId`, `departementId`, checksum SHA-256) ; la charge devient **non modifiable** pour la version courante ; annulation possible tant qu'aucune affectation n'est validée (retour à `initial`) ; le `gest` peut consulter mais pas modifier (`EX-REP-03`).
- **Critères :** *Given* une répartition incomplète, *When* le `rdep` valide, *Then* 400 listant les matières sans affectation. *Given* une répartition complète, *When* elle est validée, *Then* un snapshot est créé et la charge est gelée. *Given* une tentative de modification d'une affectation validée, *Then* 409 `WORKFLOW_INVALID_TRANSITION`. *Given* une répartition validée, *When* on tente une annulation, *Then** 409.
- **DoD :** Snapshot immuable créé et checksum vérifiable ; charge gelée (test : tentative de modification → 409) ; annulation conforme à `EX-REP-05` ; `gest` en lecture seule ; transition vers `brouillon` câblée sur l'événement de validation.
- **Tests exigés :** tests d'intégration (validation complète/incomplète, gel, annulation, droits `gest`) + test d'intégrité du snapshot (checksum).
- **SP :** 5 · **Dépend de :** `TAKT-L05-02`, `TAKT-L05-03` · **Bloque :** `TAKT-L06-01`, `TAKT-L07-01`.

#### TAKT-L05-05 — Implémenter la revalidation ciblée d'un département impacté
- **Objectif :** Ne reboucler la validation que sur les départements réellement affectés par une modification.
- **Exigences :** `EX-REP-04`, `EX-WKF-09`, `IX-RDEP-04`, `EC-RDEP-04`, `ST_TAKT §1.4`.
- **Périmètre :** `apps/backend/src/modules/repartition/**`, `apps/backend/src/modules/versions/**` (service de transition, dépendance L06-02). **Hors périmètre :** les écrans (L09-12).
- **Livrables :** Détection du périmètre impacté (comparaison snapshot courant ↔ snapshot précédent, sur les affectations du département) ; marquage `revalidationRequise` sur la version pour le seul département concerné ; remise en état `rep_pedag` **localisée** (les autres départements conservent leur validation) ; journalisation de la revalidation ; notification au `rdep` concerné (via le module notifications, L10-06).
- **Critères :** *Given* une modification ne concernant que le département A, *When* elle est appliquée, *Then* seul A est marqué `revalidationRequise`. *Given* une modification de la Direction en `valid_dir`, *When* elle impacte A, *Then* A repasse en attente de revalidation. *Given* un département B non impacté, *Then* sa validation est conservée.
- **DoD :** Périmètre impacté détecté par comparaison de snapshots (test : 1 département impacté sur 3) ; état de validation par département conservé indépendamment ; journalisation ; notification émise.
- **Tests exigés :** tests d'intégration (impact ciblé, non-régression des autres départements, notification).
- **SP :** 5 · **Dépend de :** `TAKT-L05-04`, `TAKT-L06-02` · **Bloque :** `TAKT-L09-12`.

#### TAKT-L05-06 — Fournir l'UI de saisie et de validation de la répartition pédagogique
- **Objectif :** Permettre au `rdep` de saisir, contrôler et valider sa répartition (écrans `EC-RDEP-01`, `EC-RDEP-02`).
- **Exigences :** `EX-REP-01`, `EX-REP-02`, `EC-RDEP-01`, `EC-RDEP-02`, `IX-RDEP-01`, `IX-RDEP-02`, `UF-RDEP-01`.
- **Périmètre :** `apps/frontend/src/pages/rdep/**`, `apps/frontend/src/components/organisms/AffectationEditor/**`, `apps/frontend/src/stores/versionStore.ts`. **Hors périmètre :** `EC-RDEP-03`…`05` (L09-12).
- **Livrables :** `EC-RDEP-01` : saisie des affectations (matière, groupe, enseignant, type, volume) avec contrôle de charge en direct (indicateurs seuil/plafond issues de `charge-engine`) ; `EC-RDEP-02` : récapitulatif par département (matières couvertes, charges, écarts) + bouton « Valider ma répartition » + bouton « Annuler » ; affichage du gel après validation ; états vide/chargé/erreur ; conformité WCAG AA.
- **Critères :** *Given* une matière sans affectation, *When* le `rdep` valide, *Then* le bouton est désactivé et la matière manquante est signalée. *Given* un enseignant au-dessus du plafond, *Then* un avertissement bloquant est affiché avant validation. *Given* une répartition validée, *Then* les champs sont en lecture seule et un bandeau « Validée le {date} » est affiché.
- **DoD :** Les 2 écrans sont fonctionnels ; les indicateurs de charge sont cohérents avec l'API ; garde-fou de complétitude actif ; bandeau de gel présent ; 0 erreur axe-core ; parcours `UF-RDEP-01` couvert en E2E.
- **Tests exigés :** tests d'intégration Testing Library (indicateurs, garde-fou, gel) + test E2E Playwright `UF-RDEP-01`.
- **SP :** 8 · **Dépend de :** `TAKT-L05-04`, `TAKT-L08-04` · **Bloque :** `TAKT-L09-12`.

### Lot L06 — Versions, séances, conflits, bail, verrous (10 tickets · 62 SP)

#### TAKT-L06-01 — Modéliser la version d'EDT et ses 10 états
- **Objectif :** Porter la version d'EDT comme agrégat racine, avec ses 10 états et son immuabilité structurelle.
- **Exigences :** `EX-WKF-01`, `EX-PRI-02`, `EX-DAT-01`, `DL-02`, `DL-05`, `ST_TAKT §2.1`.
- **Périmètre :** `packages/db/prisma/schema.prisma` (modèle `Version` + enum `EtatVersion`), `apps/backend/src/modules/versions/**`, migration + `down.sql`. **Hors périmètre :** les transitions (L06-02).
- **Livrables :** Modèle `Version` (`anneeId`, `semestreId`, `etat` enum des 10 valeurs `initial`/`rep_pedag`/`brouillon`/`generation`/`edition`/`valid_pedag`/`valid_dir`/`valide`/`publie`/`archive`, `snapshotIds` de référence, `datePublication`, `publiePar`) ; contrainte d'unicité « **une seule version `publie` par semestre** » (`ST_TAKT B2`) ; garde d'immuabilité applicative des enregistrements `publie` ; endpoints de création (depuis `initial` ou depuis une version archivée, `EX-WKF-06`) et de consultation.
- **Critères :** *Given* un semestre déjà publié, *When* on crée une nouvelle version `publie`, *Then* 409. *Given* une version `publie`, *When* on tente toute modification de son contenu, *Then* 409 `WORKFLOW_INVALID_TRANSITION`. *Given* une version archivée, *When* on duplique, *Then* une nouvelle version `initial` est créée et l'archive reste consultable.
- **DoD :** Enum des 10 états conforme à `DL-02` ; contrainte d'unicité de publication testée ; immuabilité testée ; duplication depuis archive fonctionnelle ; rollback de migration fourni.
- **Tests exigés :** tests d'intégration (création, duplication, unicité publication, immuabilité).
- **SP :** 8 · **Dépend de :** `TAKT-L05-04`, `TAKT-L01-04` · **Bloque :** `TAKT-L06-02`, `TAKT-L06-03`, `TAKT-L10-07`.

#### TAKT-L06-02 — Implémenter le moteur de transitions (10 états, 19 transitions, gardes)
- **Objectif :** Centraliser l'unique machine à états autorisant les transitions, avec contrôle du rôle et des conditions de garde.
- **Exigences :** `EX-WKF-01` à `EX-WKF-09`, `TE-API-03`, `TE-MET-07`, `TE-MET-08`, `WORKFLOW_METIER §3`, `ST_TAKT §4.1`, `TAKT-L00-01`.
- **Périmètre :** `apps/backend/src/modules/versions/workflow/**` (matrice, machine, service de transition), `apps/backend/src/modules/versions/versions.controller.ts` (`POST /api/v1/versions/:id/transition`). **Hors périmètre :** les garde-fous métier spécifiques (L06-05, L06-08, L06-09).
- **Livrables :** Matrice déclarative des 19 transitions (`from`, `to`, `action`, `rôles autorisés`, `condition de garde`, `motif obligatoire`) issue de `WORKFLOW_METIER §3` **arbitrée** ; moteur générique `canTransition(etat, action, role, contexte)` ; endpoint unique de transition renvoyant 409 `WORKFLOW_INVALID_TRANSITION` avec la liste des transitions autorisées depuis l'état courant ; rejet sans motif → 400 ; **100 % des branches testées** (service critique) ; journalisation de chaque transition (état source/cible/action).
- **Critères :** *Given* une version `valid_dir` et le rôle `dir`, *When* la transition `valider` est demandée, *Then* la version passe en `valide`. *Given* une version `publie`, *When* une transition autre que `archiver` est demandée, *Then* 409. *Given* un rejet sans motif, *Then* 400. *Given* un `rdep` tentant une transition réservée au `gest`, *Then* 403. *Given* la matrice complète, *Then* les 19 transitions de la matrice canonique sont acceptées et les autres rejetées.
- **DoD :** Matrice des 19 transitions implémentée à l'identique du corpus arbitré ; 100 % des branches couvertes ; motif obligatoire enforced ; audit écrit ; 409 accompagné des transitions possibles.
- **Tests exigés :** tests unitaires exhaustifs (matrice 19 transitions × 4 rôles) + tests d'intégration de l'endpoint.
- **SP :** 8 · **Dépend de :** `TAKT-L06-01`, `TAKT-L03-05`, `TAKT-L00-01` · **Bloque :** `TAKT-L05-05`, `TAKT-L06-03`, `TAKT-L07-07`, `TAKT-L10-07`.

#### TAKT-L06-03 — Implémenter le CRUD des séances sur la grille hebdomadaire
- **Objectif :** Permettre la création, la modification et la suppression de séances récurrentes dans la grille.
- **Exigences :** `EX-EDI-01`, `EX-PER-01`, `B1` (`ST_TAKT §0.2`), `TE-MET-03`, `ST_TAKT §4.1`.
- **Périmètre :** `packages/db/prisma/schema.prisma` (modèle `Seance`), `apps/backend/src/modules/planning/**` (contrôleur, service), `apps/backend/src/modules/planning/dto/**`. **Hors périmètre :** la détection de conflits (L06-05).
- **Livrables :** Modèle `Seance` (**sans date** : `versionId`, `jour`, `creneauDebutId`, `nbCreneaux`, `salleId`, `groupeId`, `enseignantId`, `matiereId`, `typeEnseignementId`, `affectationId` FK, `contrainte de couverture`) ; endpoints `GET/POST /api/v1/seances`, `GET/PUT/PATCH/DELETE /api/v1/seances/:id` ; validation : `nbCreneaux ≥ 1`, créneaux consécutifs dans la plage du jour, séance liée à une affectation existante (`TE-MET-03`) ; suppression d'une affectation → cascade **avec vérification** (`TE-MET-04`) ; liste par version (optimisée pour la grille).
- **Critères :** *Given* une séance sans affectation valide, *When* on la crée, *Then* 400. *Given* une séance de 2 créneaux non consécutifs, *Then* 400. *Given* une affectation supprimée, *Then* les séances liées sont supprimées **après** vérification et l'opération est tracée. *Given* une version `publie`, *When* on modifie une séance, *Then* 409.
- **DoD :** Absence de champ date dans `Seance` (exigence `B1`) ; CRUD testé ; création en cascade non destructive testée ; règle de couverture appliquée au sein de l'affectation.
- **Tests exigés :** tests d'intégration (CRUD, 400/409/404, cascade, continuité des créneaux).
- **SP :** 5 · **Dépend de :** `TAKT-L06-01`, `TAKT-L06-02`, `TAKT-L04-05` · **Bloque :** `TAKT-L06-04`, `TAKT-L06-05`, `TAKT-L09-09`.

#### TAKT-L06-04 — Poser les contraintes SQL d'unicité et les index de performance
- **Objectif :** Garantir l'intégrité des conflits **au niveau de la base**, pour que le contrôle applicatif ne soit jamais la seule protection.
- **Exigences :** `HC-RES-01`, `HC-RES-02`, `HC-RES-03`, `ST_TAKT §2.3`, `ST_TAKT §2.4`, `PLAN_MACRO` risque « conflits non détectés ».
- **Périmètre :** `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/**`, `packages/db/prisma/seed.ts`. **Hors périmètre :** la détection applicative (L06-05).
- **Livrables :** Contraintes UNIQUE : `(versionId, jour, creneauDebutId, salleId)` pour les salles occupées ; index composites sur `(versionId, jour, creneauDebutId, enseignantId)` et `(versionId, jour, creneauDebutId, groupeId)` ; contrainte d'unicité de publication (L06-01) ; index sur `Version.etat`, `AffectationPedagogique.versionId`, `JournalAudit.horodatage` ; partitionnement non requis en v1 (justifié par la volumétrie : 4 000 séances/semestre).
- **Critères :** *Given* deux séances de même jour, créneau et salle, *When* la seconde est insérée, *Then* la base rejette l'insertion (violation UNIQUE). *Given* un plan d'exécution `EXPLAIN` sur la liste des séances d'une version, *Then* aucun scan séquentiel sur 4 000 lignes. *Given* une migration appliquée, *When* le `down.sql` est exécuté, *Then* les contraintes sont retirées proprement.
- **DoD :** Contraintes UNIQUE testées par tentative de doublon (3 cas) ; plan d'exécution capturé dans le compte rendu ; `prisma migrate reset` sans erreur ; rollback testé.
- **Tests exigés :** tests d'intégration d'intégrité (violations UNIQUE) + script de vérification des index.
- **SP :** 5 · **Dépend de :** `TAKT-L06-03` · **Bloque :** `TAKT-L06-05`, `TAKT-L07-01`.

#### TAKT-L06-05 — Implémenter le moteur de conflits (12 types, 3 sévérités)
- **Objectif :** Détecter et classer tous les conflits d'une séance, avec sévérité bloquant / avertissement / information.
- **Exigences :** `EX-EDI-02`, `ST_TAKT §4.3`, `HC-RES-01` à `HC-RES-03`, `HC-ROOM-01` à `HC-ROOM-03`, `SC-LOAD-01`, `SC-LOAD-02`, `TE-TEST-02`.
- **Périmètre :** `packages/conflict-engine/**` (nouveau, package pur), `apps/backend/src/modules/planning/conflict/**`. **Hors périmètre :** la simulation d'alternatives (L06-06).
- **Livrables :** Package pur exportant `detectConflicts(seance, contexte)` retournant une liste `{ type, severite, message, details }` ; 12 types : enseignant, groupe, salle, capacité, équipement, compatibilité, indisponibilité, pause, règle pédagogique, verrou, covoiturage, vœu, donnée manquante ; sévérité : `BLOQUANT` / `AVERTISSEMENT` / `INFORMATION` ; hiérarchie : un `BLOQUANT` interdit la soumission ; sortie 409 avec la liste complète des conflits ; **100 % des branches testées** (service critique).
- **Critères :** *Given* deux séances de même enseignant, jour et créneau, *Then* un conflit `BLOQUANT` de type « enseignant » est retourné. *Given* une salle de capacité 20 pour un groupe de 30, *Then* un conflit `BLOQUANT` « capacité » est retourné (marge 10 % → seuil effectif 33). *Given* un-voeu non respecté, *Then* le conflit est de sévérité `AVERTISSEMENT` ou `INFORMATION` selon la règle. *Given* un备课-type de conflit inconnu, *Then* la classification par défaut est documentée.
- **DoD :** 12 types implémentés et testés un par un ; 3 sévérités exactement ; 100 % des branches couvertes ; package sans dépendance I/O ; conflit `BLOQUANT` → 409 documenté.
- **Tests exigés :** tests unitaires (1 cas par type × 3 sévérités + combinaisons) + tests d'intégration de l'API.
- **SP :** 8 · **Dépend de :** `TAKT-L06-04`, `TAKT-L04-04`, `TAKT-L05-03` · **Bloque :** `TAKT-L06-06`, `TAKT-L06-09`, `TAKT-L09-10`.

#### TAKT-L06-06 — Implémenter la simulation d'alternatives de placement
- **Objectif :** Proposer jusqu'à 20 alternatives classées pour une séance en conflit, **sans aucune écriture**.
- **Exigences :** `EX-EDI-03`, `RB-UI-05`, `EC-GES-07`, `IX-GES-10`.
- **Périmètre :** `apps/backend/src/modules/planning/simulation/**`, `packages/conflict-engine/**` (extension). **Hors périmètre :** l'application effective (L09-10).
- **Livrables :** Endpoint `POST /api/v1/seances/:id/simuler` (body : créneau/salle/enseignant cibles optionnels) : recherche des emplacements candidats (créneaux du même jour × salles libres), évaluation de chaque candidat via le moteur de conflits, classement par nombre de conflits pondérés puis parulfluence critères (contiguïté, heures tardives, préférences) ; maximum 20 résultats ; **garantie de non-écriture** (transaction en lecture seule, aucun audit) ; réponse avec `candidat` + `conflitsResiduels` + `score`.
- **Critères :** *Given* une séance en conflit, *When* la simulation est lancée, *Then* jusqu'à 20 alternatives sont retournées, triées du meilleur au moins bon. *Given* aucun emplacement valide, *Then* une liste vide est retournée avec un message explicite. *Given* la simulation, *Then* la base est inchangée (comparaison de l'état avant/après dans le test) et **aucune ligne d'audit** n'est créée.
- **DoD :** Non-écriture prouvée par test (snapshot de la base) ; maximum 20 respecté ; tri déterministe (test à entrées identiques) ; scoring documenté.
- **Tests exigés :** tests d'intégration (20 max, tri, liste vide, absence d'écriture).
- **SP :** 6 · **Dépend de :** `TAKT-L06-05` · **Bloque :** `TAKT-L09-10`.

#### TAKT-L06-07 — Implémenter le bail d'édition exclusif (30 min)
- **Objectif :** Empêcher l'édition concurrente d'une même version par deux utilisateurs.
- **Exigences :** `EX-EDI-04`, `TE-ARCH-04`, `ST_TAKT §4.5`, `RB-UI-03`, `IX-GES-16`, `DL-TE-06`.
- **Périmètre :** `packages/db/prisma/schema.prisma` (modèle `BailEdition`), `apps/backend/src/modules/planning/bail/**`, tâche planifiée de purge. **Hors périmètre :** l'UI (L09-09).
- **Livrables :** Modèle `BailEdition` (`versionId`, `utilisateurId`, `dateDebut`, `dateFin`, `derniereActivite`) ; acquisition du bail à l'entrée en édition (premier arrivé servi) ; renouvellement automatique à chaque activité (+30 min) ; expiration automatique après 30 min d'inactivité ; forçage de libération réservé à l'`admin` ; endpoint `DELETE /api/v1/bails/:id` (force) ; erreur **423 `SEANCE_LOCKED`** avec le nom du détenteur ; tâche planifiée toutes les 5 min de purge des baux expirés ; **100 % des branches testées**.
- **Critères :** *Given* un bail détenu par l'utilisateur A, *When* B tente de modifier une séance, *Then* 423 `SEANCE_LOCKED` nommant A. *Given* une activité de A, *When* le bail est renouvelé, *Then* `dateFin` est prolongée de 30 min. *Given* un bail expiré, *When* la tâche de purge s'exécute, *Then* le bail est supprimé et la modification est possible. *Given* un `gest`, *When* il force la libération, *Then* 403 (réservé `admin`).
- **DoD :** 423 implémenté avec le détenteur ; renouvellement, expiration, purge, forçage testés ; concurrence testée (2 requêtes simultanées → 1 succès, 1 × 423) ; tâche planifiée opérationnelle.
- **Tests exigés :** tests unitaires (acquisition, renouvellement, expiration) + tests d'intégration (423, forçage, purge, concurrence).
- **SP :** 6 · **Dépend de :** `TAKT-L06-01`, `TAKT-L03-05` · **Bloque :** `TAKT-L09-09`.

#### TAKT-L06-08 — Implémenter les verrous de séance (4 types, pose en masse)
- **Objectif :** Permettre d'imposer une position (créneau, salle, enseignant, activité) à une séance, individuellement ou en masse.
- **Exigences :** `EX-VRR-01`, `EX-VRR-02`, `EX-WKF-09`, `WORKFLOW_METIER §8`, `HC-LOCK-01` à `HC-LOCK-04`, `IX-GES-08`, `IX-GES-09`.
- **Périmètre :** `packages/db/prisma/schema.prisma` (modèle `VerrouSeance`), `apps/backend/src/modules/planning/locks/**`. **Hors périmètre :** la transmission au solveur (L07-01).
- **Livrables :** Modèle `VerrouSeance` (`versionId`, `seanceId`, `type` enum `CRENEAU`/`SALLE`/`ENSEIGNANT`/`ACTIVITE`, `valeur`, `poids` = 100 %, `posePar`, `datePose`) ; endpoints `POST /api/v1/locks`, `DELETE /api/v1/locks/:id` ; pose en masse par groupe / enseignant / salle ; verrou **transféré à la nouvelle version** à la création d'une version dérivée (`EX-DAT-04`) ; suppression automatique du verrou si la séance disparaît ; audit de pose et de levée ; détection d'incompatibilité verrou ↔ contraintes (erreur bloquante **avant** appel au solveur).
- **Critères :** *Given* un verrou `SALLE` posé, *When* on liste les verrous de la version, *Then* il apparaît avec `poids = 100`. *Given* une pose en masse sur 3 groupes, *Then* 3 verrous sont créés en une transaction. *Given* un verrou incompatible avec une contrainte dure, *When* on tente une génération, *Then* la génération est refusée **avant** l'appel au solveur. *Given* une nouvelle version créée depuis la version verrouillée, *Then* les verrous sont repris.
- **DoD :** 4 types gérés ; pose en masse transactionnelle ; transfert entre versions testé ; incompatibilité détectée en amont du solveur ; audit posé/levé écrit.
- **Tests exigés :** tests d'intégration (4 types, masse, transfert, incompatibilité, levée, 423 si en cours d'édition concurrente).
- **SP :** 6 · **Dépend de :** `TAKT-L06-02`, `TAKT-L06-03` · **Bloque :** `TAKT-L07-01`, `TAKT-L07-07`.

#### TAKT-L06-09 — Implémenter le contrôle de couverture à 100 %
- **Objectif :** N'autoriser la soumission vers `valid_pedag` que si la couverture est **exactement** de 100 %.
- **Exigences :** `EX-EDI-05`, `RB-UI-06`, `TE-MET-01`, `TE-MET-02`, `SF_TAKT §15` (couverture), `SC-LOAD-01`.
- **Périmètre :** `packages/charge-engine/**` (extension), `apps/backend/src/modules/planning/couverture/**`. **Hors périmètre :** la transition de soumission (L06-02).
- **Livrables :** Service `computeCouverture(versionId)` : par affectation pédagogique, volume déclaré vs volume planifié (agrégation `nbCreneaux × 30 min`), taux global et taux par département ; distinction sur-planification (bloquant) / sous-planification (bloquant) / dangling séance (bloquant) ; garde appelée par la transition vers `valid_pedag` (400 avec le détail par affectation) et exposée en lecture pour l'UI ; règle : « exactement 100 % » — toute sur-planification est bloquante.
- **Critères :** *Given* une couverture de 100 %, *When* la transition est demandée, *Then* elle est acceptée. *Given* une couverture de 97 %, *Then* 400 avec le détail des 3 % manquants. *Given* une sur-planification de 105 %, *Then* 400 **bloquant** (conformité `RB-UI-06`). *Given* une séance orpheline, *Then* elle est listée et bloque la soumission.
- **DoD :** Calcul exact testé sur jeux de données à 0 %, 97 %, 100 %, 105 % ; garde branchée sur la transition ; détail par affectation fourni ; sur-planification bloquante (test dédié).
- **Tests exigés :** tests unitaires (calcul, bornes) + tests d'intégration (4 scénarios de soumission).
- **SP :** 5 · **Dépend de :** `TAKT-L06-05`, `TAKT-L05-03` · **Bloque :** `TAKT-L10-07`.

#### TAKT-L06-10 — Implémenter le snapshot de version et l'immuabilité de la publication
- **Objectif :** Rendre chaque version reproductible : snapshot des données au moment de la génération, immuabilité stricte une fois publiée.
- **Exigences :** `EX-PRI-06`, `EX-DAT-01`, `EX-DAT-02`, `EX-DAT-03`, `EX-PRI-02`, `TE-ARCH-03`, `TE-MET-06`, `DL-05`.
- **Périmètre :** `packages/db/prisma/schema.prisma` (modèles `Snapshot`, `Generation`, `Scenario`), `apps/backend/src/modules/versions/snapshot/**`. **Hors périmètre :** la génération CP-SAT (L07-01).
- **Livrables :** Modèle `Snapshot` (JSONB : activités, groupes, enseignants, salles, créneaux, règles, contraintes, préférences, verrous, profil de génération ; `checksum` SHA-256 ; `horodatage` ; `versionId`) ; modèle `Generation` (FK snapshot, `statut`, `dureeMs`, `nombreScenarios`) ; modèle `Scenario` (JSONB placements + scores) ; création du snapshot **avant** toute génération ; aucune suppression automatique des générations (`EX-DAT-03`) ; garde d'immuabilité : `publie` → aucune écriture possible sur `Seance`, `VerrouSeance`, `Snapshot` liés.
- **Critères :** *Given* une génération, *When* elle est lancée, *Then* un snapshot est créé et référencé. *Given* le même snapshot, *When* il est rejoué, *Then* le checksum est identique (reproductibilité, `EX-PRI-06`). *Given* une version `publie`, *When* on tente d'ajouter une séance, *Then** 409 et l'événement est journalisé. *Given* un rejeu de génération, *Then* aucune génération antérieure n'est supprimée.
- **DoD :** Snapshot complet (tous les champs listés) ; checksum déterministe ; immuabilité `publie` testée sur les 3 tables ; historique des générations conservé.
- **Tests exigés :** tests d'intégration (création snapshot, checksum, immuabilité, non-suppression).
- **SP :** 6 · **Dépend de :** `TAKT-L06-01`, `TAKT-L06-03` · **Bloque :** `TAKT-L07-01`, `TAKT-L10-07`.

### Lot L07 — Génération CP-SAT (7 tickets · 47 SP)

#### TAKT-L07-01 — Construire le fichier dérivé d'entrée du solveur
- **Objectif :** Produire le fichier plat, auto-suffisant et versionné que le solveur consomme, sans aucun accès à la base métier.
- **Exigences :** `EX-PRI-01`, `EX-PRE-06`, `EX-DAT-01`, `TE-ARCH-01`, `SPEC_SOLVER_CPSAT §3`, `HC-*`, `SC-*`.
- **Périmètre :** `apps/backend/src/modules/generation/derived-file/**` (builder), `packages/solver-client/src/types.ts` (types `DerivedFile` existants), `docs/SPEC_SOLVER_CPSAT.md` (schéma JSON de référence). **Hors périmètre :** le worker et le modèle Python.
- **Livrables :** Builder `buildDerivedFile(snapshot)` produisant un JSON conforme au schéma `DerivedFile` existant (`packages/solver-client/src/types.ts`) : `metadata`, `timeGrid`, `rooms`, `teachers`, `groups`, `subjects`, `activities`, `constraints`, `locks` ; mapping complet des contraintes dures (HC-RES, HC-LOCK, HC-UNAV, HC-ROOM, HC-STR) et souples (SC-PREF, SC-CONT, SC-LOAD) avec leurs poids ; validation du fichier produit par schéma Zod avant écriture ; écriture du fichier dans le store de fichiers avec son `snapshotId` ; aucune donnée de la base hors snapshot.
- **Critères :** *Given* un snapshot complet, *When* le fichier dérivé est construit, *Then* il est conforme au schéma (validation Zod sans erreur). *Given* un verrou de type `SALLE`, *Then* il apparaît dans `locks` avec `poids = 100`. *Given* une indisponibilité `{"day":2,"slots":[0,1,2,3]}`, *Then* elle est transcrite dans `teachers[].unavailableSlots`. *Given* une contrainte de capacité, *Then* elle est transcrite dans `constraints` avec le type et le poids corrects.
- **DoD :** Schéma de validation appliqué et testé ; mapping des 6 familles de contraintes et des 4 familles de préférences vérifié par test unitaire par famille ; fichier déterministe (même snapshot → même fichier, checksum stable) ; aucune connexion DB dans le builder (test : le builder est pur, snapshot injecté).
- **Tests exigés :** tests unitaires du builder (1 test par famille de contraintes, déterminisme, validation du schéma).
- **SP :** 8 · **Dépend de :** `TAKT-L06-10`, `TAKT-L06-08` · **Bloque :** `TAKT-L07-02`, `TAKT-L07-03`.

#### TAKT-L07-02 — Implémenter le client du solveur (packages/solver-client)
- **Objectif :** Encapsuler l'appel au solveur CP-SAT dans un client testable, avec gestion typée des erreurs.
- **Exigences :** `SPEC_SOLVER_CPSAT §5`, `SPEC_SOLVER_CPSAT §9`, `TE-ARCH-01`, `GG-10`.
- **Périmètre :** `packages/solver-client/src/**` (`types.ts` existant, `client.ts`, `errors.ts`, `index.ts`), `packages/solver-client/package.json`, tests associés. **Hors périmètre :** le modèle Python.
- **Livrables :** `SolverClient` avec méthode `solve(derivedFile, options)` : écriture du fichier d'entrée, invocation du processus Python en **sous-processus isolé** (pas de réseau, pas d'accès DB), timeout (défaut 300 s, 3 scénarios max), lecture du fichier de sortie, parsing vers `Scenario[]` (score global 0–100 + sous-scores `SubScores` existants) ; `SolverError` typé : `TIMEOUT`, `SOLVER_CRASH`, `INVALID_OUTPUT`, `MEMORY_EXCEEDED`, `INFEASIBLE` ; `Scenario` exporté avec `placements`, `score`, `subScores` ; journalisation des métriques de solveur (durée, mémoire, statut).
- **Critères :** *Given* un solveur qui dépasse le timeout, *When* `solve` est appelé, *Then* une `SolverError` de type `TIMEOUT` est levée et le processus est tué. *Given* une sortie JSON invalide, *Then* l'erreur est `INVALID_OUTPUT`. *Given* un résultat valide, *Then* `Scenario[]` est retourné avec un score dans [0, 100]. *Given* l'appel au solveur, *Then* aucune connexion à une base de données n'est possible depuis le processus enfant.
- **DoD :** Client typé, testé par doubles ; 5 types d'erreurs couverts ; timeout effectif (test avec un processus factice qui dort) ; métriques émises ; aucun accès DB dans le processus enfant (vérifié par la configuration d'environnement transmise).
- **Tests exigés :** tests unitaires avec double de processus (succès, timeout, crash, sortie invalide, infaisable).
- **SP :** 6 · **Dépend de :** `TAKT-L07-01` · **Bloque :** `TAKT-L07-03`.

#### TAKT-L07-03 — Implémenter le worker de génération (pg-boss + SSE)
- **Objectif :** Exécuter la génération de façon asynchrone, traçable et notifiée en temps réel.
- **Exigences :** `ST_TAKT §1.3`, `TE-ARCH-05`, `EX-PRE-03`, `EX-PRE-05`, `SPEC_SOLVER_CPSAT §6`, `SPK-04`.
- **Périmètre :** `apps/backend/src/modules/generation/worker/**` (job pg-boss), `apps/backend/src/modules/generation/generations.controller.ts`, `apps/backend/src/events/**` (diffusion SSE). **Hors périmètre :** le modèle Python.
- **Livrables :** Job pg-boss `generation.run` : vérification des prérequis (tous départements validés `EX-REP-06`, aucun verrou bloquant, couverture conforme), création du snapshot, construction du fichier dérivé, appel du client solveur, persistance des scénarios (max 3), diffusion SSE (`generation.progress` à chaque étape, `generation.done`, `generation.failed`), mise à jour de l'état de version (`generation` → `edition` en cas de succès, → `brouillon` en cas d'échec) ; endpoints `GET/POST /api/v1/generations`, `GET /api/v1/generations/:id/scenarios` ; annulation possible si aucun scénario adopté (`EX-PRE-05`) ; reprise sur échec de job (retry borné, 2 tentatives).
- **Critères :** *Given* un département non validé, *When* la génération est demandée, *Then* 409 avec le nom du département manquant **avant** création du job. *Given* une génération réussie, *When* elle se termine, *Then** 3 scénarios au maximum sont persistés, la version passe en `edition` et un événement SSE `generation.done` est émis. *Given* un échec solveur, *Then* la version revient à `brouillon` et l'utilisateur reçoit une alerte. *Given* une génération annulée, *Then** aucun scénario n'est adopté.
- **DoD :** Job traçable en base (statut, durée, erreur) ; prérequis vérifiés ; SSE émis à chaque étape ; transitions correctes dans les 3 issues ; retry borné ; aucune perte de scénario.
- **Tests exigés :** tests d'intégration du job (succès, échec, prérequis, annulation, retry) + test de réception SSE.
- **SP :** 8 · **Dépend de :** `TAKT-L07-02`, `TAKT-L02-05`, `TAKT-L06-10` · **Bloque :** `TAKT-L07-04`, `TAKT-L09-07`.

#### TAKT-L07-04 — Implémenter le modèle CP-SAT (OR-Tools, Python)
- **Objectif :** Fournir le moteur de résolution : contraintes dures satisfaites à 100 %, préférences optimisées, jusqu'à 3 scénarios.
- **Exigences :** `SPEC_SOLVER_CPSAT §7`, `HC-*`, `SC-*`, `EX-PRE-03`, `EX-PRE-04`, `ST_TAKT §4.2`.
- **Périmètre :** `solver/cp_sat_model.py` (nouveau), `solver/requirements.txt`, `solver/README.md`. **Hors périmètre :** le backend et le worker.
- **Livrables :** Modèle CP-SAT : variables de placement `(activité, jour, créneau, salle)` ; contraintes **dures** (unicité salle/enseignant/groupe, indisponibilités, types et capacités de salle, volume hebdomadaire exact `HC-STR-04`, verrous à poids 100) ; contraintes **souples** (préférences, continuité, compacité, charge, équilibrage) avec poids configurables ; fonction objectif = somme pondérée des souples, avec **sous-scores** par famille (compactité, répartition, heures tardives, vœux, couverture) ; génération de 3 scénarios distincts (variation des poids ou diversification) ; sortie JSON conforme au schéma de sortie du `SPEC_SOLVER_CPSAT` ; gestion des séances non placées (`NON_PLACEE`) avec avertissement (`EX-PRE-03`).
- **Critères :** *Given* un jeu de contraintes dures satisfiable, *When* le solveur s'exécute, *Then* 100 % des contraintes dures sont respectées (vérification automatique dans le script). *Given* un volume hebdomadaire exact de 2 séances, *Then* l'activité apparaît exactement 2 fois. *Given* une indisponibilité, *Then* aucune séance n'y est placée. *Given* une demande de 3 scénarios, *Then* 3 sorties sont produites.
- **DoD :** Script exécutable en CLI (`python -m solver.cp_sat_model --input derived.json --output scenarios.json`) ; contraintes dures vérifiées automatiquement à chaque exécution (assertion interne) ; sous-scores calculés ; performance conforme aux seuils (voir L07-05) ; documentation d'exécution.
- **Tests exigés :** tests Python (fixtures : instance triviale, instance avec conflit dur, instance avec préférence) + vérification d'optimum sur une instance de référence à résultat connu.
- **SP :** 8 · **Dépend de :** `TAKT-L07-03` · **Bloque :** `TAKT-L07-05`.

#### TAKT-L07-05 — Valider la performance du solveur (spike SPK-01)
- **Objectif :** Prouver que le solveur tient les seuils de performance annoncés sur une version réaliste, avant de promettre la date de production.
- **Exigences :** `SPEC_SOLVER_CPSAT §8`, `ST_TAKT §6.3` (SPK-01), `PLAN_MACRO` risque « solver trop lent », `SF_TAKT §2` (4 000 séances).
- **Périmètre :** `solver/benchmarks/**` (scripts + jeux de données), `docs/RAPPORT_PERFORMANCE_SOLVER.md` (nouveau). **Hors périmètre :** le modèle CP-SAT lui-même (corrections uniquement si le rapport le justifie, dans une PR distincte).
- **Livrables :** Générateur d'instances de test (200 séances, 1 000 séances, 4 000 séances, avec contraintes représentatives) ; exécution chronométrée (durée, mémoire, nombre de scénarios) ; rapport comparatif aux seuils (`< 5 min` pour 200 séances, `< 30 min` pour 4 000 séances) ; recommandation de seuils, de limite de nombre de séances par génération et de strategie de repli ; décision d'acceptation/rejet du seuil de performance.
- **Critères :** *Given* une instance de 200 séances, *When* le solveur s'exécute, *Then* la durée est < 5 min. *Given* une instance de 4 000 séances, *Then* la durée est < 30 min **ou** le rapport documente explicitement le dépassement et la stratégie retenue. *Given* le rapport, *Then* il contient les 3 mesures brutes, l'environnement (CPU/RAM) et un verdict.
- **DoD :** Rapport publié avec mesures reproductibles ; environnement décrit ; verdict explicite (`ACCEPTÉ` / `ACCEPTÉ SOUS RÉSERVE` / `REJETÉ`) ; seuils de repli documentés ; jeu de benchmarks versionné.
- **Tests exigés :** exécution automatisée des benchmarks (script, non bloquante en CI, bloquante en pré-recette).
- **SP :** 5 · **Dépend de :** `TAKT-L07-04` · **Bloque :** `TAKT-L11-05`, jalon J56.

#### TAKT-L07-06 — Implémenter la sélection manuelle de scénario
- **Objectif :** Garantir que le choix final d'une génération est **toujours** humain, conformément à l'exigence cardinale du projet.
- **Exigences :** `EX-PRI-03`, `EX-PRE-04`, `EX-PRE-05`, `ST_TAKT §1.3` (étape 8), `IX-GES-06`, `EC-GES-05`.
- **Périmètre :** `apps/backend/src/modules/generation/selection/**`, `apps/backend/src/modules/planning/**` (création des séances du scénario adopté). **Hors périmètre :** l'UI de comparaison (L09-08).
- **Livrables :** Endpoint `POST /api/v1/generations/:id/select` : validation du scénario (existe, appartient à la génération, génération en `generation`), création des séances du scénario dans la version (nouvelle version `edition` si la version source est en `generation`), copie des verrous, calcul des conflits résiduels, passage en `edition` ; **aucune sélection automatique** — aucun chemin de code ne choisit un scénario sans appel explicite ; audit de l'adoption (scénario, auteur, score) ; refus d'adoption d'un scénario déjà adopté.
- **Critères :** *Given* un scénario disponible, *When* le `gest` le sélectionne, *Then** la version passe en `edition` et les séances sont créées. *Given* un scénario inexistant ou d'une autre génération, *Then** 404/400. *Given* une génération échouée, *Then* aucune sélection possible. *Given* une sélection, *Then** le journal d'audit contient le scénario et son score.
- **DoD :** Sélection manuelle **seule** voie d'adoption (revue de code le confirmant) ; création des séances correcte (volume conforme au snapshot) ; audit écrit ; idempotence (double sélection rejetée).
- **Tests exigés :** tests d'intégration (sélection, rejet des cas invalides, audit, idempotence) + test « aucune sélection automatique » (revue + assertion sur l'absence de code d'adoption implicite).
- **SP :** 5 · **Dépend de :** `TAKT-L07-03` · **Bloque :** `TAKT-L09-08`.

#### TAKT-L07-07 — Implémenter les garde-fous de lancement de génération
- **Objectif :** Bloquer la génération lorsque les prérequis ne sont pas satisfaits, et avertir en cas de risque de verrouillage excessif.
- **Exigences :** `EX-PRE-01`, `EX-REP-06`, `EX-VRR-02`, `EX-OUV-01`, `RB-UI-07`, `TE-MET-08`, `TAKT-L00-02`.
- **Périmètre :** `apps/backend/src/modules/generation/preconditions/**`. **Hors périmètre :** le job lui-même (L07-03).
- **Livrables :** Service `checkGenerationPreconditions(versionId)` : (1) tous les départements ont validé leur répartition (`EX-REP-06`) ; (2) aucun verrou incompatible avec les contraintes dures (`EX-VRR-02`) ; (3) couverture conforme ; (4) **avertissement** si le taux de verrouillage dépasse le seuil paramétré (`EX-OUV-01`, valeur arbitrée en L00-02) — avertissement bloquant selon configuration ; (5) identifiants de version en `brouillon` ou `edition` uniquement ; retour structuré `{ satisfaites, violations: [{ code, message, details }], avertissements: [...] }` consommé par l'UI **avant** confirmation.
- **Critères :** *Given* un département non validé, *Then* une violation `DEPARTEMENT_NON_VALIDE` est retournée avec le nom du département. *Given* un verrou `SALLE` pointant vers une salle inexistante, *Then** une violation `VERROU_INCOMPATIBLE` est retournée. *Given* 76 % de séances verrouillées (seuil 75 %), *Then** un avertissement `TAUX_VERROUILLAGE_ELEVE` est retourné. *Given* toutes les conditions satisfaites, *Then** aucune violation n'est retournée.
- **DoD :** Les 5 contrôles implémentés et testés ; violations et avertissements **distincts** ; seuil lu depuis la configuration (pas de valeur en dur) ; message d'erreur en français et actionnable.
- **Tests exigés :** tests unitaires (chaque condition, seuil au-dessus/en dessous/à l'égalité) + tests d'intégration.
- **SP :** 7 · **Dépend de :** `TAKT-L06-02`, `TAKT-L06-08`, `TAKT-L00-02` · **Bloque :** `TAKT-L07-03`, `TAKT-L09-07`.

### Lot L08 — Socle frontend & design system (7 tickets · 38 SP)

#### TAKT-L08-01 — Produire les design tokens (Normal + Ramadan, contrastes AA)
- **Objectif :** Fournir la source de vérité des tokens de design, avec les 3 corrections de contraste identifiées par l'audit d'accessibilité.
- **Exigences :** `EX-UI-05`, `DL-UI-03`, `DL-UI-04`, `SPEC_ACCESSIBILITE §4`, `UI_DESIGN_TOKENS`, `GAPS_RESOLUTION_SUMMARY` (Warning Normal, Lock Normal, Accent Ramadan).
- **Périmètre :** `packages/design-tokens/**` (tokens JS/TS + CSS custom properties + JSON), `packages/design-tokens/src/**`, test de contraste associé. **Hors périmètre :** le switch de thème (L08-04).
- **Livrables :** Tokens分为 2 thèmes : `normal` et `ramadan` ; familles : couleurs (primaire, secondaire, succès, avertissement, erreur, information, verrou, fond, texte, bordure, focus), typographie (échelle, graisses), espacements (échelle 4 px), rayons, ombres, z-index, breakpoints ; **correction des 3 contrastes non conformes** (Warning Normal, Lock Normal, Accent Ramadan) ; export CSS custom properties + JSON ; test automatisé de contraste (WCAG 2.1 AA : 4,5:1 texte normal, 3:1 texte large et composants) sur **toutes** les paires texte/fond de chaque thème.
- **Critères :** *Given* les tokens d'un thème, *When* le test de contraste s'exécute, *Then* aucune paire ne descend sous le seuil AA. *Given* le thème Ramadan, *Then* il est哺 distinct du thème Normal sur l'accent, la surface et les nuances de la palette. *Given* un token modifié, *Then* le CSS custom properties et le JSON régénérés sont identiques (déterminisme).
- **DoD :** 3 corrections de contraste appliquées et prouvées par le test automatisé ; 0 paire non conforme ; export CSS + JSON ; test de contraste exécutable (`pnpm test:tokens`).
- **Tests exigés :** tests unitaires de contraste (toutes les paires × 2 thèmes) + test de déterminisme de l'export.
- **SP :** 8 · **Dépend de :** `TAKT-L01-05`, `TAKT-L00-03` · **Bloque :** `TAKT-L08-05`, `TAKT-L09-09`.

#### TAKT-L08-02 — Implémenter le client HTTP, l'authentification et la gestion d'erreurs
- **Objectif :** Centraliser les communications avec l'API : authentification, enveloppe, erreurs, rafraîchissement automatique.
- **Exigences :** `TE-API-01`, `TE-API-06`, `ST_TAKT §3.3`, `UI_FRONTEND_SPECS §4`, `TAKT-L00-04`.
- **Périmètre :** `apps/frontend/src/lib/api.ts`, `apps/frontend/src/lib/errors.ts`, `apps/frontend/src/lib/validation.ts` (schémas Zod partagés importés de `@takt/contracts`). **Hors périmètre :** les stores (L08-03).
- **Livrables :** Client HTTP typé (Axios ou `fetch` — choix justifié dans le rapport) : injection automatique du Bearer, refresh automatique **une seule fois** en cas de 401 avec rejeu de la requête originale, pas de boucle infinie de refresh ; déstructuration de l'enveloppe `{ data, error, meta }` ; normalisation des 8 codes HTTP en messages **français** actionnables ; mapping `meta` vers la pagination TanStack Query ; intercepteur de journalisation (sans jamais logger de token ni de donnée sensible) ; validation Zod des réponses critiques.
- **Critères :** *Given* une réponse 200, *Then* le client retourne `data` et expose `meta`. *Given* un 401 sur une route protégée, *Then* un refresh est tenté **une seule fois** et la requête est rejouée. *Given* un 401 persistant après refresh, *Then** la session est purgée et l'utilisateur est redirigé vers `EC-COM-01`. *Given* un 409 `WORKFLOW_INVALID_TRANSITION`, *Then* le message est celui du serveur (jamais générique).
- **DoD :** Refresh unique (test du compteur d'appels) ; 8 codes HTTP mappés en français ; aucun secret journalisé (test) ; types de réponse générés depuis `@takt/contracts` ; pagination alignée sur `meta`.
- **Tests exigés :** tests unitaires du client (8 codes, refresh unique, rejeu, purge de session) + tests d'intégration avec MSW ou mock serveur.
- **SP :** 5 · **Dépend de :** `TAKT-L02-02`, `TAKT-L02-03`, `TAKT-L03-03` · **Bloque :** `TAKT-L08-03`, `TAKT-L09-01`.

#### TAKT-L08-03 — Implémenter les stores Zustand et les hooks métier
- **Objectif :** Fournir l'état global typé (session, version courante) et les hooks de domaine.
- **Exigences :** `UI_FRONTEND_SPECS §3`, `EX-DAT-01`, `GG-04`.
- **Périmètre :** `apps/frontend/src/stores/userStore.ts`, `versionStore.ts`, `apps/frontend/src/hooks/useVersion.ts`, `useEditionLock.ts`. **Hors périmètre :** la logique de la grille (L09-09).
- **Livrables :** `userStore` (utilisateur, rôles, `departementIds`, permissions dérivées, action de déconnexion purgant le cache TanStack Query) ; `versionStore` (version courante, état de workflow, snapshots, **interdits de mutation** selon l'état : une version `publie` n'est pas modifiable côté client) ; `useVersion` (lecture, revalidation, erreurs) ; `useEditionLock` (acquisition du bail, renouvellement périodique, libération, lecture du détenteur en cas de 423) ; sélecteurs typés, aucun `any`.
- **Critères :** *Given* une version `publie`, *When* l'UI tente une action de modification, *Then** l'action est désactivée côté client. *Given* une réponse 423, *When* elle est reçue, *Then** le nom du détenteur du bail est affiché. *Given* une déconnexion, *Then* le cache TanStack Query est purgé (aucune donnée résiduelle en mémoire).
- **DoD :** Stores typés et testables ; règles d'état respectées ; cache purgé à la déconnexion ; hook de bail fonctionnel (renouvellement) ; couverture de test sur les sélecteurs.
- **Tests exigés :** tests unitaires des stores (transitions d'état autorisées, purge) + tests du hook de bail (timer).
- **SP :** 5 · **Dépend de :** `TAKT-L08-02` · **Bloque :** `TAKT-L09-09`, `TAKT-L09-11`.

#### TAKT-L08-04 — Implémenter le routing, les guards et la navigation par rôle
- **Objectif :** Garantir qu'un utilisateur n'accède qu'aux écrans de son rôle et de son périmètre.
- **Exigences :** `RB-UI-01`, `RB-UI-02`, `EX-UI-01`, `UI_ARBORESCENCE §7`, `UI_FRONTEND_SPECS §5`.
- **Périmètre :** `apps/frontend/src/app/router.tsx`, `apps/frontend/src/app/guards/**`, `apps/frontend/src/components/templates/Layout/**`, `apps/frontend/src/components/templates/Sidebar/**`, `apps/frontend/src/components/templates/Header/**`. **Hors périmètre :** les pages métier (L09).
- **Livrables :** Routes lazy-loadées correspondant aux 26 écrans `EC-*` (structure de `UI_FRONTEND_SPECS §5`) ; `ProtectedRoute` (redirection 401 → `EC-COM-01`), `RoleGuard` (rôles autorisés par route, table issue de `UI_ARBORESCENCE`), `DepartmentGuard` (portée `rdep`) ; `Layout` avec `Sidebar` filtrée par rôle et `Header` (profil, notifications, déconnexion) ; redirection par défaut selon le rôle (`admin` → `EC-ADM-01`, `gest` → `EC-GES-01`, `rdep` → `EC-RDEP-01`, `dir` → `EC-DIR-01`) ; gestion des 404 et des erreurs (boundaries React) ; thème (Normal/Ramadan) appliqué via les tokens (L08-01) et switchable par l'utilisateur.
- **Critères :** *Given* un `rdep` qui saisit l'URL d'un écran `admin`, *When* la route est chargée, *Then** une redirection vers son écran par défaut a lieu. *Given* un utilisateur non authentifié, *Then** il est redirigé vers `EC-COM-01`. *Given* un `gest`, *When* il ouvre la barre latérale, *Then* seuls ses 12 écrans dédiés + 3 transversaux sont listés. *Given* le thème Ramadan activé, *Then* les tokens Ramadan sont appliqués sans rechargement.
- **DoD :** 26 routes déclarées ; guards testés (4 rôles × 5 cas) ; redirection par défaut conforme ; sidebar filtrée ; thème switchable et persistant ; lazy loading actif.
- **Tests exigés :** tests d'intégration des guards + test de rendu de la sidebar par rôle + test E2E d'accès direct à une URL interdite.
- **SP :** 6 · **Dépend de :** `TAKT-L08-03`, `TAKT-L08-01` · **Bloque :** `TAKT-L09-01`…`TAKT-L09-12`.

#### TAKT-L08-05 — Construire le design system (atomes, molécules, organismes)
- **Objectif :** Fournir les composants réutilisables garantissant cohérence visuelle et accessibilité de toutes les pages.
- **Exigences :** `UI_FRONTEND_SPECS §2`, `UI_WIREFRAMES §2`, `DL-UI-04`, `EX-UI-05`, `SPEC_ACCESSIBILITE §3`.
- **Périmètre :** `apps/frontend/src/components/atoms/**`, `molecules/**`, `organisms/**` (hors `ReferentielManager` de L04-06 et `GrilleEDT` de L09-09), storybook non requis. **Hors périmètre :** pages.
- **Livrables :** Atomes : `Bouton`, `Input`, `Select`, `Checkbox`, `Badge`, `Chip`, `Icone`, `Spinner`, `Tooltip`, `Alerte` ; Molécules : `SearchBar`, `DataTableRow`, `Paginator`, `Modal`, `FormField`, `Breadcrumb`, `Tabs` ; Organismes : `FormulaireEntite`, `PanneauConflits`, `IndicateurCharge`, `TimelineWorkflow`, `SelecteurScenario` ; chaque composant : props typées, 4 états requis (vide, chargé, erreur, succès), navigation clavier, `aria-*` corrects, focus visible ; styles exclusivement via tokens (aucune couleur en dur) ; documentation d'usage dans `apps/frontend/src/components/README.md`.
- **Critères :** *Given* n'importe quel composant, *When* il est rendu au clavier seul, *Then* il est atteignable et activable. *Given* un composant avec état d'erreur, *Then* l'erreur est annoncée (`role="alert"` ou `aria-describedby`). *Given* un composant de couleur, *Then* la couleur provient d'un token. *Given* un état vide, *Then** un message-action est affiché (jamais une page blanche).
- **DoD :** ≥ 25 composants livrés ; 0 erreur axe-core sur la page de showcase ; 0 couleur en dur (contrôle automatisé) ; 4 états implémentés sur chaque composant ; documentation d'usage présente.
- **Tests exigés :** tests d'intégration Testing Library par composant (rendu, interactions clavier, états) + test axe-core de la showcase + test de non-régression des couleurs en dur.
- **SP :** 8 · **Dépend de :** `TAKT-L08-01` · **Bloque :** `TAKT-L04-06`, `TAKT-L09-02`…`TAKT-L09-12`.

#### TAKT-L08-06 — Mettre en place la chaîne de tests frontend (Vitest, Testing Library, axe-core)
- **Objectif :** Installer l'outillage de test frontend exigé par le plan de tests, avec les seuils de couverture.
- **Exigences :** `TE-TEST-01`, `TE-TEST-02`, `TESTS.md §1.1`, `SPEC_ACCESSIBILITE §5.2`.
- **Périmètre :** `apps/frontend/vitest.config.ts`, `apps/frontend/src/test/setup.ts`, `apps/frontend/src/test/utils.tsx`, `apps/frontend/playwright.config.ts`. **Hors périmètre :** les tests eux-mêmes (rédigés dans les tickets applicatifs).
- **Livrables :** Vitest configuré (environnement `jsdom`, `globals: true`,.setup avec `@testing-library/jest-dom` et `axe-core`) ; seuil de couverture **≥ 80 %** sur les lignes et **100 % des branches** pour les utilitaires critiques (`utils/conflict.ts`, `utils/lock.ts`) ; helper `renderWithProviders` (QueryClient, Router, store, thème) ; Playwright configuré (baseURL, webServer, navigateur Chromium, rapports) ; scripts `pnpm test:unit`, `pnpm test:e2e`, `pnpm test:a11y`.
- **Critères :** *Given* un test d'exemple, *When* `pnpm test:unit` est lancé, *Then* il s'exécute dans le contexte React complet (router + query client). *Given* une couverture inférieure au seuil, *When* le test est lancé, *Then** le processus échoue. *Given* un test axe-core, *Then** il échoue si une violation `wcag2aa` est détectée.
- **DoD :** 3 scripts opérationnels ; helper de rendu réutilisable ; seuil de couverture appliqué ; un test de démonstration rouge→vert livré ; configuration Playwright opérationnelle.
- **Tests exigés :** auto-test de l'outillage (un test atomique + un test axe-core passed).
- **SP :** 3 · **Dépend de :** `TAKT-L01-05` · **Bloque :** `TAKT-L09-01`…`TAKT-L09-12`.

#### TAKT-L08-07 — Implémenter le layout applicatif et la gestion des erreurs
- **Objectif :** Fournir le gabarit commun (structure, navigation, zones d'erreur) et les garde-fous d'exécution du frontend.
- **Exigences :** `UI_ARBORESCENCE §8`, `UI_WIREFRAMES §2`, `TE-API-06`, `EX-NOT-01`.
- **Périmètre :** `apps/frontend/src/components/templates/**`, `apps/frontend/src/app/providers.tsx`, `apps/frontend/src/app/ErrorBoundary.tsx`, `apps/frontend/src/components/molecules/AlerteGlobale.tsx`. **Hors périmètre :** pages métier.
- **Livrables :** `Layout` (sidebar, header, zone de contenu, fil d'Ariane) ; `ErrorBoundary` avec page d'erreur française, `requestId` affiché (support au diagnostic) et bouton « Réessayer » ; `AlerteGlobale` (toasts) pilotée par le canal SSE ; gestion du 401 global (redirection + purge) ; indicateur de connexion réseau ; squelette de chargement (skeleton) pour les zones lentes ; `PageError` (404).
- **Critères :** *Given* une exception React dans une page, *Then** l'`ErrorBoundary` affiche une page d'erreur en français avec le `requestId` et l'application reste utilisable. *Given* un 401 global, *Then** la session est purgée et la redirection a lieu. *Given* une perte réseau, *Then** un bandeau l'indique et les actions sont désactivées.
- **DoD :** ErrorBoundary testée (exception simulée) ; squelettes de chargement sur toutes les zones de liste ; `requestId` affiché ; bandeau hors-ligne fonctionnel ; 0 erreur axe-core sur le layout.
- **Tests exigés :** tests d'intégration (ErrorBoundary, 401, hors-ligne) + test axe-core du layout.
- **SP :** 3 · **Dépend de :** `TAKT-L08-04`, `TAKT-L08-05` · **Bloque :** `TAKT-L09-01`…`TAKT-L09-12`.

### Lot L09 — Frontend métier : 26 écrans `EC-*` (12 tickets · 88 SP)

#### TAKT-L09-01 — Écran `EC-COM-01` Connexion / Login
- **Objectif** : Permettre l'authentification de tous les rôles via la page de connexion.
- **Exigences** : `EC-COM-01`, `IX-COM-01`, `UF-*` auth, `TAKT-L03-03`.
- **Périmètre** : `apps/frontend/src/pages/auth/LoginPage.tsx`, composants `FormulaireConnexion`. **Hors périmètre** : récupération mot de passe.
- **Livrables** : Formulaire React Hook Form + Zod (email, mot de passe) ; soumission vers `POST /api/v1/auth/login` ; gestion des erreurs 401/429 avec messages français ; redirection selon rôle après succès ; accessibilité clavier, `aria-label`.
- **Critères** : *Given* identifiants valides, *When* soumission, *Then* redirection vers l'écran par défaut du rôle. *Given* identifiants invalides, *Then* message « Identifiants incorrects » sans distinction. *Given* 6 échecs, *Then* message « Trop de tentatives, réessayez plus tard ».
- **DoD** : Page fonctionnelle, tests E2E Playwright `UF-GES-01` (connexion), 0 erreur axe-core.
- **SP** : 5 · **Dépend de** : `TAKT-L08-02`, `TAKT-L08-04`, `TAKT-L08-07` · **Bloque** : `TAKT-L09-02`…`TAKT-L09-12`.

#### TAKT-L09-02 — Écran `EC-COM-02` Tableau de bord centralisé
- **Objectif** : Vue d'état global des versions en cours, notifications, actions rapides.
- **Exigences** : `EC-COM-02`, `UF-GES-01`, `EX-NOT-01`.
- **Périmètre** : `apps/frontend/src/pages/dashboard/DashboardPage.tsx`, widgets `VersionStatusWidget`, `NotificationBell`. **Hors périmètre** : détail des versions.
- **Livrables** : Liste des versions avec filtre par état, département ; indicateurs (nombre en `generation`, `edition`, `valid_pedag`) ; cloche de notifications (SSE) avec badge ; rafraîchissement auto 30 s ; responsive.
- **Critères** : *Given* une version en `generation`, *Then* elle apparaît avec badge « Génération en cours ». *Given* une notification SSE reçue, *Then* le badge s'incrémente sans rechargement.
- **DoD** : Page rendue, widgets typés, SSE intégré, 0 erreur axe-core.
- **SP** : 8 · **Dépend de** : `TAKT-L09-01`, `TAKT-L08-03`, `TAKT-L02-05` · **Bloque** : `TAKT-L09-03`…

#### TAKT-L09-03 — Écran `EC-COM-03` Profil utilisateur
- **Objectif** : Gestion du profil, préférences de notification, changement de thème.
- **Exigences** : `EC-COM-03`, `IX-COM-03`.
- **Périmètre** : `apps/frontend/src/pages/profile/ProfilePage.tsx`. **Hors périmètre** : administration des utilisateurs.
- **Livrables** : Formulaire modification nom, email, mot de passe (actuel + nouveau) ; toggle thème Normal/Ramadan persistant ; préférences email/in-app ; bouton déconnexion.
- **Critères** : *Given* changement de thème, *Then* tokens Ramadan appliqués immédiatement. *Given* mot de passe actuel faux, *Then* erreur 400.
- **DoD** : Page complète, persistance thème dans localStorage, accessibilité.
- **SP** : 5 · **Dépend de** : `TAKT-L09-01`, `TAKT-L08-01` · **Bloque** : —

#### TAKT-L09-04 — Écrans `EC-ADM-01` à `EC-ADM-04` Administration
- **Objectif** : Fournir les 4 écrans d'administration (utilisateurs, référentiels durables, paramètres système, journal d'audit).
- **Exigences** : `EC-ADM-01`…`EC-ADM-04`, `IX-ADM-01`…`IX-ADM-08`.
- **Périmètre** : `apps/frontend/src/pages/admin/**`. **Hors périmètre** : écrans gestionnaire.
- **Livrables** : 
  - `EC-ADM-01` : grille utilisateurs (CRUD, rôles, activation) réutilisant `ReferentielManager` (L04-06).
  - `EC-ADM-02` : gestion types enseignement, grades, coefficients (CRUD).
  - `EC-ADM-03` : formulaire paramètres système (pas de temps, jours ouvrés, seuil verrouillage génération).
  - `EC-ADM-04` : tableau audit filtrable (action, date, utilisateur, entité) avec export CSV.
- **Critères** : Chaque écran respecte la grille RBAC (admin seul en écriture) ; export CSV audit fonctionnel ; paramètres système modifient la config centrale.
- **DoD** : 4 écrans livrés, tests E2E sur CRUD utilisateurs et export audit, 0 axe-core.
- **SP** : 13 · **Dépend de** : `TAKT-L04-06`, `TAKT-L11-01` (audit read) · **Bloque** : —

#### TAKT-L09-05 — Écrans `EC-GES-01` Initialisation année/semestre et import archive
- **Objectif** : Création du squelette année/semestre et import sélectif depuis année clôturée.
- **Exigences** : `EC-GES-01`, `IX-GES-01`, `IX-GES-02`, `TAKT-L04-08`.
- **Périmètre** : `apps/frontend/src/pages/ges/InitialisationPage.tsx`, assistant import.
- **Livrables** : Formulaire année/semestre (validation unicité) ; assistant import multi-étapes (choix année source, types de données, aperçu chiffré, confirmation) ; rapport d'erreurs ligne à ligne ; désactivation des boutons si prérequis manquants.
- **Critères** : *Given* année source sélectionnée, *When* aperçu affiché, *Then* compte exact par type. *Given* import confirmé, *Then* lignes valides importées, invalides listées.
- **DoD** : Assistant complet, idempotence, tests E2E `UF-GES-01`.
- **SP** : 8 · **Dépend de** : `TAKT-L04-08`, `TAKT-L09-01` · **Bloque** : `TAKT-L09-06`.

#### TAKT-L09-06 — Écrans `EC-GES-02` Préparation plans d'études et `EC-GES-03` Tableau de préparation (contraintes)
- **Objectif** : Saisie du plan d'études (parcours, matières, volumes) et des contraintes (vœux, indisponibilités, exigences salle).
- **Exigences** : `EC-GES-02`, `EC-GES-03`, `IX-GES-03`, `IX-GES-04`.
- **Périmètre** : `apps/frontend/src/pages/ges/PlanEtudesPage.tsx`, `ContraintesPage.tsx`.
- **Livrables** : Éditeur plan d'études avec héritage par groupe ; indicateurs de couverture en temps réel ; formulaires contraintes (créneaux préférés/évités, indisponibilités enseignants, exigences salle) ; validation côté client via schémas Zod partagés.
- **Critères** : *Given* un plan incomplet, *Then* indicateur couverture < 100 %. *Given* contrainte invalide, *Then* erreur affichée avant envoi.
- **DoD** : 2 écrans, indicateurs cohérents avec API, tests d'intégration.
- **SP** : 10 · **Dépend de** : `TAKT-L05-01`, `TAKT-L05-06`, `TAKT-L09-05` · **Bloque** : `TAKT-L09-07`.

#### TAKT-L09-07 — Écran `EC-GES-04` Lancement et suivi des générations
- **Objectif** : Lancer la génération CP-SAT, suivre la progression, lister les scénarios.
- **Exigences** : `EC-GES-04`, `IX-GES-05`, `TAKT-L07-03`, `TAKT-L07-07`.
- **Périmètre** : `apps/frontend/src/pages/ges/GenerationPage.tsx`.
- **Livrables** : Bouton « Lancer génération » (désactivé si garde-fous non satisfaits) ; barre de progression temps réel via SSE (`generation.progress`) ; tableau des scénarios avec score global et sous-scores ; logs du solveur ; bouton « Annuler » si aucun scénario adopté.
- **Critères** : *Given* prérequis non remplis, *Then* bouton désactivé et message explicatif. *Given* génération en cours, *Then* progression mise à jour < 2 s. *Given* génération terminée, *Then* scénarios listés.
- **DoD** : Page fonctionnelle, SSE temps réel, gestion annulation, tests E2E `UF-GES-03`.
- **SP** : 8 · **Dépend de** : `TAKT-L07-03`, `TAKT-L07-07`, `TAKT-L09-06` · **Bloque** : `TAKT-L09-08`.

#### TAKT-L09-08 — Écran `EC-GES-05` Comparaison de scénarios
- **Objectif** : Comparer côte à côte 2 à 4 scénarios avant sélection.
- **Exigences** : `EC-GES-05`, `IX-GES-06`, `TAKT-L07-06`.
- **Périmètre** : `apps/frontend/src/pages/ges/ScenarioComparisonPage.tsx`.
- **Livrables** : Vue comparative (grille par scénario, highlight différences séances/salles/enseignants) ; tableau scores globaux + sous-scores ; bouton « Adopter ce scénario » appelant `POST /api/v1/generations/:id/select`.
- **Critères** : *Given* 3 scénarios, *When* comparés, *Then* différences visuelles surlignées. *Given* adoption, *Then* version passe en `edition`.
- **DoD** : Comparateur visuel, adoption fonctionnelle, test E2E `UF-GES-04`.
- **SP** : 8 · **Dépend de** : `TAKT-L07-06`, `TAKT-L09-07` · **Bloque** : `TAKT-L09-09`.

#### TAKT-L09-09 — Écran `EC-GES-06` Grille EDT drag&drop + `EC-GES-07` Simulation conflits + `EC-GES-12` Bail d'édition
- **Objectif** : Édition manuelle du planning avec drag&drop, détection conflits temps réel, bail exclusif.
- **Exigences** : `EC-GES-06`, `EC-GES-07`, `EC-GES-12`, `IX-GES-07`, `IX-GES-08`, `IX-GES-09`, `IX-GES-10`, `IX-GES-16`, `TAKT-L06-05`, `TAKT-L06-06`, `TAKT-L06-07`.
- **Périmètre** : `apps/frontend/src/pages/ges/EdtGridPage.tsx`, composants `GrilleEDT`, `ConflitModal`, `VerrouBadge`.
- **Livrables** : Grille interactive `@dnd-kit` (jours × créneaux) ; drag&drop séance → recalcul immédiat conflits (appel `simuler`) ; badge verrou sur séance (type, expiré) ; acquisition/renouvellement bail (30 min) ; forçage admin ; simulation jusqu'à 20 alternatives classées ; application alternative sans rechargement.
- **Critères** : *Given* déplacement vers créneau occupé, *Then* conflit bloquant affiché, déplacement annulé. *Given* bail expiré, *Then* second utilisateur peut éditer. *Given* admin force, *Then* bail libéré.
- **DoD** : Grille complète, drag&drop fluide, conflits temps réel, bail, 0 axe-core, test E2E `UF-GES-05`.
- **SP** : 13 · **Dépend de** : `TAKT-L06-05`, `TAKT-L06-06`, `TAKT-L06-07`, `TAKT-L08-05`, `TAKT-L09-08` · **Bloque** : `TAKT-L09-10`.

#### TAKT-L09-10 — Écran `EC-GES-08` Soumission pour validation Département
- **Objectif** : Soumettre la version en édition vers `valid_pedag` après vérification couverture 100 %.
- **Exigences** : `EC-GES-08`, `IX-GES-11`, `RB-UI-06`, `TAKT-L06-09`.
- **Périmètre** : `apps/frontend/src/pages/ges/SubmissionPage.tsx`.
- **Livrables** : Récapitulatif scores, conflits résiduels, couverture par département ; bouton « Soumettre » (désactivé si couverture ≠ 100 %) ; confirmation avec message « Cette action notifie les responsables de département ».
- **Critères** : *Given* couverture 97 %, *Then* bouton désactivé, détail manquant affiché. *Given* 100 %, *Then* soumission crée transition `edition → valid_pedag`.
- **DoD** : Page complète, garde couverture, test E2E `UF-GES-06`.
- **SP** : 6 · **Dépend de** : `TAKT-L06-09`, `TAKT-L09-09` · **Bloque** : `TAKT-L09-11`.

#### TAKT-L09-11 — Écrans `EC-GES-09` Publication, `EC-GES-10` Archivage, `EC-GES-11` Exports
- **Objectif** : Publier la version validée, générer les exports, archiver.
- **Exigences** : `EC-GES-09`, `EC-GES-10`, `EC-GES-11`, `IX-GES-12`, `IX-GES-13`, `IX-GES-15`, `TAKT-L10-01`…`TAKT-L10-05`.
- **Périmètre** : `apps/frontend/src/pages/ges/PublishArchiveExportPage.tsx`.
- **Livrables** : 
  - Publication : bouton « Publier » (confirmation immutabilité) → transition `valide → publie` ; notification SSE + email.
  - Archivage : bouton « Archiver » depuis `valide` ou `publie` → `archive`.
  - Exports : sélecteur format (XLSX, PDF, ICS) ; téléchargement via URL pré-signée (expiration 24 h) ; historique exports.
- **Critères** : *Given* version `publie`, *Then* aucune modification possible. *Given* export demandé, *Then* fichier téléchargeable dans les 24 h.
- **DoD** : 3 actions fonctionnelles, exports conformes (L10), tests E2E `UF-GES-07`.
- **SP** : 8 · **Dépend de** : `TAKT-L10-01`…`TAKT-L10-05`, `TAKT-L09-10` · **Bloque** : —

#### TAKT-L09-12 — Écrans `EC-RDEP-01` à `EC-RDEP-05` Responsable Département
- **Objectif** : Saisie/validation répartition, validation/rejet version, revalidation ciblée, consultation transversale.
- **Exigences** : `EC-RDEP-01`…`EC-RDEP-05`, `IX-RDEP-01`…`IX-RDEP-05`, `UF-RDEP-01`, `UF-RDEP-02`, `TAKT-L05-06`, `TAKT-L05-05`.
- **Périmètre** : `apps/frontend/src/pages/rdep/**`.
- **Livrables** : 
  - `EC-RDEP-01` : saisie affectations (réutilise `AffectationEditor`).
  - `EC-RDEP-02` : récapitulatif + bouton « Valider ma répartition » / « Annuler ».
  - `EC-RDEP-03` : validation ou rejet version `valid_pedag` (champ motif obligatoire).
  - `EC-RDEP-04` : revalidation ciblée (notification, boutons valider/rejeter + motif).
  - `EC-RDEP-05` : consultation lecture seule de tous départements avec état validation.
- **Critères** : *Given* rejet sans motif, *Then* bouton désactivé. *Given* revalidation demandée, *Then* seul département impacté affiché.
- **DoD** : 5 écrans, parcours `UF-RDEP-01` et `UF-RDEP-02` couverts en E2E, 0 axe-core.
- **SP** : 10 · **Dépend de** : `TAKT-L05-06`, `TAKT-L05-05`, `TAKT-L09-06` · **Bloque** : —

#### TAKT-L09-13 — Écrans `EC-DIR-01` à `EC-DIR-05` Direction
- **Objectif** : Consultation scénario final, validation/rejet avec motif, archivage sans publication, export officiel.
- **Exigences** : `EC-DIR-01`…`EC-DIR-05`, `IX-DIR-01`…`IX-DIR-05`, `UF-DIR-01`.
- **Périmètre** : `apps/frontend/src/pages/dir/**`.
- **Livrables** : 
  - `EC-DIR-01` : vue détaillée scénario (scores, séances par groupe/enseignant/salle).
  - `EC-DIR-02` : validation finale (`valid_dir → valide`) ou rejet.
  - `EC-DIR-03` : rejet avec sélecteur type (pédagogique → `rep_pedag` / planning → `edition`) + motif obligatoire.
  - `EC-DIR-04` : archivage sans publication (`valide → archive`).
  - `EC-DIR-05` : téléchargement exports officiels (XLSX, PDF, ICS).
- **Critères** : *Given* rejet pédagogique, *Then* version repasse en `rep_pedag`. *Given* rejet planning, *Then* version repasse en `edition`.
- **DoD** : 5 écrans, parcours `UF-DIR-01` E2E, 0 axe-core.
- **SP** : 10 · **Dépend de** : `TAKT-L06-02`, `TAKT-L10-01`…`TAKT-L10-05`, `TAKT-L09-10` · **Bloque** : —

### Lot L10 — Publication, exports, notifications (7 tickets · 44 SP)

#### TAKT-L10-01 — Implémenter la transition de publication (`valide → publie`)
- **Objectif** : Rendre une version immuable, déclencher notifications et génération d'exports.
- **Exigences** : `EX-WKF-04`, `EX-PRI-02`, `TE-ARCH-03`, `IX-GES-12`, `EC-GES-09`.
- **Périmètre** : `apps/backend/src/modules/versions/workflow/publish.ts`, `apps/backend/src/modules/exports/**` (déclenchement). **Hors périmètre** : génération des fichiers (L10-02..05).
- **Livrables** : Service `publishVersion(versionId)` : vérification état `valide`, passage à `publie` (horodatage, `publiePar`), verrouillage écriture (garde immuabilité), émission événements SSE `version.published` + `notification` ; envoi email via job pg-boss ; création jobs d'export (XLSX, PDF, ICS) ; audit `PUBLICATION`.
- **Critères** : *Given* version `valide`, *When* publication, *Then* état `publie` et immuabilité effective. *Given* version déjà `publie`, *Then* 409. *Given* publication, *Then* 3 jobs d'export en file d'attente.
- **DoD** : Transition atomique, immuabilité testée, 3 jobs export créés, notifications émises.
- **Tests exigés** : tests d'intégration (publication, immuabilité, jobs export, notifications).
- **SP** : 6 · **Dépend de** : `TAKT-L06-02`, `TAKT-L06-10` · **Bloque** : `TAKT-L10-02`…`TAKT-L10-05`.

#### TAKT-L10-02 — Générer l'export Excel (XLSX) de la grille EDT
- **Objectif** : Produire un fichier Excel fidèle à la grille, en noir et blanc, avec en-têtes institutionnels.
- **Exigences** : `EX-EXP-01`, `EX-EXP-04`, `EC-GES-11`, `IX-GES-15`.
- **Périmètre** : `apps/backend/src/modules/exports/xlsx/**`, job pg-boss `export.xlsx`.
- **Livrables** : Job pg-boss consommant `export.xlsx` : lecture version `publie`, construction feuille par département (onglets) : colonnes jour, créneaux, matières, enseignants, salles, groupes ; style N&B (pas de couleur) ; en-tête établissement, semestre, version ; écriture fichier dans store fichiers ; URL pré-signée 24 h retournée ; audit `EXPORT` avec format.
- **Critères** : *Given* version publiée avec 4 000 séances, *When* export lancé, *Then* fichier XLSX valide, ouvrable, sans corruption. *Given* téléchargement via URL signée après 25 h, *Then* 403/410.
- **DoD** : Job opérationnel, fichier conforme, URL signée expirante, audit.
- **Tests exigés** : test d'intégration (génération, ouverture, lecture données, expiration URL).
- **SP** : 6 · **Dépend de** : `TAKT-L10-01` · **Bloque** : `TAKT-L09-11`.

#### TAKT-L10-03 — Générer l'export PDF (Playwright/Chromium) de la grille EDT
- **Objectif** : Produire un PDF paginé, imprimable, identique visuellement à la grille web (mode impression).
- **Exigences** : `EX-EXP-02`, `EX-EXP-04`, `SPK-03`.
- **Périmètre** : `apps/backend/src/modules/exports/pdf/**`, job pg-boss `export.pdf`.
- **Livrables** : Job pg-boss : rendu HTML de la grille (template dédiée, CSS print, tokens N&B) via Playwright headless ; options PDF (A4 paysage, marges 10 mm, en-tête/pied de page institutionnels) ; fichier stocké, URL signée 24 h ; audit.
- **Critères** : *Given* version publiée, *When* export PDF, *Then* PDF multi-pages correct, pas de coupure de séance au milieu d'une page (page-break-inside: avoid). *Given* ouverture PDF, *Then* texte sélectionnable, pas d'image rasterisée.
- **DoD** : Job PDF fonctionnel, rendu fidèle, pagination propre, URL signée, audit.
- **Tests exigés** : test d'intégration (génération, nombre de pages, contenu textuel).
- **SP** : 8 · **Dépend de** : `TAKT-L10-01` · **Bloque** : `TAKT-L09-11`.

#### TAKT-L10-04 — Générer l'export calendrier (.ics) pour intégration personnelle
- **Objectif** : Fournir un fichier iCalendar standard pour chaque utilisateur concerné.
- **Exigences** : `EX-EXP-03`, `EX-EXP-04`, `IX-GES-15`.
- **Périmètre** : `apps/backend/src/modules/exports/ics/**`, job pg-boss `export.ics`.
- **Livrables** : Job pg-boss : pour chaque enseignant/groupe, génération d'événements `VEVENT` récurrents hebdomadaires (14 semaines) avec `RRULE` ; UID stable ; description (matière, salle, type) ; fichier unique par version ou par destinataire ; URL signée 24 h ; audit.
- **Critères** : *Given* fichier .ics importé dans Outlook/Google, *Then* les 14 occurrences apparaissent aux bons créneaux. *Given* modification de version (nouvelle publication), *Then* nouvel .ics avec UID différent.
- **DoD** : .ics valide (validateur RFC 5545), récurrence correcte, URL signée, audit.
- **Tests exigés** : test d'intégration (génération, validation RFC, import simulé).
- **SP** : 6 · **Dépend de** : `TAKT-L10-01` · **Bloque** : `TAKT-L09-11`.

#### TAKT-L10-05 — Implémenter les notifications in-app (SSE) et email
- **Objectif** : Diffuser en temps réel les événements métier et envoyer les emails institutionnels.
- **Exigences** : `EX-NOT-01`, `EX-NOT-02`, `EX-NOT-03`, `WORKFLOW_METIER §9`, `ST_TAKT §1.2`, `TE-ARCH-05`.
- **Périmètre** : `apps/backend/src/modules/notifications/**` (service, templates email, consommateur pg-boss), `apps/frontend/src/stores/notificationStore.ts`, `apps/frontend/src/components/molecules/NotificationBell.tsx`. **Hors périmètre** : configuration SMTP (infra).
- **Livrables** : Service `notify(event, destinataires)` : écriture `Notification` (in-app) + job pg-boss `email.send` ; templates email (FR) par type d'événement (génération terminée, validation demandée, rejet, publication, export prêt) ; préférences utilisateur (email on/off, in-app on/off) ; SSE `notification` push temps réel ; badge cloche mis à jour ; marque « lu » persistée.
- **Critères** : *Given* transition `valid_dir → valide`, *Then* notification in-app + email envoyés aux `gest` + `rdep` concernés. *Given* utilisateur a désactivé email, *Then* seul in-app. *Given* notification lue, *Then* badge décrémenté.
- **DoD** : 9 types d'événements couverts, templates FR, préférences respectées, SSE temps réel, badge fonctionnel.
- **Tests exigés** : tests unitaires (templates, préférences), tests d'intégration (envoi, SSE, badge).
- **SP** : 8 · **Dépend de** : `TAKT-L02-05`, `TAKT-L03-03` · **Bloque** : `TAKT-L09-11`, `TAKT-L09-13`.

#### TAKT-L10-06 — Implémenter le journal de sécurité (SecurityEvent)
- **Objectif** : Tracer les événements de sécurité (connexions échouées, changements de mot de passe, élévation de privilèges).
- **Exigences** : `EX-SEC-01`, `ST_TAKT §5.4`, `TESTS.md §6.1`.
- **Périmètre** : `apps/backend/src/modules/audit/security.ts`, modèle `SecurityEvent` (si distinct de `JournalAudit`). **Hors périmètre** : consultation (L11-01).
- **Livrables** : Écriture asynchrone (pg-boss) d'événements : `LOGIN_FAILED`, `LOGIN_SUCCESS`, `PASSWORD_CHANGED`, `ROLE_CHANGED`, `FORCE_LOCK_RELEASE`, `EXPORT_DOWNLOAD` ; champs : `utilisateurId`, `ip`, `userAgent`, `details` JSONB ; rétention 5 ans ; accès `admin` uniquement.
- **Critères** : *Given* 5 échecs de connexion, *Then* 5 `LOGIN_FAILED` avec IP. *Given* forçage bail par admin, *Then* `FORCE_LOCK_RELEASE` tracé.
- **DoD** : Événements écrits, rétention documentée, accès restreint.
- **Tests exigés** : tests d'intégration (écriture, filtrage admin).
- **SP** : 5 · **Dépend de** : `TAKT-L03-06` · **Bloque** : `TAKT-L11-01`.

#### TAKT-L10-07 — Dupliquer une version archivée vers `initial` (nouveau semestre)
- **Objectif** : Permettre la création d'un nouveau semestre à partir d'une version archivée.
- **Exigences** : `EX-WKF-06`, `EX-OUV-02`, `WF-02`, `EC-GES-14`, `UF-GES-08`.
- **Périmètre** : `apps/backend/src/modules/versions/duplicate.ts`, `apps/frontend/src/pages/ges/DuplicateVersionPage.tsx`. **Hors périmètre** : modification de l'archive.
- **Livrables** : Endpoint `POST /api/v1/versions/:id/duplicate` : copie de la version archivée (séances, affectations, verrous, snapshots) vers nouvelle version `initial` (nouvelle année/semestre) ; conservation de l'archive ; audit `DUPLICATION` ; UI : sélection version source, saisie nouvelle année/semestre, aperçu du volume à dupliquer.
- **Critères** : *Given* version `archive`, *When* duplication, *Then* nouvelle version `initial` créée avec même contenu. *Given* tentative duplication d'une version non archivée, *Then* 400.
- **DoD** : Duplication fonctionnelle, archive inchangée, audit, UI complète.
- **Tests exigés** : tests d'intégration (duplication, intégrité données, audit).
- **SP** : 5 · **Dépend de** : `TAKT-L06-01`, `TAKT-L06-10`, `TAKT-L09-11` · **Bloque** : —

### Lot L11 — Qualité, exploitation, déploiement, recette (7 tickets · 49 SP)

#### TAKT-L11-01 — Fournir la consultation et l'export du journal d'audit et de sécurité
- **Objectif** : Exposer `EC-ADM-04` : tableau filtrable, export CSV, conservation 3/5 ans.
- **Exigences** : `EC-ADM-04`, `IX-ADM-07`, `IX-ADM-08`, `EX-DAT-05`, `TE-SEC-05`.
- **Périmètre** : `apps/backend/src/modules/audit/read/**`, `apps/frontend/src/pages/admin/AuditPage.tsx`. **Hors périmètre** : écriture (L03-06, L10-06).
- **Livrables** : Endpoints `GET /api/v1/audit` (filtres : action, dateFrom/To, utilisateur, entité, entitéId, pagination) ; `GET /api/v1/audit/export` (CSV) ; `GET /api/v1/security` (même pattern) ; UI : table paginée, filtres multiples, bouton export CSV ; respect rétention (pas de données au-delà).
- **Critères** : *Given* filtre `action=TRANSITION_ETAT` et plage 30 jours, *Then* résultats exacts. *Given* export CSV 10 000 lignes, *Then* fichier téléchargeable < 5 s.
- **DoD** : Lecture + export fonctionnels, filtres complets, performance acceptable, 0 axe-core.
- **Tests exigés** : tests d'intégration (filtres, pagination, export CSV) + test E2E `UF-ADM-01`.
- **SP** : 6 · **Dépend de** : `TAKT-L03-06`, `TAKT-L10-06`, `TAKT-L09-04` · **Bloque** : —

#### TAKT-L11-02 — Mettre en place le monitoring (Prometheus, Grafana, Alertmanager)
- **Objectif** : Déployer la stack d'observabilité conforme à `SPEC_MONITORING.md`.
- **Exigences** : `SPEC_MONITORING §2`–`§10`, `PLAN_MACRO` E5.3, `GG-11`.
- **Périmètre** : `monitoring/prometheus/**`, `monitoring/grafana/dashboards/**`, `monitoring/alertmanager/**`, `apps/backend/src/instrumentation/**`. **Hors périmètre** : infrastructure serveur (fourni).
- **Livrables** : 
  - Prometheus : `prometheus.yml` (scrape backend, frontend, postgres, node-exporter, pg-boss, solver-worker) ; règles d'alerte 3 groupes (infra, métier, solver) ; 
  - Grafana : 3 dashboards JSON (`takt-infrastructure.json`, `takt-business.json`, `takt-solver.json`) provisionnés ; 
  - Alertmanager : routes, récepteurs (email SMTP institutionnel) ; 
  - Backend : exposition `/metrics` (Prometheus client) avec 8 métriques infra, 14 métier, 5 solver ; 
  - Runbook simplifié par alerte (lien dans annotation).
- **Critères** : *Given* backend en panne, *Then* alerte `ServiceDown` déclenchée < 1 min. *Given* taux d'erreur 5xx > 2 %, *Then* alerte `HighErrorRate`. *Given* génération échouée, *Then* alerte `GenerationFailed`.
- **DoD** : Stack déployée sur recette, dashboards visibles, alertes testées (simulation), runbook présent.
- **Tests exigés** : test de montage stack (docker-compose monitoring), simulation d'alertes (curl /metrics, injection).
- **SP** : 8 · **Dépend de** : `TAKT-L01-06`, `TAKT-L07-05` · **Bloque** : `TAKT-L11-04`.

#### TAKT-L11-03 — Configurer la gestion des secrets (SOPS + age, Docker secrets)
- **Objectif** : Sécuriser les 9 secrets requis sans les commiter en clair.
- **Exigences** : `SPEC_SECRETS.md`, `GG-11`, `PLAN_MACRO` G4.
- **Périmètre** : `.sops.yaml`, `.env.prod.enc` (commité), `scripts/decrypt-secrets.sh`, `docker-compose.prod.yml` (section `secrets`), `apps/backend/src/config/secrets.ts`. **Hors périmètre** : génération de la clé age (opération unique hors repo).
- **Livrables** : Fichier `.sops.yaml` (règles de chiffrement par chemin) ; `.env.prod.enc` chiffré avec `age` ; script de déchiffrement au déploiement (CI/CD) qui peuple les Docker secrets ; code backend lisant les secrets via fichiers `/run/secrets/*` ; procédure de rotation documentée.
- **Critères** : *Given* déploiement recette, *When* secrets déchiffrés, *Then* services démarrent sans variable d'environnement en clair. *Given* rotation de clé, *Then* procédure permet le renouvellement sans downtime.
- **DoD** : Aucun secret en clair dans Git ; déchiffrement automatisé en CI ; lecture via Docker secrets fonctionnelle ; rotation testée (simulation).
- **Tests exigés** : test CI (déchiffrement + démarrage services) ; audit `git log` pour absence de secrets.
- **SP** : 6 · **Dépend de** : `TAKT-L01-06`, `TAKT-L00-04` · **Bloque** : `TAKT-L11-04`.

#### TAKT-L11-04 — Finaliser le pipeline CI/CD complet (lint, typecheck, build, test, docker, deploy recette)
- **Objectif** : Pipeline bloquant sur qualité, déployant automatiquement la recette sur push `main`.
- **Exigences** : `PLAN_MACRO E5.4`, `TE-TEST-05`, `TESTS.md §8`, `.github/workflows/ci.yml` (existant à compléter).
- **Périmètre** : `.github/workflows/ci.yml`, `docker-compose.test.yml`, `docker-compose.prod.yml`, scripts de déploiement. **Hors périmètre** : infrastructure cible.
- **Livrables** : Jobs séquentiels : `lint-and-typecheck` → `test` (unit + int + coverage ≥ 80 % lignes, 100 % branches critiques) → `build` → `docker-build` (backend, frontend, solver-worker) → `e2e` (Playwright sur stack test) → `deploy-recette` (ssh + docker compose pull/up, healthchecks, rollback script) ; artefacts Docker tagués `sha-${GITHUB_SHA}` ; notifications Slack/email sur échec ; protection `main` (requis checks).
- **Critères** : *Given* PR avec test échoué, *Then* pipeline rouge, merge bloqué. *Given* push `main` vert, *Then* recette mise à jour et healthchecks verts. *Given* rollback déclenché, *Then* version précédente restaurée < 5 min.
- **DoD** : Pipeline verte sur `main` ; recette accessible ; rollback testé ; tags Docker ; notifications.
- **Tests exigés** : exécution complète sur PR test, déploiement recette réel, rollback simulé.
- **SP** : 10 · **Dépend de** : `TAKT-L01-07`, `TAKT-L11-02`, `TAKT-L11-03`, `TAKT-L09-13` · **Bloque** : `TAKT-L11-05`.

#### TAKT-L11-05 — Exécuter la recette métier complète et signer le PV
- **Objectif** : Valider l'ensemble des parcours critiques avec la MOA et obtenir la signature.
- **Exigences** : `PLAN_MACRO E5.5`, `E5.6`, `TESTS.md §7`, `UF-*` (12 parcours).
- **Périmètre** : `docs/PV_RECETTE.md` (nouveau), `docs/GUIDE_UTILISATEUR.md` (nouveau), exécution manuelle des 12 parcours `UF-*` sur recette. **Hors périmètre** : corrections post-recette (nouveau backlog).
- **Livrables** : Plan de recette (scénarios, données, critères de passage) ; exécution tracée (captures, logs) ; PV de recette signé par MOA + Tech Lead ; guide utilisateur (PDF) remis ; liste des anomalies résiduelles (si mineures) avec plan d'action.
- **Critères** : *Given* les 12 parcours exécutés, *Then* 100 % passent sans anomalie bloquante. *Given* PV signé, *Then* jalon J70 atteint.
- **DoD** : PV signé, guide remis, anomalies documentées, jalon J70 validé.
- **Tests exigés** : exécution manuelle des 12 parcours `UF-*` sur environnement recette (checklist).
- **SP** : 8 · **Dépend de** : `TAKT-L11-04` · **Bloque** : —

#### TAKT-L11-06 — Audit de sécurité, conformité AGPL et revue de code finale
- **Objectif** : Vérifier l'absence de failles, la conformité licence et la qualité du code avant production.
- **Exigences** : `LICENCE_AGPL.md`, `SPEC_SECRETS.md`, `TE-SEC-01`…`TE-SEC-06`, `PLAN_MACRO` risque licence.
- **Périmètre** : `scripts/license-check.sh`, `scripts/security-audit.sh`, revue de code croisée (tous les PR). **Hors périmètre** : pentest externe (hors périmètre v1).
- **Livrables** : Script `license-check` (vérifie en-tête AGPL sur tous fichiers source) ; `security-audit` (npm audit, Snyk/OWASP, secrets scan) ; rapport d'audit ; checklist de revue (architecture, tests, documentation) signée par 2 réviseurs.
- **Critères** : *Given* `license-check`, *Then* 0 fichier sans en-tête. *Given* `npm audit`, *Then* 0 vulnérabilité critique/haute non justifiée. *Given* revue, *Then* chaque PR a 2 approbations.
- **DoD** : Scripts verts, rapport archivé, checklist signée.
- **Tests exigés** : exécution scripts en CI (job dédié).
- **SP** : 6 · **Dépend de** : `TAKT-L11-04` · **Bloque** : —

#### TAKT-L11-07 — Documentation technique et opérationnelle finale
- **Objectif** : Livrer la documentation complète pour l'exploitation et la maintenance.
- **Exigences** : `PLAN_MACRO E5.6`, `docs/DEPLOIEMENT.md`, `docs/DOC_MIGRATION_DB.md`, `docs/TESTS.md`.
- **Périmètre** : `docs/ARCHITECTURE_BACKEND.md`, `docs/ARCHITECTURE_FRONTEND.md`, `docs/OPERATIONS.md`, `docs/DECISIONS.md` (L00-05). **Hors périmètre** : guide utilisateur (L11-05).
- **Livrables** : 
  - `ARCHITECTURE_BACKEND.md` : modules, dépendances, flux, configuration, variables d'env. 
  - `ARCHITECTURE_FRONTEND.md` : arborescence, stores, routing, thème, tests. 
  - `OPERATIONS.md` : démarrage/arrêt, sauvegardes pgBackRest, rotation logs, scaling, runbooks monitoring. 
  - `DECISIONS.md` : registre consolidé (L00-05).
- **Critères** : *Given* un nouvel opérateur, *When* il lit `OPERATIONS.md`, *Then* il peut démarrer, sauvegarder, restaurer, scaler sans aide.
- **DoD** : 4 documents à jour, versionnés, lisibles, cohérents avec le code.
- **Tests exigés** : relecture croisée (architecte + DevOps) ; validation liens internes.
- **SP** : 5 · **Dépend de** : `TAKT-L00-05`, `TAKT-L11-04` · **Bloque** : —

---

## §5. Registre des risques projet et plan de mitigation

| ID | Risque | Probabilité | Impact | Mitigation | Responsable | Ticket lié |
|----|--------|-------------|--------|------------|-------------|------------|
| R-01 | Solver CP-SAT trop lent sur version réaliste | Moyenne | Élevé | Spike L07-05, limite séances/génération, scénarios ≤ 3, repli manuel | Backend Lead | `TAKT-L07-05` |
| R-02 | Conflits de verrous fréquents en édition | Moyenne | Moyen | Bail 30 min renouvelable, forçage admin, UI temps réel | Frontend Lead | `TAKT-L06-07` |
| R-03 | Cohérence frontend/backend sur schémas Zod | Faible | Élevé | Package `@takt/contracts` partagé, test de parité, CI bloquante | Fullstack | `TAKT-L02-02` |
| R-04 | Import depuis année clôturée partiel/erroné | Moyenne | Moyen | Aperçu obligatoire, rollback, tests E2E import | Backend Lead | `TAKT-L04-08` |
| R-05 | Thème Ramadan non conforme WCAG AA | Faible | Moyen | Revue design tokens, tests axe-core CI, correction 3 contrastes | Frontend Lead | `TAKT-L08-01` |
| R-06 | Retard déploiement production (infra, secrets) | Moyenne | Moyen | Recette identique à prod, runbook rollback, secrets SOPS | DevOps | `TAKT-L11-03`, `TAKT-L11-04` |
| R-07 | Dépendance à un seul développeur clé | Moyenne | Moyen | Documentation exhaustive, revues croisées, pair programming | Chef de projet | Transversal |
| R-08 | Dérive de périmètre (scope creep) | Moyenne | Élevé | DoR strict, périmètre figé par ticket, garde-fous GG-13 | Chef de projet | Transversal |
| R-09 | Non-respect licence AGPL (distribution sans sources) | Faible | Élevé | `license-check` en CI, audit final L11-06 | DevOps | `TAKT-L11-06` |
| R-10 | Perte de données (absence sauvegarde testée) | Faible | Critique | pgBackRest configuré, test de restauration trimestriel | DevOps | `TAKT-L11-02` |

---

## §6. Backlog de maintenance (post-recette)

| Ticket | Description | Priorité | Estimation | Note |
|--------|-------------|----------|------------|------|
| MAINT-01 | Mise à jour dépendances (trimestrielle) | Moyenne | 3 SP / trimestre | Automatiser via Dependabot |
| MAINT-02 | Rotation secrets (semestrielle) | Haute | 2 SP | Procédure L11-03 |
| MAINT-03 | Revue performance solveur (annuelle) | Basse | 5 SP | Bench L07-05 |
| MAINT-04 | Évolution accessibilité (nouvelles règles WCAG) | Basse | 5 SP | Tests axe-core continus |
| MAINT-05 | Support navigateurs (mise à jour Playwright) | Moyenne | 2 SP / release | CI E2E |
| MAINT-06 | Évolution métier (nouveaux types d'enseignement, règles charge) | Selon demande | 5–13 SP | Nouveaux tickets backlog |

---

*Fin du BACKLOG_TAKT.md — 89 tickets, 504 SP, prêt pour exécution en flux continu.*
