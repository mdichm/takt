# Parcours utilisateur critiques — TAKT (UI_USER_FLOWS.md)

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques  
**Version :** 0.1 (E0.3b — validé)  
**Date :** 30 octobre 2026  
**Responsables :** UX Designer + MOA  
**Statut :** Phase 0 (E0.3b) — Validé  
**Critère de sortie :** Parcours utilisateur figés  
**Documents liés :** UI_ARBORESCENCE.md (E0.3a), WORKFLOW_METIER.md (E0.2), SF_TAKT.md (§12 EX-UI-02)

---

**Convention d'identification.** Chaque parcours porte un code stable `UF-<DOMAINE>-<NN>` (ex: `UF-GES-01`, `UF-RDEP-02`). Le code est cité dans les spécifications d'interaction (E0.3d) et les wireframes (E0.3c), jamais le numéro de section.

---

## §1. Vue d'ensemble des parcours critiques

| Code | Parcours | Rôle principal | États workflow | Écrans principaux |
|------|----------|----------------|----------------|-------------------|
| `UF-GES-01` | Initialisation année/semestre | `gest` | — → `initial` | `EC-COM-02`, `EC-GES-01` |
| `UF-RDEP-01` | Saisie et validation répartition pédagogique | `rdep` | `initial` → `brouillon` | `EC-RDEP-01`, `EC-RDEP-02` |
| `UF-GES-02` | Préparation des contraintes et plans d'études | `gest` | `brouillon` → `brouillon` | `EC-GES-02`, `EC-GES-03` |
| `UF-GES-03` | Lancement et suivi de génération | `gest` | `brouillon` → `generation` | `EC-GES-04` |
| `UF-GES-04` | Sélection scénario et édition | `gest` | `generation` → `edition` | `EC-GES-05`, `EC-GES-06` |
| `UF-GES-05` | Modification drag&drop et verrous | `gest` | `edition` → `edition` | `EC-GES-06`, `EC-GES-07`, `EC-GES-12` |
| `UF-GES-06` | Soumission validation Département | `gest` | `edition` → `valid_pedag` | `EC-GES-08` |
| `UF-RDEP-02` | Validation départementale | `rdep` | `valid_pedag` → `valid_dir` ou `edition` (rejet) | `EC-RDEP-03` |
| `UF-DIR-01` | Validation finale Direction | `dir` | `valid_dir` → `valide` / `rep_pedag` / `edition` | `EC-DIR-01`, `EC-DIR-02`, `EC-DIR-03` |
| `UF-GES-07` | Publication et exports | `gest` | `valide` → `publie` | `EC-GES-09`, `EC-GES-11` |
| `UF-ADM-01` | Archivage et audit | `admin` | `publie` / `valide` → `archive` | `EC-ADM-04`, `EC-GES-10` |
| `UF-GES-08` | Nouvelle version depuis archive | `gest` | `archive` → `initial` | `EC-GES-10` |

**Total :** 12 parcours critiques couverts.

---

## §2. Détails des parcours critiques

### UF-GES-01 — Initialisation année/semestre

**Déclencheur :** Ouverture d'une nouvelle année académique ou d'un nouveau semestre.  
**Acteur :** `gest` (ou `admin`).  
**Écrans :** `EC-COM-02` (Tableau de bord centralisé), `EC-GES-01` (Initialisation année/semestre).  
**États de workflow :** — → `initial`.

**Étapes :**
1. `EC-COM-02` : Le `gest` accède au tableau de bord et sélectionne "Initialiser un nouveau semestre".
2. `EC-GES-01` : Le `gest` remplit le formulaire d'initialisation (année, numéro de semestre).
3. `EC-GES-01` : Le `gest` peut choisir d'importer tout ou partie des données de l'année/semestre précédent.
4. Système : Crée le squelette de version (état `initial`), verrouille le référentiel pour le semestre en cours.
5. Système : Génère une notification in-app + email au `rdep` ("Répartition pédagogique à saisir").

**Conditions de garde :** Année/semestre non encore initialisée.
**Cas alternatifs :** Import avec lignes invalides → rapport d'erreurs non bloquant, lignes valides importées.
**Notifications :** `initial` → `rep_pedag` : Resp. Département (In-app + Email : "Répartition pédagogique à saisir").

---

### UF-RDEP-01 — Saisie et validation répartition pédagogique

**Déclencheur :** Version en état `initial`, notification reçue pour saisie de la répartition pédagogique.  
**Acteur :** `rdep`.  
**Écrans :** `EC-RDEP-01` (Répartition pédagogique), `EC-RDEP-02` (Suivi des charges horaires).  
**États de workflow :** `initial` → `rep_pedag` → `brouillon`.

**Étapes :**
1. `EC-RDEP-01` : Le `rdep` saisit les affectations enseignants ↔ matières ↔ groupes, volumes horaires et type d'enseignement.
2. `EC-RDEP-02` : Le `rdep` consulte le suivi des charges horaires (alertes si dépassement de fourchette, blocage si seuil bloquant).
3. `EC-RDEP-01` : Le `rdep` valide sa répartition pédagogique pour son périmètre.
4. Système : Passe la version à `brouillon`, fige le snapshot immuable de la répartition.
5. Système : Notifie le `gest` ("Répartition validée, passage en brouillon").

**Conditions de garde :** Année/semestre initialisée, aucune affectation validée (pour annulation possible vers `initial`).
**Cas alternatifs :** Annulation avant validation → retour à `initial`.
**Notifications :** `rep_pedag` → `brouillon` : Gestionnaire (In-app + Email : "Répartition validée, passage en brouillon").

---

### UF-GES-02 — Préparation des contraintes et plans d'études

**Déclencheur :** Version en état `brouillon`, répartition pédagogique validée.  
**Acteur :** `gest`.  
**Écrans :** `EC-GES-02` (Préparation des plans d'études), `EC-GES-03` (Tableau de préparation - contraintes).  
**États de workflow :** `brouillon` → `brouillon` (préparation interne, pas de changement d'état).

**Étapes :**
1. `EC-GES-02` : Le `gest` vérifie les parcours, matières, volumes horaires, types d'enseignement, groupes ; hérite automatiquement des plans d'études par groupe.
2. `EC-GES-03` : Le `gest` saisit les contraintes, vœux, exigences de salle, indisponibilités enseignants.
3. `EC-GES-03` : Le `gest` consulte les indicateurs de couverture et les alarmes de faisabilité.
4. Système : Calcule en temps réel la couverture par affectation, affiche les conflits potentiels.

**Conditions de garde :** État `brouillon`, répartition pédagogique validée.
**Cas alternatifs :** Aucune modification → la version reste en `brouillon`.
**Notifications :** Aucune.

### UF-GES-03 — Lancement et suivi de génération

**Déclencheur :** Le `gest` décide de lancer une génération CP-SAT depuis `brouillon`.  
**Acteur :** `gest`.  
**Écrans :** `EC-GES-04` (Lancement et suivi des générations).  
**États de workflow :** `brouillon` → `generation`.

**Étapes :**
1. `EC-GES-04` : Le `gest` clique sur "Lancer génération".
2. Système : Vérifie que tous les départements ont validé leur affectation pédagogique (EX-REP-06).
3. Système : Soumet le job CP-SAT au worker, affiche la barre de progression.
4. `EC-GES-04` : Le `gest` suit la progression du job, consulte les logs, voit les scénarios trouvés avec leurs scores.
5. Système : Génère une notification in-app + email au `gest` ("Génération lancée / terminée").

**Conditions de garde :** État `brouillon`, tous les départements ont validé leur répartition pédagogique, contraintes saisies, aucun verrou bloquant.
**Cas alternatifs :** Échec de génération → conservation du job pour diagnostic, pas d'altération de la version précédente.
**Notifications :** `brouillon` → `generation` : Gestionnaire (In-app + Email : "Génération lancée / terminée").

---

### UF-GES-04 — Sélection scénario et édition

**Déclencheur :** Un ou plusieurs scénarios générés disponibles en état `generation`.  
**Acteur :** `gest`.  
**Écrans :** `EC-GES-05` (Comparaison de scénarios), `EC-GES-06` (Grille EDT drag&drop).  
**États de workflow :** `generation` → `edition`.

**Étapes :**
1. `EC-GES-05` : Le `gest` consulte la liste des scénarios notés (score global 0-100, sous-scores).
2. `EC-GES-05` : Le `gest` sélectionne le scénario le plus pertinent comme base d'édition.
3. Système : Crée une version en édition avec les séances du scénario adopté.
4. `EC-GES-06` : Le `gest` accède à la grille EDT interactive.

**Conditions de garde :** ≥ 1 scénario généré (ou partiel avec avertissements).
**Cas alternatifs :** Aucun scénario adopté → annulation (retour à `brouillon`).
**Notifications :** Aucune.

---

### UF-GES-05 — Modification drag&drop et verrous

**Déclencheur :** Version en état `edition`, le `gest` modifie le planning.  
**Acteur :** `gest`.  
**Écrans :** `EC-GES-06` (Grille EDT drag&drop), `EC-GES-07` (Simulation et résolution de conflits), `EC-GES-12` (Gestion des verrous de séance).  
**États de workflow :** `edition` → `edition` (modifications internes, pas de changement d'état).

**Étapes :**
1. `EC-GES-06` : Le `gest` effectue des déplacements par glisser-déposer sur la grille EDT.
2. Système : Recalcule immédiatement les conflits, vérifie les règles, met à jour les indicateurs.
3. `EC-GES-07` : Pour une séance en conflit, le `gest` consulte jusqu'à 20 alternatives classées (sans écriture immédiate).
4. `EC-GES-12` : Le `gest` pose ou lève des verrous (créneau, salle, enseignant, activité), éventuellement en masse par groupe/enseignant/salle.
5. Système : Enregistre chaque modification dans l'historique, annulable avant soumission.

**Conditions de garde :** État `edition`, bail d'édition acquis (30 min, renouvelable), couverture 100 % requise pour soumission.
**Cas alternatifs :** Conflit bloquant créé par un déplacement → le déplacement est refusé.
**Notifications :** Aucune.

---

### UF-GES-06 — Soumission validation Département

**Déclencheur :** Le `gest` considère la version prête pour validation départementale.  
**Acteur :** `gest`.  
**Écrans :** `EC-GES-08` (Soumission pour validation Département).  
**États de workflow :** `edition` → `valid_pedag`.

**Étapes :**
1. `EC-GES-08` : Le `gest` consulte le récapitulatif des scores et conflits.
2. `EC-GES-08` : Le `gest` clique sur "Soumettre pour validation Département".
3. Système : Vérifie que les verrous sont résolus et qu'aucun conflit dur n'est non résolu.
4. Système : Passe la version à `valid_pedag`.
5. Système : Notifie le `rdep` ("Version soumise pour validation Département").

**Conditions de garde :** État `edition`, verrous résolus, aucun conflit dur non résolu, couverture exactement 100 %.
**Cas alternatifs :** Couverture < 100 % ou conflit dur persistant → soumission désactivée.
**Notifications :** `edition` → `valid_pedag` : Resp. Département (In-app + Email : "Version soumise pour validation Département").

---

### UF-GES-07 — Publication et exports


### UF-RDEP-02 — Validation départementale

**Déclencheur :** Version en état `valid_pedag`, le `rdep` doit valider ou rejeter pour son périmètre.  
**Acteur :** `rdep`.  
**Écrans :** `EC-RDEP-03` (Validation de son périmètre).  
**États de workflow :** `valid_pedag` → `valid_dir` (validation) ou `edition` (rejet).

**Étapes :**
1. `EC-RDEP-03` : Le `rdep` consulte la version soumise pour son département.
2. `EC-RDEP-03` : Le `rdep` clique sur "Valider" ou "Rejeter".
3. Si rejet : le `rdep` saisit un motif de rejet (texte libre obligatoire).
4. Si validation : Système passe la version à `valid_dir`, notifie la Direction.
5. Si rejet : Système retourne la version à `edition`, notifie le `gest` avec le motif.

**Conditions de garde :** État `valid_pedag`, validation départementale effectuée pour son périmètre.
**Cas alternatifs :** Rejet → retour à `edition` avec motif obligatoire.
**Notifications :** `valid_pedag` → `valid_dir` : Direction (In-app + Email : "Version en validation Direction").

---

### UF-DIR-01 — Validation finale Direction

**Déclencheur :** Version en état `valid_dir`, la Direction doit valider ou rejeter.  
**Acteur :** `dir`.  
**Écrans :** `EC-DIR-01` (Consultation du scénario final), `EC-DIR-02` (Validation ou rejet), `EC-DIR-03` (Rejet avec motif).  
**États de workflow :** `valid_dir` → `valide` (validation) ou `rep_pedag` / `edition` (rejet).

**Étapes :**
1. `EC-DIR-01` : Le `dir` consulte le scénario, ses scores et le détail des séances.
2. `EC-DIR-02` : Le `dir` clique sur "Valider définitivement" ou "Rejeter".
3. Si validation : Système passe la version à `valide`, notifie le `gest` et le `rdep`.
4. Si rejet : `EC-DIR-03` : Le `dir` sélectionne le type de rejet (pédagogique → `rep_pedag`, planning → `edition`) et saisit le motif (obligatoire).
5. Si rejet pédagogique : Système retourne la version à `rep_pedag`, notifie le `rdep`.
6. Si rejet planning : Système retourne la version à `edition`, notifie le `gest`.

**Conditions de garde :** État `valid_dir`, tous les départements concernés validés, charge horaire OK.
**Cas alternatifs :** Rejet Direction ne peut pas aboutir directement à `brouillon`.
**Notifications :** `valid_dir` → `valide` : Gestionnaire + Resp. Département (In-app + Email : "Version validée"). `valid_dir` → `rep_pedag` : Resp. Département (Rejet Direction, motif pédagogique). `valid_dir` → `edition` : Gestionnaire (Rejet Direction, motif planning).

---

### UF-ADM-01 — Archivage et audit

**Déclencheur :** Version en état `publie` ou `valide`, archivage décidé.  
**Acteur :** `admin` (ou `gest` pour archivage depuis `valide`).  
**Écrans :** `EC-ADM-04` (Journal d'audit), `EC-GES-10` (Archivage d'une version).  
**États de workflow :** `publie` → `archive` ou `valide` → `archive`.

**Étapes :**
1. `EC-GES-10` : L'admin ou le `gest` sélectionne la version à archiver.
2. `EC-GES-10` : Clic sur "Archiver".
3. Système : Passe la version à `archive`, conserve l'originale consultable pour l'audit.
4. `EC-ADM-04` : L'admin consulte le journal d'audit (actions, horodatages, métadonnées).
5. Système : Notifie l'admin ("Version archivée").

**Conditions de garde :** État `publie` (seule transition vers `archive` autorisée) ou `valide` (archivage sans publier).
**Cas alternatifs :** Une version archivée ne peut pas être republiée directement.
**Notifications :** `publie` → `archive` : Admin (In-app : "Version archivée").

---

### UF-GES-08 — Nouvelle version depuis archive

**Déclencheur :** Le `gest` souhaite créer une nouvelle version basée sur une version archivée.  
**Acteur :** `gest`.  
**Écrans :** `EC-GES-10` (Archivage d'une version).  
**États de workflow :** `archive` → `initial`.

**Étapes :**
1. `EC-GES-10` : Le `gest` sélectionne une version archivée comme base.
2. `EC-GES-10` : Clic sur "Nouvelle version depuis archive".
3. Système : Crée un nouveau squelette en état `initial` basé sur l'archivée, l'originale reste archivée.
4. Système : Le workflow recommence depuis `initial` (saisie répartition pédagogique, etc.).

**Conditions de garde :** État `archive`, nouvelle version basée sur l'archivée.
**Cas alternatifs :** L'originale reste consultable pour l'audit, jamais supprimée sans politique d'archivage explicite.
**Notifications :** Aucune (transition interne).
**Déclencheur :** Version en état `valide`, le `gest` décide de publier.  
**Acteur :** `gest`.  
**Écrans :** `EC-GES-09` (Publication de la version), `EC-GES-11` (Exports).  
**États de workflow :** `valide` → `publie`.

**Étapes :**
1. `EC-GES-09` : Le `gest` clique sur "Publier".
2. Système : Confirme l'immutabilité de la version à partir de cet instant.
3. Système : Passe la version à `publie`.
4. `EC-GES-11` : Le `gest` génère et télécharge les exports (XLSX, PDF, .ics).
5. Système : Notifie tous les utilisateurs concernés ("Version publiée, exports disponibles").

**Conditions de garde :** État `valide`, version validée par la Direction.
**Cas alternatifs :** Archiver sans publier → `archive` (via `EC-GES-10` ou `EC-DIR-04`).
**Notifications :** `valide` → `publie` : Tous les utilisateurs concernés (In-app + Email + .ics : "Version publiée, exports disponibles").

## §3. Parcours transversaux

| Code | Parcours | Rôles | Description |
|------|----------|-------|-------------|
| `UF-COM-01` | Connexion / Déconnexion | Tous | Authentification JWT (argon2id, accès court 15 min + refresh rotatif 7 j), gestion de session |
| `UF-COM-02` | Tableau de bord centralisé | Tous | Vue d'état global des versions en cours, notifications, actions rapides, rafraîchissement automatique à intervalle configurable |

---

## §4. Matrice Parcours ↔ Écrans ↔ États de workflow

| Parcours | Écrans | État départ | État arrivée | Rôle |
|----------|--------|-------------|--------------|------|
| `UF-GES-01` | `EC-COM-02`, `EC-GES-01` | — | `initial` | `gest` / `admin` |
| `UF-RDEP-01` | `EC-RDEP-01`, `EC-RDEP-02` | `initial` | `brouillon` | `rdep` |
| `UF-GES-02` | `EC-GES-02`, `EC-GES-03` | `brouillon` | `brouillon` | `gest` |
| `UF-GES-03` | `EC-GES-04` | `brouillon` | `generation` | `gest` |
| `UF-GES-04` | `EC-GES-05`, `EC-GES-06` | `generation` | `edition` | `gest` |
| `UF-GES-05` | `EC-GES-06`, `EC-GES-07`, `EC-GES-12` | `edition` | `edition` | `gest` |
| `UF-GES-06` | `EC-GES-08` | `edition` | `valid_pedag` | `gest` |
| `UF-RDEP-02` | `EC-RDEP-03` | `valid_pedag` | `valid_dir` / `edition` | `rdep` |
| `UF-DIR-01` | `EC-DIR-01`, `EC-DIR-02`, `EC-DIR-03` | `valid_dir` | `valide` / `rep_pedag` / `edition` | `dir` |
| `UF-GES-07` | `EC-GES-09`, `EC-GES-11` | `valide` | `publie` | `gest` |
| `UF-ADM-01` | `EC-ADM-04`, `EC-GES-10` | `publie` / `valide` | `archive` | `admin` / `gest` |
| `UF-GES-08` | `EC-GES-10` | `archive` | `initial` | `gest` |

---

## §5. Règles de navigation et guards UI

| Règle | Description |
|-------|-------------|
| `RB-UF-01` | Un `rdep` ne peut accéder aux écrans de gestion des autres départements qu'en lecture seule (`EC-RDEP-05`). |
| `RB-UF-02` | Le bail d'édition exclusif (30 min, renouvelable) bloque l'accès en écriture à `EC-GES-06` pour un second utilisateur. |
| `RB-UF-03` | La soumission vers `valid_pedag` est désactivée si la couverture < 100 % ou si un conflit dur persiste. |
| `RB-UF-04` | Un verrou incompatible avec les contraintes bloque le bouton "Lancer génération" sur `EC-GES-04`. |
| `RB-UF-05` | Les résultats partiels (séances `NON_PLACÉE`) affichent un avertissement sur `EC-GES-05` avant sélection. |
| `RB-UF-06` | Le rejet Direction depuis `valid_dir` présente un sélecteur de motif (pédagogique → `rep_pedag`, planning → `edition`). |
| `RB-UF-07` | Un `rdep` ne voit et ne modifie que les données de son département (RBAC par département). |
| `RB-UF-08` | Un contrôle optimiste protège en seconde ligne contre les modifications concurrentes (vérification de version avant écriture). |

---

## §6. Decision Log UX

| # | Décision | Conséquence |
|---|----------|-------------|
| DL-UX-01 | Pas d'écran enseignant | Diffusion par e-mail uniquement (.ics, PDF), pas d'interface enseignant |
| DL-UX-02 | Grille EDT drag&drop avec dnd-kit | Dépendance frontend `@dnd-kit` pour la grille interactive |
| DL-UX-03 | Bail d'édition 30 min | Verrou exclusif par version, `admin` peut forcer la libération |
| DL-UX-04 | WCAG AA | Contraste conforme, états jamais rendus par la seule couleur (libellé + icône) |

---

## §7. Glossaire des termes de parcours

| Terme | Définition |
|-------|------------|
| Parcours critique | Séquence d'actions utilisateur menant d'un état de workflow à un autre, avec écrans, déclencheur et conditions de garde |
| Déclencheur | Événement utilisateur ou système qui initie un parcours |
| Condition de garde | Prérequis qui doivent être remplis pour qu'une transition soit autorisée |
| Cas alternatif | Déviation du parcours nominal (rejet, annulation, retour arrière, erreur) |
| Bail d'édition | Verrou exclusif sur une version pendant l'édition manuelle (30 min, renouvelable) |
| Couverture | Rapport entre le volume placé et le volume attendu pour une affectation (doit être 100 % pour soumission) |

---

*Fin du UI_USER_FLOWS.md — TAKT v0.1 (E0.3b — validé)*