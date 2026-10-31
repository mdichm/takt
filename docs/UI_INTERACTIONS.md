# Spécifications d'interaction — TAKT (UI_INTERACTIONS.md)

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques  
**Version :** 0.1 (E0.3d — validé)  
**Date :** 30 octobre 2026  
**Responsables :** UX Designer + MOA  
**Statut :** Phase 0 (E0.3d) — Validé  
**Critère de sortie :** Interactions de tous les écrans spécifiées  
**Documents liés :** UI_ARBORESCENCE.md (E0.3a), UI_USER_FLOWS.md (E0.3b), UI_WIREFRAMES.md (E0.3c), SF_TAKT.md (§12 EX-UI-02)

---

**Convention d'identification.**
- Chaque interaction porte un code stable `IX-<DOMAINE>-<NN>` (ex: `IX-GES-01`, `IX-RDEP-02`).
- Le code est cité dans les spécifications d'interaction (E0.3d) et référencé par les écrans `EC-*` et les parcours `UF-*`, jamais le numéro de section.

---

## §1. Catalogue des interactions

| Code | Interaction | Écran | Acteur | État avant | État après | Parcours UF |
|------|-------------|-------|--------|------------|------------|-------------|
| `IX-COM-01` | Connexion | `EC-COM-01` | Tous | — | Authentifié | `UF-COM-01` |
| `IX-COM-02` | Déconnexion | `EC-COM-02` / `EC-COM-03` | Tous | Authentifié | — | `UF-COM-01` |
| `IX-COM-03` | Mise à jour profil | `EC-COM-03` | Tous | Authentifié | Authentifié | `UF-COM-01` |
| `IX-ADM-01` | Créer utilisateur | `EC-ADM-01` | `admin` | Tous | Tous | — |
| `IX-ADM-02` | Modifier utilisateur | `EC-ADM-01` | `admin` | Tous | Tous | — |
| `IX-ADM-03` | Activer/désactiver utilisateur | `EC-ADM-01` | `admin` | Tous | Tous | — |
| `IX-ADM-04` | Ajouter élément référentiel | `EC-ADM-02` | `admin` | Tous | Tous | — |
| `IX-ADM-05` | Modifier élément référentiel | `EC-ADM-02` | `admin` | Tous | Tous | — |
| `IX-ADM-06` | Modifier paramètres système | `EC-ADM-03` | `admin` | Tous | Tous | — |
| `IX-ADM-07` | Filtrer journal d'audit | `EC-ADM-04` | `admin` | Tous | Tous | `UF-ADM-01` |
| `IX-ADM-08` | Exporter logs d'audit | `EC-ADM-04` | `admin` | Tous | Tous | `UF-ADM-01` |
| `IX-GES-01` | Initialiser année/semestre | `EC-GES-01` | `gest` | — | `initial` | `UF-GES-01` |
| `IX-GES-02` | Importer données année précédente | `EC-GES-01` | `gest` | `initial` | `initial` | `UF-GES-01` |
| `IX-GES-03` | Ajouter matière plan d'études | `EC-GES-02` | `gest` | `brouillon` | `brouillon` | `UF-GES-02` |
| `IX-GES-04` | Ajouter contrainte | `EC-GES-03` | `gest` | `brouillon` | `brouillon` | `UF-GES-02` |
| `IX-GES-05` | Lancer génération CP-SAT | `EC-GES-04` | `gest` | `brouillon` | `generation` | `UF-GES-03` |
| `IX-GES-06` | Sélectionner scénario | `EC-GES-05` | `gest` | `generation` | `edition` | `UF-GES-04` |
| `IX-GES-07` | Déplacer séance (drag&drop) | `EC-GES-06` | `gest` | `edition` | `edition` | `UF-GES-04`, `UF-GES-05` |
| `IX-GES-08` | Poser verrou de séance | `EC-GES-06` / `EC-GES-12` | `gest` | `edition` | `edition` | `UF-GES-05` |
| `IX-GES-09` | Lever verrou de séance | `EC-GES-06` / `EC-GES-12` | `gest` | `edition` | `edition` | `UF-GES-05` |
| `IX-GES-10` | Appliquer alternative conflit | `EC-GES-07` | `gest` | `edition` | `edition` | `UF-GES-05` |
| `IX-GES-11` | Soumettre validation Département | `EC-GES-08` | `gest` | `edition` | `valid_pedag` | `UF-GES-06` |
| `IX-GES-12` | Publier version | `EC-GES-09` | `gest` | `valide` | `publie` | `UF-GES-07` |
| `IX-GES-13` | Archiver version | `EC-GES-10` | `gest`, `admin` | `publie` / `valide` | `archive` | `UF-ADM-01` |
| `IX-GES-14` | Nouvelle version depuis archive | `EC-GES-10` | `gest` | `archive` | `initial` | `UF-GES-08` |
| `IX-GES-15` | Générer export | `EC-GES-11` | `gest` | `publie` | `publie` | `UF-GES-07` |
| `IX-GES-16` | Renouveler bail d'édition | `EC-GES-06` | `gest` | `edition` | `edition` | `UF-GES-05` |
| `IX-RDEP-01` | Saisir affectation pédagogique | `EC-RDEP-01` | `rdep` | `initial` | `rep_pedag` | `UF-RDEP-01` |
| `IX-RDEP-02` | Valider répartition périmètre | `EC-RDEP-01` | `rdep` | `rep_pedag` | `brouillon` | `UF-RDEP-01` |
| `IX-RDEP-03` | Rejeter version (motif) | `EC-RDEP-03` | `rdep` | `valid_pedag` | `edition` | `UF-RDEP-02` |
| `IX-RDEP-04` | Revalidation ciblée | `EC-RDEP-04` | `rdep` | `valid_dir` | `valid_dir` | `UF-DIR-01` |
| `IX-RDEP-05` | Filtrer consultation transversale | `EC-RDEP-05` | `rdep` | Tous | Tous | — |
| `IX-DIR-01` | Valider définitivement | `EC-DIR-01` / `EC-DIR-02` | `dir` | `valid_dir` | `valide` | `UF-DIR-01` |
| `IX-DIR-02` | Rejeter avec motif pédagogique | `EC-DIR-03` | `dir` | `valid_dir` | `rep_pedag` | `UF-DIR-01` |
| `IX-DIR-03` | Rejeter avec motif planning | `EC-DIR-03` | `dir` | `valid_dir` | `edition` | `UF-DIR-01` |
| `IX-DIR-04` | Archiver sans publication | `EC-DIR-04` | `dir` | `valide` | `archive` | `UF-ADM-01` |
| `IX-DIR-05` | Générer export officiel | `EC-DIR-05` | `dir` | `publie` | `publie` | — |

**Total :** 37 interactions spécifiées.

---

## §2. Détails par interaction

### IX-COM-01 — Connexion

**Déclencheur :** L'utilisateur soumet le formulaire de connexion sur `EC-COM-01`.  
**Acteur :** Tous  
**Écran source :** `EC-COM-01`  
**Écran cible :** `EC-COM-02`  
**Action utilisateur :** Saisir email et mot de passe, cliquer sur "Se connecter"  
**Réaction système :** Vérification des identifiants (argon2id), émission du token JWT (accès 15 min + refresh 7 j), redirection vers le tableau de bord  
**État de workflow :** — → Authentifié  
**Conditions de garde :** Identifiants valides, compte actif  
**Notifications :** Aucune  
**Cas d'erreur :** Identifiants invalides → message d'erreur "Identifiant ou mot de passe incorrect", compte désactivé → message spécifique

---

### IX-COM-02 — Déconnexion

**Déclencheur :** L'utilisateur clique sur "Déconnexion" dans le header ou le profil.  
**Acteur :** Tous  
**Écran source :** `EC-COM-02` ou `EC-COM-03`  
**Écran cible :** `EC-COM-01`  
**Action utilisateur :** Clic sur le bouton/lien "Déconnexion"  
**Réaction système :** Invalidité des tokens JWT, suppression de la session, redirection vers l'écran de connexion  
**État de workflow :** Authentifié → —  
**Conditions de garde :** Utilisateur authentifié  
**Notifications :** Aucune  
**Cas d'erreur :** Aucun

---

### IX-COM-03 — Mise à jour profil

**Déclencheur :** L'utilisateur modifie ses informations personnelles ou préférences de notification et clique sur "Enregistrer".  
**Acteur :** Tous  
**Écran source/cible :** `EC-COM-03`  
**Action utilisateur :** Modifier nom, prénom, email, département (si `rdep`), toggles e-mail / in-app, cliquer sur "Enregistrer"  
**Réaction système :** Mise à jour du profil utilisateur, affichage de confirmation "Profil mis à jour"  
**État de workflow :** Authentifié → Authentifié (inchangé)  
**Conditions de garde :** Utilisateur authentifié, email au format valide  
**Notifications :** Aucune  
**Cas d'erreur :** Email déjà utilisé → message d'erreur, champ obligatoire manquant → highlight du champ

---

### IX-ADM-01 — Créer utilisateur

**Déclencheur :** L'admin clique sur "Ajouter un utilisateur" sur `EC-ADM-01`.  
**Acteur :** `admin`  
**Écran source/cible :** `EC-ADM-01` (modal de création)  
**Action utilisateur :** Remplir le modal (nom, email, rôle, département si `rdep`), cliquer sur "Enregistrer"  
**Réaction système :** Création du compte utilisateur, ajout d'une ligne dans le tableau, entrée dans le journal d'audit  
**État de workflow :** Tous → Tous (inchangé)  
**Conditions de garde :** Rôle `admin`, email unique, rôle parmi (`admin`, `gest`, `rdep`, `dir`)  
**Notifications :** Aucune  
**Cas d'erreur :** Email dupliqué → message d'erreur, rôle invalide → rejet

---

### IX-ADM-02 — Modifier utilisateur

**Déclencheur :** L'admin clique sur l'icône "modifier" d'une ligne du tableau sur `EC-ADM-01`.  
**Acteur :** `admin`  
**Écran source/cible :** `EC-ADM-01` (modal d'édition)  
**Action utilisateur :** Modifier les champs dans le modal pré-rempli, cliquer sur "Enregistrer"  
**Réaction système :** Mise à jour des attributs utilisateur, mise à jour de la ligne dans le tableau, entrée dans le journal d'audit  
**État de workflow :** Tous → Tous (inchangé)  
**Conditions de garde :** Rôle `admin`, utilisateur existant  
**Notifications :** Aucune  
**Cas d'erreur :** Utilisateur introuvable → message d'erreur, email dupliqué → rejet

---

### IX-ADM-03 — Activer/désactiver utilisateur

**Déclencheur :** L'admin clique sur l'icône d'activation/désactivation d'une ligne du tableau sur `EC-ADM-01`.  
**Acteur :** `admin`  
**Écran source/cible :** `EC-ADM-01`  
**Action utilisateur :** Clic sur l'icône de statut (actif/inactif), confirmation  
**Réaction système :** Changement du statut du compte, mise à jour du badge dans le tableau, entrée dans le journal d'audit  
**État de workflow :** Tous → Tous (inchangé)  
**Conditions de garde :** Rôle `admin`, utilisateur existant  
**Notifications :** Aucune  
**Cas d'erreur :** Aucun

---

### IX-ADM-04 — Ajouter élément référentiel

**Déclencheur :** L'admin clique sur "Ajouter" dans un onglet de `EC-ADM-02`.  
**Acteur :** `admin`  
**Écran source/cible :** `EC-ADM-02`  
**Action utilisateur :** Sélectionner l'onglet (Établissement, Départements, Types d'enseignement, Grades, Coefficients), remplir le formulaire, cliquer sur "Ajouter"  
**Réaction système :** Création de l'élément de référentiel, ajout de la ligne dans le tableau de l'onglet  
**État de workflow :** Tous → Tous (inchangé)  
**Conditions de garde :** Rôle `admin`  
**Notifications :** Aucune  
**Cas d'erreur :** Doublon de code/nom → message d'erreur

---

### IX-ADM-05 — Modifier élément référentiel

**Déclencheur :** L'admin clique sur l'icône "modifier" d'une ligne dans un onglet de `EC-ADM-02`.  
**Acteur :** `admin`  
**Écran source/cible :** `EC-ADM-02`  
**Action utilisateur :** Modifier les champs en ligne ou dans un modal, valider  
**Réaction système :** Mise à jour de l'élément de référentiel, actualisation de la ligne  
**État de workflow :** Tous → Tous (inchangé)  
**Conditions de garde :** Rôle `admin`, élément existant  
**Notifications :** Aucune  
**Cas d'erreur :** Doublon → message d'erreur

---

### IX-ADM-06 — Modifier paramètres système

**Déclencheur :** L'admin modifie une valeur dans `EC-ADM-03` et clique sur "Enregistrer les paramètres".  
**Acteur :** `admin`  
**Écran source/cible :** `EC-ADM-03`  
**Action utilisateur :** Modifier durée du bail d'édition, jours ouvrés, seuils de verrouillage et de risque, cliquer sur "Enregistrer"  
**Réaction système :** Mise à jour des paramètres système, affichage de confirmation "Paramètres enregistrés"  
**État de workflow :** Tous → Tous (inchangé)  
**Conditions de garde :** Rôle `admin`, valeurs dans les plages autorisées  
**Notifications :** Aucune  
**Cas d'erreur :** Valeur hors plage → message d'erreur sous le champ

---

### IX-ADM-07 — Filtrer journal d'audit

**Déclencheur :** L'admin modifie un filtre sur `EC-ADM-04`.  
**Acteur :** `admin`  
**Écran source/cible :** `EC-ADM-04`  
**Action utilisateur :** Sélectionner un filtre (action, utilisateur, entité, plage de dates) ou saisir une recherche textuelle  
**Réaction système :** Filtrage des entrées d'audit affichées, actualisation du tableau  
**État de workflow :** Tous → Tous (inchangé)  
**Conditions de garde :** Rôle `admin`  
**Notifications :** Aucune  
**Cas d'erreur :** Aucun

---

### IX-ADM-08 — Exporter logs d'audit

**Déclencheur :** L'admin clique sur "Exporter les logs" sur `EC-ADM-04`.  
**Acteur :** `admin`  
**Écran source/cible :** `EC-ADM-04`  
**Action utilisateur :** Clic sur le bouton "Exporter les logs", sélection du format (CSV/PDF)  
**Réaction système :** Génération du fichier d'export des entrées d'audit (conservation 3 ans), téléchargement  
**État de workflow :** Tous → Tous (inchangé)  
**Conditions de garde :** Rôle `admin`  
**Notifications :** Aucune  
**Cas d'erreur :** Échec de génération → message d'erreur

---

### IX-GES-01 — Initialiser année/semestre

**Déclencheur :** Le `gest` soumet le formulaire d'initialisation sur `EC-GES-01`.  
**Acteur :** `gest`  
**Écran source :** `EC-GES-01`  
**Écran cible :** `EC-COM-02`  
**Action utilisateur :** Remplir année, numéro de semestre, option d'import, cliquer sur "Initialiser"  
**Réaction système :** Création du squelette de version (état `initial`), verrouillage du référentiel, notification au `rdep` ("Répartition pédagogique à saisir")  
**État de workflow :** — → `initial`  
**Conditions de garde :** Année/semestre non encore initialisée  
**Notifications :** `initial` → `rep_pedag` : Resp. Département (In-app + Email : "Répartition pédagogique à saisir")  
**Cas d'erreur :** Année déjà initialisée → message d'erreur, import avec lignes invalides → rapport d'erreurs non bloquant

---

### IX-GES-02 — Importer données année précédente

**Déclencheur :** Le `gest` sélectionne un fichier et coche "Importer des données de l'année précédente" sur `EC-GES-01`.  
**Acteur :** `gest`  
**Écran source/cible :** `EC-GES-01`  
**Action utilisateur :** Cochez l'option d'import, sélectionner un fichier CSV/XLSX, valider  
**Réaction système :** Parsing du fichier, import des lignes valides, génération d'un rapport d'erreurs par ligne pour les lignes invalides  
**État de workflow :** `initial` → `initial` (inchangé)  
**Conditions de garde :** État `initial`, fichier au format supporté  
**Notifications :** Aucune  
**Cas d'erreur :** Format invalide → message d'erreur, lignes invalides → rapport d'erreurs (non bloquant)

---

### IX-GES-03 — Ajouter matière plan d'études

**Déclencheur :** Le `gest` clique sur "Ajouter une matière" sur `EC-GES-02`.  
**Acteur :** `gest`  
**Écran source/cible :** `EC-GES-02`  
**Action utilisateur :** Remplir le formulaire en ligne (parcours, matière, volume horaire, type d'enseignement, groupe), valider  
**Réaction système :** Création de l'entrée dans le plan d'études, ajout de la ligne dans le tableau, calcul de l'héritage automatique par groupe  
**État de workflow :** `brouillon` → `brouillon` (inchangé)  
**Conditions de garde :** État `brouillon`, répartition pédagogique validée  
**Notifications :** Aucune  
**Cas d'erreur :** Doublon parcours/matière/groupe → message d'erreur

---

### IX-GES-04 — Ajouter contrainte

**Déclencheur :** Le `gest` clique sur "Ajouter une contrainte" sur `EC-GES-03`.  
**Acteur :** `gest`  
**Écran source/cible :** `EC-GES-03`  
**Action utilisateur :** Remplir le formulaire (enseignant, matière, groupe, type de contrainte, valeur, période), cliquer sur "Ajouter"  
**Réaction système :** Enregistrement de la contrainte, recalcul des indicateurs de couverture, affichage des conflits potentiels  
**État de workflow :** `brouillon` → `brouillon` (inchangé)  
**Conditions de garde :** État `brouillon`  
**Notifications :** Aucune  
**Cas d'erreur :** Contrainte incompatible existante → avertissement

---

### IX-GES-05 — Lancer génération CP-SAT

**Déclencheur :** Le `gest` clique sur "Lancer génération" sur `EC-GES-04`.  
**Acteur :** `gest`  
**Écran source :** `EC-GES-04`  
**Écran cible :** `EC-GES-04` (avec barre de progression)  
**Action utilisateur :** Clic sur le bouton "Lancer génération"  
**Réaction système :** Vérification des prérequis (départements validés, contraintes saisies, aucun verrou bloquant), soumission du job CP-SAT au worker, affichage de la barre de progression et des logs  
**État de workflow :** `brouillon` → `generation`  
**Conditions de garde :** État `brouillon`, tous les départements ont validé leur répartition, contraintes saisies, aucun verrou bloquant  
**Notifications :** `brouillon` → `generation` : Gestionnaire (In-app + Email : "Génération lancée / terminée")  
**Cas d'erreur :** Prérequis non remplis → bouton désactivé, échec de génération → conservation du job pour diagnostic

---

### IX-GES-06 — Sélectionner scénario

**Déclencheur :** Le `gest` clique sur "Sélectionner ce scénario" pour un scénario sur `EC-GES-05`.  
**Acteur :** `gest`  
**Écran source :** `EC-GES-05`  
**Écran cible :** `EC-GES-06`  
**Action utilisateur :** Clic sur le bouton "Sélectionner ce scénario" d'une ligne du tableau  
**Réaction système :** Création d'une version en édition avec les séances du scénario adopté, redirection vers la grille EDT  
**État de workflow :** `generation` → `edition`  
**Conditions de garde :** ≥ 1 scénario généré (ou partiel avec avertissements)  
**Notifications :** Aucune  
**Cas d'erreur :** Aucun scénario → message "Aucun scénario disponible"

---

### IX-GES-07 — Déplacer séance (drag&drop)

**Déclencheur :** Le `gest` glisse une séance sur la grille EDT.  
**Acteur :** `gest`  
**Écran source/cible :** `EC-GES-06`  
**Action utilisateur :** Glisser-déposer une carte de séance d'un créneau à un autre sur la grille  
**Réaction système :** Recalcul immédiat des conflits, vérification des verrous, mise à jour des indicateurs de couverture, enregistrement dans l'historique  
**État de workflow :** `edition` → `edition` (inchangé)  
**Conditions de garde :** Bail d'édition acquis (30 min, renouvelable), séance non verrouillée sur le créneau cible, pas de conflit dur créé  
**Notifications :** Aucune  
**Cas d'erreur :** Conflit dur créé → déplacement refusé, message d'erreur affiché ; verrou incompatible → déplacement refusé

---

### IX-GES-08 — Poser verrou de séance

**Déclencheur :** Le `gest` pose un verrou sur une séance depuis `EC-GES-06` ou `EC-GES-12`.  
**Acteur :** `gest`  
**Écran source/cible :** `EC-GES-06` ou `EC-GES-12`  
**Action utilisateur :** Sélectionner une séance, choisir le type de verrou (créneau/salle/enseignant/activité), choisir la portée (individuelle ou en masse), cliquer sur "Poser le verrou"  
**Réaction système :** Création du verrou, affichage du badge de verrou sur la séance, blocage du drag&drop sur les créneaux concernés, entrée dans l'historique  
**État de workflow :** `edition` → `edition` (inchangé)  
**Conditions de garde :** État `edition`, bail d'édition acquis  
**Notifications :** Aucune  
**Cas d'erreur :** Verrou incompatible avec les contraintes → message d'erreur, blocage de la génération

---

### IX-GES-09 — Lever verrou de séance

**Déclencheur :** Le `gest` clique sur "Lever le verrou" pour une séance verrouillée.  
**Acteur :** `gest`  
**Écran source/cible :** `EC-GES-06` ou `EC-GES-12`  
**Action utilisateur :** Clic sur le bouton "Lever le verrou" d'une ligne du tableau des verrous  
**Réaction système :** Suppression du verrou, retrait du badge de verrou, déblocage du drag&drop, entrée dans l'historique  
**État de workflow :** `edition` → `edition` (inchangé)  
**Conditions de garde :** État `edition`, verrou existant sur la séance  
**Notifications :** Aucune  
**Cas d'erreur :** Aucun

---

### IX-GES-10 — Appliquer alternative conflit

**Déclencheur :** Le `gest` clique sur "Appliquer cette alternative" pour une séance en conflit sur `EC-GES-07`.  
**Acteur :** `gest`  
**Écran source :** `EC-GES-07`  
**Écran cible :** `EC-GES-06`  
**Action utilisateur :** Sélectionner une séance en conflit, choisir une alternative dans la liste classée (jusqu'à 20), cliquer sur "Appliquer"  
**Réaction système :** Modification de la séance avec l'alternative choisie, recalcul des conflits, retour à la grille EDT  
**État de workflow :** `edition` → `edition` (inchangé)  
**Conditions de garde :** État `edition`, séance en conflit, alternative disponible  
**Notifications :** Aucune  
**Cas d'erreur :** Aucune alternative compatible → message "Aucune alternative disponible"

---

### IX-GES-11 — Soumettre validation Département

**Déclencheur :** Le `gest` clique sur "Soumettre pour validation Département" sur `EC-GES-08`.  
**Acteur :** `gest`  
**Écran source :** `EC-GES-08`  
**Écran cible :** `EC-RDEP-03` (via notification)  
**Action utilisateur :** Clic sur le bouton "Soumettre pour validation Département"  
**Réaction système :** Vérification des conditions (verrous résolus, aucun conflit dur, couverture exactement 100 %), passage de la version à `valid_pedag`, notification au `rdep`  
**État de workflow :** `edition` → `valid_pedag`  
**Conditions de garde :** État `edition`, verrous résolus, aucun conflit dur non résolu, couverture exactement 100 %  
**Notifications :** `edition` → `valid_pedag` : Resp. Département (In-app + Email : "Version soumise pour validation Département")  
**Cas d'erreur :** Couverture < 100 % ou conflit dur persistant → bouton désactivé, message d'information

---

### IX-GES-12 — Publier version

**Déclencheur :** Le `gest` clique sur "Publier" sur `EC-GES-09`.  
**Acteur :** `gest`  
**Écran source :** `EC-GES-09`  
**Écran cible :** `EC-GES-11` (après publication)  
**Action utilisateur :** Clic sur le bouton "Publier"  
**Réaction système :** Confirmation de l'immutabilité, passage de la version à `publie`, notification aux utilisateurs concernés, activation des exports  
**État de workflow :** `valide` → `publie`  
**Conditions de garde :** État `valide`, version validée par la Direction  
**Notifications :** `valide` → `publie` : Tous les utilisateurs concernés (In-app + Email + .ics : "Version publiée, exports disponibles")  

---

### IX-GES-13 — Archiver version

**Déclencheur :** Le `gest` ou l'`admin` clique sur "Archiver" sur `EC-GES-10`.  
**Acteur :** `gest`, `admin`  
**Écran source :** `EC-GES-10`  
**Écran cible :** `EC-COM-02`  
**Action utilisateur :** Sélectionner une version en `publie` ou `valide`, cliquer sur "Archiver", confirmer  
**Réaction système :** Passage de la version à `archive`, conservation de l'originale pour l'audit, notification à l'admin  
**État de workflow :** `publie` → `archive` ou `valide` → `archive`  
**Conditions de garde :** État `publie` (transition vers `archive` autorisée) ou `valide` (archivage sans publier)  
**Notifications :** `publie` → `archive` : Admin (In-app : "Version archivée")  
**Cas d'erreur :** Version déjà archivée → message d'information

---

### IX-GES-14 — Nouvelle version depuis archive

**Déclencheur :** Le `gest` clique sur "Nouvelle version depuis archive" sur `EC-GES-10`.  
**Acteur :** `gest`  
**Écran source :** `EC-GES-10`  
**Écran cible :** `EC-COM-02` (nouveau squelette en `initial`)  
**Action utilisateur :** Sélectionner une version archivée, cliquer sur "Nouvelle version depuis archive"  
**Réaction système :** Création d'un nouveau squelette en état `initial` basé sur l'archivée, l'originale reste archivée, le workflow recommence depuis `initial`  
**État de workflow :** `archive` → `initial`  
**Conditions de garde :** État `archive`  
**Notifications :** Aucune (transition interne)  
**Cas d'erreur :** Aucun

---

### IX-GES-15 — Générer export

**Déclencheur :** Le `gest` sélectionne un format et clique sur "Générer et télécharger" sur `EC-GES-11`.  
**Acteur :** `gest`  
**Écran source/cible :** `EC-GES-11`  
**Action utilisateur :** Sélectionner le format (XLSX, PDF, .ics), cliquer sur "Générer et télécharger"  
**Réaction système :** Génération du fichier d'export, téléchargement, ajout à l'historique des exports  
**État de workflow :** `publie` → `publie` (inchangé)  
**Conditions de garde :** État `publie`  
**Notifications :** Aucune  
**Cas d'erreur :** Échec de génération → message d'erreur

---

### IX-GES-16 — Renouveler bail d'édition

**Déclencheur :** Le `gest` clique sur "Renouveler le bail" sur `EC-GES-06` avant expiration.  
**Acteur :** `gest`  
**Écran source/cible :** `EC-GES-06`  
**Action utilisateur :** Clic sur le bouton "Renouveler le bail" dans l'indicateur de bail d'édition  
**Réaction système :** Extension du bail d'édition de 30 minutes, réinitialisation du compte à rebours  
**État de workflow :** `edition` → `edition` (inchangé)  
**Conditions de garde :** État `edition`, bail d'édition détenu par l'utilisateur actuel  
**Notifications :** Aucune  

---

### IX-RDEP-01 — Saisir affectation pédagogique

**Déclencheur :** Le `rdep` saisit une affectation sur `EC-RDEP-01`.  
**Acteur :** `rdep`  
**Écran source/cible :** `EC-RDEP-01`  
**Action utilisateur :** Remplir le formulaire (enseignant, matière, groupe, volume horaire, type d'enseignement), cliquer sur "Ajouter une affectation"  
**Réaction système :** Enregistrement de l'affectation, mise à jour du suivi des charges horaires, alerte si dépassement de fourchette, blocage si seuil bloquant  
**État de workflow :** `initial` → `rep_pedag` (quand validé)  
**Conditions de garde :** État `initial`, appartenance au département du `rdep`  
**Notifications :** Aucune  
**Cas d'erreur :** Volume hors fourchette → alerte, seuil bloquant → blocage, doublon → message d'erreur

---

### IX-RDEP-02 — Valider répartition périmètre

**Déclencheur :** Le `rdep` clique sur "Valider ma répartition" sur `EC-RDEP-01`.  
**Acteur :** `rdep`  
**Écran source :** `EC-RDEP-01`  
**Écran cible :** `EC-COM-02`  
**Action utilisateur :** Clic sur le bouton "Valider ma répartition pour mon périmètre"  
**Réaction système :** Passage de la version à `brouillon`, figement du snapshot immuable de la répartition, notification au `gest`  
**État de workflow :** `rep_pedag` → `brouillon`  
**Conditions de garde :** État `rep_pedag`, affectations saisies pour le périmètre du `rdep`  
**Notifications :** `rep_pedag` → `brouillon` : Gestionnaire (In-app + Email : "Répartition validée, passage en brouillon")  
**Cas d'erreur :** Affectations incomplètes → avertissement, erreurs de saisie → blocage

---

### IX-RDEP-03 — Rejeter version (motif)

**Déclencheur :** Le `rdep` clique sur "Rejeter" sur `EC-RDEP-03`.  
**Acteur :** `rdep`  
**Écran source :** `EC-RDEP-03`  
**Écran cible :** `EC-GES-06` (retour en édition)  
**Action utilisateur :** Clic sur "Rejeter", saisie du motif de rejet (texte libre obligatoire), confirmation  
**Réaction système :** Retour de la version à `edition`, notification au `gest` avec le motif  
**État de workflow :** `valid_pedag` → `edition`  
**Conditions de garde :** État `valid_pedag`, motif de rejet saisi  
**Notifications :** `valid_pedag` → `edition` : Gestionnaire (Rejet Département, motif)  
**Cas d'erreur :** Motif vide → blocage de la validation du rejet

---

### IX-RDEP-04 — Revalidation ciblée

**Déclencheur :** Le `rdep` clique sur "Revalider mon périmètre" sur `EC-RDEP-04`.  
**Acteur :** `rdep`  
**Écran source :** `EC-RDEP-04`  
**Écran cible :** `EC-COM-02`  
**Action utilisateur :** Consulter les séances impactées, cliquer sur "Revalider mon périmètre"  
**Réaction système :** Réaffectation ciblée des séances concernées, notification à la Direction  
**État de workflow :** `valid_dir` → `valid_dir` (inchangé, réaffectation interne)  
**Conditions de garde :** État `valid_dir`, rejet pédagogique de la Direction, séances impactées identifiées  
**Notifications :** Direction (In-app : "Revalidation ciblée du périmètre")  
**Cas d'erreur :** Aucune séance impactée → message "Aucune séance à revalider"

---

### IX-RDEP-05 — Filtrer consultation transversale

**Déclencheur :** Le `rdep` modifie un filtre sur `EC-RDEP-05`.  
**Acteur :** `rdep`  
**Écran source/cible :** `EC-RDEP-05`  
**Action utilisateur :** Sélectionner un filtre (département, état de workflow, matière) ou saisir une recherche textuelle  
**Réaction système :** Filtrage des données affichées, actualisation du tableau en lecture seule  
**État de workflow :** Tous → Tous (inchangé)  
**Conditions de garde :** Rôle `rdep`  
**Notifications :** Aucune  
**Cas d'erreur :** Aucun

---

### IX-DIR-01 — Valider définitivement

**Déclencheur :** Le `dir` clique sur "Valider définitivement" sur `EC-DIR-01` ou `EC-DIR-02`.  
**Acteur :** `dir`  
**Écran source :** `EC-DIR-01` ou `EC-DIR-02`  
**Écran cible :** `EC-COM-02`  
**Action utilisateur :** Clic sur le bouton "Valider définitivement"  
**Réaction système :** Passage de la version à `valide`, notification au `gest` et au `rdep`  
**État de workflow :** `valid_dir` → `valide`  
**Conditions de garde :** État `valid_dir`, tous les départements concernés validés, charge horaire OK  
**Notifications :** `valid_dir` → `valide` : Gestionnaire + Resp. Département (In-app + Email : "Version validée")  
**Cas d'erreur :** Prérequis non remplis → bouton désactivé

---

### IX-DIR-02 — Rejeter avec motif pédagogique

**Déclencheur :** Le `dir` sélectionne "Rejet pédagogique" et saisit un motif sur `EC-DIR-03`.  
**Acteur :** `dir`  
**Écran source :** `EC-DIR-03`  
**Écran cible :** `EC-RDEP-04` (revalidation ciblée)  
**Action utilisateur :** Sélectionner "Rejet pédagogique" dans le sélecteur, saisir le motif (obligatoire), cliquer sur "Confirmer le rejet"  
**Réaction système :** Passage de la version à `rep_pedag`, notification au `rdep` avec le motif  
**État de workflow :** `valid_dir` → `rep_pedag`  
**Conditions de garde :** État `valid_dir`, motif saisi, type de rejet = pédagogique  
**Notifications :** `valid_dir` → `rep_pedag` : Resp. Département (Rejet Direction, motif pédagogique)  
**Cas d'erreur :** Motif vide → blocage de la confirmation

---

### IX-DIR-03 — Rejeter avec motif planning

**Déclencheur :** Le `dir` sélectionne "Rejet planning" et saisit un motif sur `EC-DIR-03`.  
**Acteur :** `dir`  
**Écran source :** `EC-DIR-03`  
**Écran cible :** `EC-GES-06` (retour en édition)  
**Action utilisateur :** Sélectionner "Rejet planning" dans le sélecteur, saisir le motif (obligatoire), cliquer sur "Confirmer le rejet"  
**Réaction système :** Passage de la version à `edition`, notification au `gest` avec le motif  
**État de workflow :** `valid_dir` → `edition`  
**Conditions de garde :** État `valid_dir`, motif saisi, type de rejet = planning  
**Notifications :** `valid_dir` → `edition` : Gestionnaire (Rejet Direction, motif planning)  
**Cas d'erreur :** Motif vide → blocage de la confirmation

---

### IX-DIR-04 — Archiver sans publication

**Déclencheur :** Le `dir` clique sur "Archiver" sur `EC-DIR-04`.  
**Acteur :** `dir`  
**Écran source :** `EC-DIR-04`  
**Écran cible :** `EC-COM-02`  
**Action utilisateur :** Cliquer sur "Archiver", confirmer  
**Réaction système :** Passage de la version à `archive`, conservation pour l'audit, notification à l'admin  
**État de workflow :** `valide` → `archive`  
**Conditions de garde :** État `valide`  
**Notifications :** `valide` → `archive` : Admin (In-app : "Version archivée")  
**Cas d'erreur :** Aucun

---

### IX-DIR-05 — Générer export officiel

**Déclencheur :** Le `dir` sélectionne une version publiée et un format, puis clique sur "Générer l'export officiel" sur `EC-DIR-05`.  
**Acteur :** `dir`  
**Écran source/cible :** `EC-DIR-05`  
**Action utilisateur :** Sélectionner une version en `publie`, sélectionner le format (XLSX, PDF), cliquer sur "Générer l'export officiel"  
**Réaction système :** Génération du fichier d'export officiel, téléchargement, ajout à l'historique des exports officiels  
**État de workflow :** `publie` → `publie` (inchangé)  
**Conditions de garde :** État `publie`, rôle `dir`  
**Notifications :** Aucune  
**Cas d'erreur :** Échec de génération → message d'erreur

---

## §3. Gestion des erreurs et cas limites

| Cas limite | Comportement UI | Écran concerné | Règle applicable |
|------------|-----------------|----------------|------------------|
| Conflit dur sur drag&drop | Déplacement refusé, message d'erreur | `EC-GES-06` | `RB-UI-05` |
| Couverture < 100 % | Bouton "Soumettre" désactivé | `EC-GES-08` | `RB-UI-06` |
| Verrou incompatible | Bouton "Lancer génération" désactivé | `EC-GES-04` | `RB-UI-07` |
| Bail d'édition expiré | Passage en lecture seule, invitation à renouveler | `EC-GES-06`, `EC-GES-07`, `EC-GES-12` | `RB-UI-03` |
| Rejet Direction pédagogique | Retour à `rep_pedag`, notification `rdep` | `EC-DIR-03` | `RB-UI-06` |
| Rejet Direction planning | Retour à `edition`, notification `gest` | `EC-DIR-03` | `RB-UI-06` |
| Import avec lignes invalides | Rapport d'erreurs par ligne, lignes valides importées | `EC-GES-01` | — |
| Échec génération CP-SAT | Conservation du job, pas d'altération de version | `EC-GES-04` | — |
| Motif de rejet vide | Blocage de la confirmation du rejet | `EC-DIR-03`, `EC-RDEP-03` | — |

---

## §4. Decision Log Interactions

| # | Décision | Conséquence |
|---|----------|-------------|
| DL-IX-01 | Drag&drop avec `@dnd-kit` | Dépendance frontend, gestion des états de drop (valid/invalid) |
| DL-IX-02 | Contrôle optimiste en seconde ligne | Vérification de version avant écriture, message de conflit si modification concurrente |
| DL-IX-03 | Bail d'édition 30 min | Compte à rebours affiché, bouton renouveler, forçage par `admin` |
| DL-IX-04 | Pas d'écran enseignant | Pas d'interaction enseignant ; diffusion .ics/PDF par email |

---

*Fin du UI_INTERACTIONS.md — TAKT v0.1 (E0.3d — validé)*