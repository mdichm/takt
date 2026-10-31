# Wireframes des écrans — TAKT (UI_WIREFRAMES.md)

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques  
**Version :** 0.1 (E0.3c — validé)  
**Date :** 30 octobre 2026  
**Responsables :** UX Designer + MOA  
**Statut :** Phase 0 (E0.3c) — Validé  
**Critère de sortie :** Wireframes de tous les écrans spécifiés  
**Documents liés :** UI_ARBORESCENCE.md (E0.3a), UI_USER_FLOWS.md (E0.3b), SF_TAKT.md (§12 EX-UI-01), WORKFLOW_METIER.md (§6)

---

**Convention d'identification.**
- Chaque écran porte un code stable `EC-<DOMAINE>-<NN>` (défini dans UI_ARBORESCENCE.md, jamais le numéro de section).
- Chaque parcours porte un code stable `UF-<DOMAINE>-<NN>` (défini dans UI_USER_FLOWS.md).
- Les états de composant sont : `état vide`, `état chargé`, `état erreur`, `état loading`, `état succès`.

---

## §1. Vue d'ensemble des écrans

| Code | Nom | Rôle principal | État workflow | Parcours UF associés |
|------|-----|----------------|---------------|----------------------|
| `EC-COM-01` | Connexion / Login | Tous | — | `UF-COM-01` |
| `EC-COM-02` | Tableau de bord centralisé | Tous | Tous | `UF-COM-02`, `UF-GES-01` |
| `EC-COM-03` | Profil utilisateur | Tous | — | `UF-COM-01` |
| `EC-ADM-01` | Gestion des utilisateurs | `admin` | Tous | — |
| `EC-ADM-02` | Référentiels durables | `admin` | Tous | — |
| `EC-ADM-03` | Paramètres système | `admin` | Tous | — |
| `EC-ADM-04` | Journal d'audit | `admin` | Tous | `UF-ADM-01` |
| `EC-GES-01` | Initialisation année/semestre | `gest` | `initial` | `UF-GES-01` |
| `EC-GES-02` | Préparation des plans d'études | `gest` | `brouillon` | `UF-GES-02` |
| `EC-GES-03` | Tableau de préparation (contraintes) | `gest` | `brouillon` | `UF-GES-02` |
| `EC-GES-04` | Lancement et suivi des générations | `gest` | `brouillon` → `generation` | `UF-GES-03` |
| `EC-GES-05` | Comparaison de scénarios | `gest` | `generation` | `UF-GES-04` |
| `EC-GES-06` | Grille EDT drag&drop | `gest` | `edition` | `UF-GES-04`, `UF-GES-05` |
| `EC-GES-07` | Simulation et résolution de conflits | `gest` | `edition` | `UF-GES-05` |
| `EC-GES-08` | Soumission pour validation Département | `gest` | `edition` → `valid_pedag` | `UF-GES-06` |
| `EC-GES-09` | Publication de la version | `gest` | `valide` → `publie` | `UF-GES-07` |
| `EC-GES-10` | Archivage d'une version | `gest`, `admin` | `publie`/`valide` → `archive` | `UF-ADM-01`, `UF-GES-08` |
| `EC-GES-11` | Exports | `gest` | `publie` | `UF-GES-07` |
| `EC-GES-12` | Gestion des verrous de séance | `gest` | `edition` | `UF-GES-05` |
| `EC-RDEP-01` | Répartition pédagogique | `rdep` | `initial` → `rep_pedag` | `UF-RDEP-01` |
| `EC-RDEP-02` | Suivi des charges horaires | `rdep` | `rep_pedag` → `brouillon` | `UF-RDEP-01` |
| `EC-RDEP-03` | Validation de son périmètre | `rdep` | `valid_pedag` → `valid_dir` | `UF-RDEP-02` |
| `EC-RDEP-04` | Revalidation ciblée | `rdep` | `valid_dir` | `UF-DIR-01` (rejet pédagogique) |
| `EC-RDEP-05` | Consultation transversale | `rdep` | Tous | Consultation lecture seule |
| `EC-DIR-01` | Consultation du scénario final | `dir` | `valid_dir` | `UF-DIR-01` |
| `EC-DIR-02` | Validation ou rejet | `dir` | `valid_dir` | `UF-DIR-01` |
| `EC-DIR-03` | Rejet avec motif | `dir` | `valid_dir` → rejet | `UF-DIR-01` |
| `EC-DIR-04` | Archivage sans publication | `dir` | `valide` → `archive` | `UF-ADM-01` |
| `EC-DIR-05` | Export officiel des versions publiées | `dir` | `publie` | — |

**Total :** 29 écrans définis (3 transversaux + 4 admin + 12 gest + 5 rdep + 5 dir).

## §2. Détails par écran

### EC-COM-01 — Connexion / Login

**Rôles :** Tous  
**État de workflow :** — (pré-authentification)  
**Parcours UF :** `UF-COM-01`  
**État de composant :** `état vide` / `état erreur` / `état succès`

**Structure :**
- Header minimal (logo TAKT, lien "Mot de passe oublié ?")
- Formulaire centré : identifiant (email), mot de passe, case "Se souvenir de moi", bouton "Se connecter"
- Pied de page : version de l'application, mention RGPD

**Composants principaux :**
- Champ texte email (validation format, obligatoire)
- Champ mot de passe (masqué, obligatoire, toggle visibilité)
- Bouton principal "Se connecter" (état disabled tant que les champs ne sont pas valides)
- Lien texte "Mot de passe oublié ?"
- Lien texte "Première connexion ?" (redirige vers procédure admin)

**États de composant :**
- `état vide` : formulaire vide, prêt à saisir
- `état erreur` : message d'erreur sous les champs invalides ("Identifiant ou mot de passe incorrect")
- `état succès` : redirection automatique vers `EC-COM-02`

**Actions disponibles :**
- Se connecter → `EC-COM-02`
- Mot de passe oublié → flux de réinitialisation (hors périmètre v1.0)

**Règles d'interface :** RB-UI-02 (pas de compte enseignant), DL-UI-04 (WCAG AA)

---

### EC-COM-02 — Tableau de bord centralisé

**Rôles :** Tous (selon droits)  
**État de workflow :** Tous  
**Parcours UF :** `UF-COM-02`, `UF-GES-01`  
**État de composant :** `état chargé` (toujours avec données)

**Structure :**
- Header : nom utilisateur, rôle, avatar, déconnexion
- Sidebar gauche : navigation par rôle (écrans accessibles)
- Contenu principal : cartes d'état des versions en cours, liste des notifications, actions rapides
- Pied de page : horodatage dernière mise à jour, indicateur de rafraîchissement automatique

**Composants principaux :**
- Cartes "Version en cours" (état, progression, actions disponibles)
- Liste des notifications (in-app, non lues en gras, bouton "Tout marquer lu")
- Bouton d'action rapide selon le rôle et l'état de la version
- Indicateur de rafraîchissement automatique (intervalle configurable, défaut 60 s)

**États de composant :**
- `état chargé` : au moins une version affichée
- `état vide` : aucune version en cours (message "Aucune version active")

**Actions disponibles :**
- Selon le rôle et l'état : `EC-GES-01`, `EC-RDEP-01`, `EC-GES-04`, `EC-GES-06`, `EC-GES-08`, `EC-RDEP-03`, `EC-DIR-01`, `EC-GES-09`, `EC-GES-10`, `EC-ADM-04`

**Règles d'interface :** RB-UI-01 (RBAC par département), DL-UI-04 (WCAG AA)

---

### EC-COM-03 — Profil utilisateur

**Rôles :** Tous  
**État de workflow :** —  
**Parcours UF :** `UF-COM-01`  
**État de composant :** `état chargé`

**Structure :**
- Header : retour vers `EC-COM-02`
- Formulaire : nom, prénom, email, rôle, département (pour `rdep`)
- Section préférences de notification : toggle e-mail / in-app
- Bouton "Enregistrer les modifications"

**Composants principaux :**
- Champs texte (nom, prénom, email, en lecture seule pour le rôle)
- Sélecteur de département (uniquement pour `rdep`, liste des départements)
- Deux toggles : notifications e-mail, notifications in-app
- Bouton principal "Enregistrer"
- Bouton secondaire "Déconnexion"

**États de composant :**
- `état chargé` : données utilisateur pré-remplies
- `état succès` : confirmation "Profil mis à jour" après enregistrement

**Actions disponibles :**
- Enregistrer → mise à jour du profil, retour à `EC-COM-02`
- Déconnexion → `EC-COM-01`

**Règles d'interface :** RB-UI-01, DL-UI-04

---

### EC-ADM-01 — Gestion des utilisateurs

**Rôles :** `admin`  
**État de workflow :** Tous  
**Parcours UF :** —  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Gestion des utilisateurs", bouton "Ajouter un utilisateur"
- Tableau principal : liste des utilisateurs (nom, email, rôle, département, statut actif/inactif)
- Modal d'édition/création : formulaire CRUD utilisateur

**Composants principaux :**
- Tableau avec colonnes : Nom, Email, Rôle, Département, Statut, Actions
- Champ de recherche / filtre par rôle et par statut
- Bouton "Ajouter un utilisateur" (ouvre le modal de création)
- Icônes d'action par ligne : modifier, activer/désactiver
- Modal : champs nom, email, rôle (`admin`, `gest`, `rdep`, `dir`), département (si `rdep`), bouton "Enregistrer"

**États de composant :**
- `état chargé` : liste des utilisateurs affichée
- `état vide` : aucun utilisateur (message "Aucun utilisateur")
- `état erreur` : échec de création/modification

**Actions disponibles :**
- Créer utilisateur → modal, puis mise à jour du tableau
- Modifier utilisateur → modal pré-rempli
- Activer/désactiver → changement de statut immédiat
- Supprimer utilisateur → confirmation, puis retrait du tableau

**Règles d'interface :** RB-UI-01, DL-UI-04

---

### EC-ADM-02 — Référentiels durables

**Rôles :** `admin`  
**État de workflow :** Tous  
**Parcours UF :** —  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Référentiels durables", onglets par type de référence
- Onglets : Établissement, Départements, Types d'enseignement, Grades, Coefficients de charge
- Tableau d'édition par onglet, avec bouton "Ajouter" et formulaires d'édition en ligne

**Composants principaux :**
- Onglets de navigation par type de référentiel
- Tableau par onglet avec colonnes selon le type (nom, code, valeur, actif)
- Bouton "Ajouter" par onglet
- Champ de couleur par type d'enseignement (sélecteur de couleur)
- Boutons d'action par ligne : modifier, désactiver

**États de composant :**
- `état chargé` : référentiels affichés
- `état vide` : aucun élément dans un référentiel

**Actions disponibles :**
- Ajouter un élément de référentiel
- Modifier un élément existant
- Désactiver un élément (pas de suppression définitive)

**Règles d'interface :** RB-UI-01, DL-UI-04

---

### EC-ADM-03 — Paramètres système

**Rôles :** `admin`  
**État de workflow :** Tous  
**Parcours UF :** —  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Paramètres système"
- Formulaire organisé en sections : Temps, Jours ouvrés, Seuils

**Composants principaux :**
- Champ numérique : durée du bail d'édition (min, défaut 30)
- Sélecteur multiples : jours ouvrés (lun–sam, défaut tous cochés)
- Champ numérique : seuil de verrouillage (%)
- Champ numérique : seuil de risque de génération (%)
- Bouton principal "Enregistrer les paramètres"

**États de composant :**
- `état chargé` : valeurs actuelles pré-remplies
- `état succès` : confirmation "Paramètres enregistrés"

**Actions disponibles :**
- Modifier les valeurs et enregistrer

**Règles d'interface :** RB-UI-01, DL-UI-04

---

### EC-ADM-04 — Journal d'audit

**Rôles :** `admin`  
**État de workflow :** Tous  
**Parcours UF :** `UF-ADM-01`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Journal d'audit", bouton "Exporter les logs"
- Tableau principal : liste des actions d'audit (action, horodatage, utilisateur, entité, détails)
- Filtres : par action, par utilisateur, par entité, par plage de dates

**Composants principaux :**
- Tableau avec colonnes : Action, Horodatage, Utilisateur, Entité, Détails
- Champ de recherche textuelle
- Filtres déroulants : action, utilisateur, entité
- Sélecteur de plage de dates
- Bouton "Exporter les logs" (CSV/PDF)

**États de composant :**
- `état chargé` : entrées d'audit affichées (conservation 3 ans)
- `état vide` : aucune entrée (message "Aucune entrée d'audit")

**Actions disponibles :**
- Filtrer les entrées
- Exporter les logs

**Règles d'interface :** RB-UI-01, DL-UI-04

---

### EC-GES-01 — Initialisation année/semestre

**Rôles :** `gest`  
**État de workflow :** `initial`  
**Parcours UF :** `UF-GES-01`  
**État de composant :** `état vide` / `état chargé`

**Structure :**
- Header : titre "Initialisation année/semestre", retour vers `EC-COM-02`
- Formulaire d'initialisation : année, numéro de semestre
- Section import : assistant d'import depuis année/semestre précédent, rapport d'erreurs par ligne
- Zone de confirmation : verrouillage du référentiel pour le semestre en cours

**Composants principaux :**
- Champ texte : année (obligatoire, 4 chiffres)
- Sélecteur : numéro de semestre (1 ou 2)
- Case à cocher : "Importer des données de l'année précédente"
- Sélecteur de fichier : import CSV/XLSX (données de l'année précédente)
- Tableau de rapport d'erreurs par ligne (si import avec lignes invalides)
- Bouton principal "Initialiser"
- Bouton secondaire "Annuler" → retour à `EC-COM-02`

**États de composant :**
- `état vide` : formulaire vierge, prêt à saisir
- `état chargé` : formulaire pré-rempli ou après import avec rapport d'erreurs
- `état erreur` : message d'erreur sur l'import ou l'initialisation

**Actions disponibles :**
- Initialiser → création du squelette de version (état `initial`), notification au `rdep`
- Annuler → retour à `EC-COM-02`

**Règles d'interface :** RB-UI-01, DL-UI-04

---

### EC-GES-02 — Préparation des plans d'études

**Rôles :** `gest`  
**État de workflow :** `brouillon`  
**Parcours UF :** `UF-GES-02`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Préparation des plans d'études", retour vers `EC-COM-02`
- Tableau principal : parcours, matières, volumes horaires, types d'enseignement, groupes
- Section héritage : indication de l'héritage automatique des plans d'études par groupe

**Composants principaux :**
- Tableau avec colonnes : Parcours, Matière, Volume horaire, Type d'enseignement, Groupe, Actions
- Champ de recherche par matière ou parcours
- Bouton "Ajouter une matière"
- Icônes d'action par ligne : modifier, supprimer
- Indicateur d'héritage automatique (badge "Hérité" sur les groupes concernés)

**États de composant :**
- `état chargé` : plans d'études affichés
- `état vide` : aucun plan d'étude (message "Aucun plan d'étude")

**Actions disponibles :**
- Ajouter une matière → formulaire en ligne
- Modifier une matière → édition en ligne
- Supprimer une matière → confirmation

**Règles d'interface :** RB-UI-01, DL-UI-04

---

### EC-GES-03 — Tableau de préparation (contraintes)

**Rôles :** `gest`  
**État de workflow :** `brouillon`  
**Parcours UF :** `UF-GES-02`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Tableau de préparation — Contraintes", retour vers `EC-COM-02`
- Formulaire de saisie des contraintes : vœux, exigences de salle, indisponibilités enseignants
- Tableau d'indicateurs : couverture par affectation, conflits potentiels, alarmes de faisabilité

**Composants principaux :**
- Formulaire : enseignant, matière, groupe, type de contrainte, valeur, période
- Tableau des contraintes saisies avec colonnes : Enseignant, Matière, Groupe, Type, Valeur, Période, Actions
- Tableau des indicateurs : couverture %, conflits détectés, alarmes
- Bouton "Ajouter une contrainte"
- Icônes d'action par ligne : modifier, supprimer

**États de composant :**
- `état chargé` : contraintes et indicateurs affichés
- `état vide` : aucune contrainte saisie

**Actions disponibles :**
- Ajouter une contrainte → formulaire en ligne
- Modifier/Supprimer une contrainte existante

**Règles d'interface :** RB-UI-01, DL-UI-04

---

### EC-GES-04 — Lancement et suivi des générations

**Rôles :** `gest`  
**État de workflow :** `brouillon` → `generation`  
**Parcours UF :** `UF-GES-03`  
**État de composant :** `état chargé` / `état loading`

**Structure :**
- Header : titre "Lancement et suivi des générations", retour vers `EC-COM-02`
- Section lancement : bouton "Lancer génération", vérification des prérequis
- Section suivi : barre de progression, logs du job CP-SAT, scénarios trouvés avec scores

**Composants principaux :**
- Bouton principal "Lancer génération" (disabled si prérequis non remplis)
- Liste des prérequis avec statuts (✓ ou ✗) : départements validés, contraintes saisies, verrous
- Barre de progression du job CP-SAT (0-100 %)
- Logs en temps réel du solver
- Tableau des scénarios : score global (0-100), sous-scores, séances placées, séances non placées
- Bouton "Sélectionner ce scénario" par ligne de scénario

**États de composant :**
- `état chargé` : écran prêt, pas de génération en cours
- `état loading` : génération en cours (barre de progression active)
- `état erreur` : échec de génération (message d'erreur, conservation du job pour diagnostic)

**Actions disponibles :**
- Lancer génération → soumission du job CP-SAT, passage à `generation`
- Sélectionner un scénario → création d'une version en édition, passage à `edition`

**Règles d'interface :** RB-UI-04 (verrou incompatible bloque la génération), RB-UI-08 (résultats partiels avec avertissement), DL-UI-04

---

### EC-GES-05 — Comparaison de scénarios

**Rôles :** `gest`  
**État de workflow :** `generation`  
**Parcours UF :** `UF-GES-04`  
**État de composant :** `état chargé` / `état vide`

**Structure :**
- Header : titre "Comparaison de scénarios", retour vers `EC-GES-04`
- Tableau principal : liste des scénarios générés avec leurs scores
- Section détaillée : sous-scores et métriques du scénario sélectionné

**Composants principaux :**
- Tableau avec colonnes : ID scénario, Score global (0-100), Score qualité, Score équilibrage, Séances placées, Séances non placées, Actions
- Badge d'avertissement sur les scénarios partiels (séances `NON_PLACÉE`)
- Bouton "Sélectionner ce scénario" par ligne
- Panneau détail (côté droit ou en bas) : répartition des sous-scores, détail des conflits résolus

**États de composant :**
- `état chargé` : ≥ 1 scénario disponible
- `état vide` : aucun scénario généré (message "Aucun scénario disponible")

**Actions disponibles :**
- Sélectionner un scénario → création d'une version en édition, passage à `edition` via `EC-GES-06`

**Règles d'interface :** RB-UI-05 (résultats partiels avec avertissement), DL-UI-04

---

### EC-GES-06 — Grille EDT drag&drop

**Rôles :** `gest`  
**État de workflow :** `edition`  
**Parcours UF :** `UF-GES-04`, `UF-GES-05`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Grille EDT", retour vers `EC-GES-05`, indicateur de bail d'édition (compte à rebours 30 min)
- Grille principale : créneaux × jours, avec séances positionnées
- Sidebar gauche : liste des séances non placées, filtres par groupe/enseignant/salle
- Sidebar droite : détails de la séance sélectionnée, verrous appliqués

**Composants principaux :**
- Grille interactive drag&drop (dnd-kit) : colonnes jours, lignes créneaux horaires
- Cartes de séance : nom matière, enseignant, groupe, salle, type d'enseignement, badges de verrou
- Zone "Séances non placées" : liste des séances à placer, glisser vers la grille
- Indicateur de bail d'édition : compte à rebours, bouton "Renouver le bail", indication si le bail est détenu par un autre utilisateur
- Badges de verrou sur les séances : créneau verrouillé, salle verrouillée, enseignant verrouillé, activité verrouillée

**États de composant :**
- `état chargé` : grille avec séances placées et non placées
- `état loading` : recalcul des conflits après un déplacement

**Actions disponibles :**
- Glisser-déposer une séance sur la grille → recalcul immédiat des conflits
- Clic sur une séance → ouverture des détails dans la sidebar droite
- Poser/lever un verrou → sur une séance ou en masse (groupe/enseignant/salle)
- Renouver le bail d'édition → extension de 30 min

**Règles d'interface :** RB-UI-02 (bail d'édition exclusif), RB-UI-05 (verrous bloquent le drag&drop), DL-UI-01 (dnd-kit), DL-UI-04

---

### EC-GES-07 — Simulation et résolution de conflits

**Rôles :** `gest`  
**État de workflow :** `edition`  
**Parcours UF :** `UF-GES-05`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Simulation et résolution de conflits", retour vers `EC-GES-06`
- Panneau principal : séance en conflit, alternatives classées (jusqu'à 20)
- Liste des alternatives : créneau, salle, enseignant, score de compatibilité, impact sur les autres séances

**Composants principaux :**
- Sélecteur de séance en conflit (liste des séances avec conflits durs)
- Tableau des alternatives classées : Créneau, Salle, Enseignant, Score, Impact, Bouton "Appliquer"
- Indicateur de simulation : "Aucune écriture immédiate" (prévisualisation seulement)
- Bouton "Appliquer cette alternative" par ligne

**États de composant :**
- `état chargé` : alternatives affichées pour la séance sélectionnée
- `état vide` : aucun conflit à résoudre

**Actions disponibles :**
- Sélectionner une séance en conflit → affichage des alternatives
- Appliquer une alternative → modification de la séance, recalcul des conflits

**Règles d'interface :** RB-UI-05, DL-UI-04

---

### EC-GES-08 — Soumission pour validation Département

**Rôles :** `gest`  
**État de workflow :** `edition` → `valid_pedag`  
**Parcours UF :** `UF-GES-06`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Soumission pour validation Département", retour vers `EC-GES-06`
- Section récapitulatif : scores, conflits, couverture
- Section soumission : bouton "Soumettre pour validation Département", conditions de garde affichées

**Composants principaux :**
- Récapitulatif des scores (score global, sous-scores)
- Récapitulatif des conflits (conflits durs résolus / non résolus)
- Indicateur de couverture (%, doit être exactement 100 %)
- Indicateur des verrous (résolus / non résolus)
- Bouton principal "Soumettre pour validation Département" (disabled si conditions non remplies)
- Message d'information : "La couverture doit être exactement 100 % et aucun conflit dur ne doit persister"

**États de composant :**
- `état chargé` : récapitulatif affiché, bouton enabled ou disabled selon les conditions
- `état succès` : confirmation "Version soumise, notification envoyée au rdep"

**Actions disponibles :**
- Soumettre → passage à `valid_pedag`, notification au `rdep`

**Règles d'interface :** RB-UI-03 (soumission désactivée si couverture < 100 % ou conflit dur), DL-UI-04

---

### EC-GES-09 — Publication de la version

**Rôles :** `gest`  
**État de workflow :** `valide` → `publie`  
**Parcours UF :** `UF-GES-07`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Publication de la version", retour vers `EC-COM-02`
- Section confirmation : avertissement d'immutabilité, bouton "Publier"
- Section exports : lien vers `EC-GES-11` après publication

**Composants principaux :**
- Récapitulatif de la version : état, scores, date de validation
- Avertissement d'immutabilité : "À partir de la publication, la version devient immuable"
- Bouton principal "Publier" (disabled si la version n'est pas en état `valide`)
- Bouton secondaire "Annuler" → retour à `EC-COM-02`
- Lien vers `EC-GES-11` (disponible après publication)

**États de composant :**
- `état chargé` : version validée affichée, bouton "Publier" enabled
- `état succès` : confirmation "Version publiée, exports disponibles"

**Actions disponibles :**
- Publier → passage à `publie`, immutabilité activée, notification aux utilisateurs

**Règles d'interface :** DL-UI-04

---

### EC-GES-10 — Archivage d'une version

**Rôles :** `gest`, `admin`  
**État de workflow :** `publie`/`valide` → `archive` ou `archive` → `initial`  
**Parcours UF :** `UF-ADM-01`, `UF-GES-08`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Archivage d'une version", retour vers `EC-COM-02`
- Tableau des versions archivables : état, date, actions
- Section nouvelle version depuis archive : sélection d'une version archivée comme base

**Composants principaux :**
- Tableau avec colonnes : Version, État, Date, Actions (Archiver / Nouvelle version depuis archive)
- Bouton "Archiver" par ligne (pour versions en `publie` ou `valide`)
- Bouton "Nouvelle version depuis archive" par ligne (pour versions en `archive`)
- Modal de confirmation d'archivage

**États de composant :**
- `état chargé` : liste des versions affichée
- `état succès` : confirmation "Version archivée" ou "Nouvelle version créée depuis l'archive"

**Actions disponibles :**
- Archiver → passage à `archive`, conservation pour l'audit
- Nouvelle version depuis archive → création d'un squelette en `initial` basé sur l'archivée

**Règles d'interface :** DL-UI-04

---

### EC-GES-11 — Exports

**Rôles :** `gest`  
**État de workflow :** `publie`  
**Parcours UF :** `UF-GES-07`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Exports", retour vers `EC-COM-02`
- Sélecteur de format : XLSX, PDF, .ics
- Bouton de téléchargement, historique des exports

**Composants principaux :**
- Sélecteur de format d'export (XLSX, PDF, .ics)
- Bouton principal "Générer et télécharger"
- Historique des exports : date, format, taille, statut

**États de composant :**
- `état chargé` : sélecteur et historique affichés
- `état loading` : génération de l'export en cours

**Actions disponibles :**
- Générer et télécharger → téléchargement du fichier export

**Règles d'interface :** DL-UI-04

---

### EC-GES-12 — Gestion des verrous de séance

**Rôles :** `gest`  
**État de workflow :** `edition`  
**Parcours UF :** `UF-GES-05`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Gestion des verrous de séance", retour vers `EC-GES-06`
- Tableau des verrous actifs : séance, type de verrou, utilisateur, heure de pose
- Section pose de verrou : sélection de séance, type de verrou, portée (individuelle ou en masse)

**Composants principaux :**
- Tableau avec colonnes : Séance, Type de verrou, Utilisateur, Heure, Actions (lever)
- Formulaire de pose de verrou : sélection de séance, type (créneau/salle/enseignant/activité), portée
- Bouton "Poser le verrou"
- Boutons "Lever le verrou" par ligne du tableau
- Option "Verrou en masse" : par groupe, par enseignant, par salle

**États de composant :**
- `état chargé` : verrous actifs affichés
- `état vide` : aucun verrou actif

**Actions disponibles :**
- Poser un verrou → sur une séance ou en masse
- Lever un verrou → déverrouillage immédiat

**Règles d'interface :** RB-UI-02 (bail d'édition), RB-UI-05 (verrous bloquent le drag&drop), DL-UI-04

---

### EC-RDEP-01 — Répartition pédagogique

**Rôles :** `rdep`  
**État de workflow :** `initial` → `rep_pedag`  
**Parcours UF :** `UF-RDEP-01`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Répartition pédagogique", retour vers `EC-COM-02`
- Formulaire de saisie : enseignants ↔ matières ↔ groupes, volumes horaires, type d'enseignement
- Section validation : bouton "Valider ma répartition pour mon périmètre"

**Composants principaux :**
- Tableau de saisie avec colonnes : Enseignant, Matière, Groupe, Volume horaire, Type d'enseignement, Actions
- Champ de recherche par enseignant ou matière
- Bouton "Ajouter une affectation"
- Icônes d'action par ligne : modifier, supprimer
- Indicateur de charge horaire par enseignant (alerte si dépassement de fourchette, blocage si seuil bloquant)
- Bouton principal "Valider ma répartition" (disabled si des erreurs de saisie persistent)

**États de composant :**
- `état chargé` : formulaire de saisie avec affectations existantes
- `état vide` : aucune affectation saisie
- `état erreur` : erreur de saisie (volume hors fourchette, doublon)

**Actions disponibles :**
- Ajouter une affectation → formulaire en ligne
- Modifier/Supprimer une affectation existante
- Valider → passage à `brouillon`, notification au `gest`

**Règles d'interface :** RB-UI-01 (RBAC par département, lecture seule sur autres départements), DL-UI-04

---

### EC-RDEP-02 — Suivi des charges horaires

**Rôles :** `rdep`  
**État de workflow :** `rep_pedag` → `brouillon`  
**Parcours UF :** `UF-RDEP-01`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Suivi des charges horaires", retour vers `EC-COM-02`
- Tableau des charges : enseignant, volume prévu, volume affecté, écart, statut (OK / alerte / blocage)
- Graphique ou indicateurs visuels de répartition

**Composants principaux :**
- Tableau avec colonnes : Enseignant, Volume prévu, Volume affecté, Écart, Statut, Actions
- Badges de statut : vert (OK), orange (alerte), rouge (blocage)
- Indicateur global : taux de couverture des charges horaires du département
- Bouton "Actualiser" (recalcul des charges)

**États de composant :**
- `état chargé` : charges affichées avec statuts
- `état vide` : aucune donnée de charge (message "Aucune donnée de charge")

**Actions disponibles :**
- Consulter le détail d'un enseignant → affichage des affectations par matière/groupe

**Règles d'interface :** RB-UI-01, DL-UI-04

---

### EC-RDEP-03 — Validation de son périmètre

**Rôles :** `rdep`  
**État de workflow :** `valid_pedag` → `valid_dir`  
**Parcours UF :** `UF-RDEP-02`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Validation de mon périmètre", retour vers `EC-COM-02`
- Section consultation : version soumise pour le département, scores, détails
- Section décision : boutons "Valider" et "Rejeter"

**Composants principaux :**
- Récapitulatif de la version : état, scores, nombre de séances
- Bouton principal "Valider" → passage à `valid_dir`, notification à la Direction
- Bouton secondaire "Rejeter" → ouverture du champ de motif, passage à `edition`
- Champ de motif de rejet (texte libre, obligatoire si rejet)

**États de composant :**
- `état chargé` : version soumise affichée, boutons disponibles
- `état succès` : confirmation "Version validée" ou "Version retournée en édition avec motif"

**Actions disponibles :**
- Valider → passage à `valid_dir`, notification à la Direction
- Rejeter → saisie du motif obligatoire, retour à `edition`, notification au `gest`

**Règles d'interface :** DL-UI-04

---

### EC-RDEP-04 — Revalidation ciblée

**Rôles :** `rdep`  
**État de workflow :** `valid_dir`  
**Parcours UF :** `UF-DIR-01` (rejet pédagogique)  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Revalidation ciblée", retour vers `EC-COM-02`
- Section détaillée : séances impactées par le rejet Direction, motif du rejet
- Section action : bouton "Revalider mon périmètre"

**Composants principaux :**
- Liste des séances impactées : matière, groupe, créneau initial, créneau proposé
- Affichage du motif de rejet Direction (pédagogique)
- Bouton principal "Revalider mon périmètre" → réaffectation ciblée, notification à la Direction
- Bouton secondaire "Annuler" → retour à `EC-COM-02`

**États de composant :**
- `état chargé` : séances impactées affichées
- `état vide` : aucune séance impactée (message "Aucune séance à revalider")

**Actions disponibles :**
- Revalider → réaffectation des séances concernées, notification à la Direction

**Règles d'interface :** RB-UI-01 (uniquement son département), DL-UI-04

---

### EC-RDEP-05 — Consultation transversale

**Rôles :** `rdep`  
**État de workflow :** Tous  
**Parcours UF :** Consultation lecture seule  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Consultation transversale", retour vers `EC-COM-02`
- Tableau principal : vue lecture seule de tous les départements (affectations, charges, états)
- Filtres : par département, par état de workflow, par matière

**Composants principaux :**
- Tableau avec colonnes : Département, Enseignant, Matière, Groupe, Volume, État, Actions
- Filtres déroulants : département, état de workflow, matière
- Champ de recherche textuelle
- Badge de lecture seule sur chaque ligne

**États de composant :**
- `état chargé` : données de consultation affichées
- `état vide` : aucune donnée (message "Aucune donnée à consulter")

**Actions disponibles :**
- Filtrer par département / état / matière
- Exporter la vue (CSV)

**Règles d'interface :** RB-UI-01 (lecture seule sur tous les départements, écriture uniquement sur le sien), DL-UI-04

---

### EC-DIR-01 — Consultation du scénario final

**Rôles :** `dir`  
**État de workflow :** `valid_dir`  
**Parcours UF :** `UF-DIR-01`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Consultation du scénario final", retour vers `EC-COM-02`
- Section détaillée : scénario, scores, détail des séances par département
- Section décision : boutons "Valider définitivement" et "Rejeter"

**Composants principaux :**
- Récapitulatif du scénario : score global, sous-scores, nombre de séances, départements concernés
- Tableau détaillé des séances : matière, groupe, créneau, salle, enseignant, département
- Bouton principal "Valider définitivement" → passage à `valide`, notification au `gest` et au `rdep`
- Bouton secondaire "Rejeter" → ouverture de `EC-DIR-03` avec sélecteur de motif

**États de composant :**
- `état chargé` : scénario affiché, boutons disponibles
- `état succès` : confirmation "Version validée" ou "Rejet enregistré"

**Actions disponibles :**
- Valider définitivement → passage à `valide`
- Rejeter → redirection vers `EC-DIR-03` avec choix du type de rejet

**Règles d'interface :** DL-UI-04

---

### EC-DIR-02 — Validation ou rejet

**Rôles :** `dir`  
**État de workflow :** `valid_dir`  
**Parcours UF :** `UF-DIR-01`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Décision finale", retour vers `EC-DIR-01`
- Section présentation : résumé du scénario validé par les départements
- Section action : deux boutons côte à côte "Valider" et "Rejeter"

**Composants principaux :**
- Récapitulatif : état `valid_dir`, tous les départements validés, charge horaire OK
- Bouton principal "Valider définitivement" (style primaire)
- Bouton secondaire "Rejeter" (style secondaire, ouvre `EC-DIR-03`)
- Message d'information : "La validation rend la version définitive. Le rejet nécessite un motif."

**États de composant :**
- `état chargé` : écran de décision affiché

**Actions disponibles :**
- Valider → passage à `valide`, notifications au `gest` et au `rdep`
- Rejeter → redirection vers `EC-DIR-03`

**Règles d'interface :** DL-UI-04

---

### EC-DIR-03 — Rejet avec motif

**Rôles :** `dir`  
**État de workflow :** `valid_dir` → rejet  
**Parcours UF :** `UF-DIR-01`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Rejet de la version", retour vers `EC-DIR-01`
- Section sélection du type de rejet : pédagogique → `rep_pedag`, planning → `edition`
- Section saisie du motif : texte libre obligatoire

**Composants principaux :**
- Sélecteur de type de rejet : "Rejet pédagogique" ou "Rejet planning"
- Champ texte libre : motif du rejet (obligatoire, validation si vide)
- Bouton principal "Confirmer le rejet"
- Bouton secondaire "Annuler" → retour à `EC-DIR-01`

**États de composant :**
- `état chargé` : formulaire de rejet affiché
- `état succès` : confirmation "Rejet enregistré, version retournée à `rep_pedag`" ou "`edition`"

**Actions disponibles :**
- Confirmer le rejet pédagogique → passage à `rep_pedag`, notification au `rdep`
- Confirmer le rejet planning → passage à `edition`, notification au `gest`

**Règles d'interface :** RB-UI-06 (sélecteur de motif pédagogique/planning), DL-UI-04

---

### EC-DIR-04 — Archivage sans publication

**Rôles :** `dir`  
**État de workflow :** `valide` → `archive`  
**Parcours UF :** `UF-ADM-01`  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Archivage sans publication", retour vers `EC-COM-02`
- Section confirmation : avertissement, bouton "Archiver"

**Composants principaux :**
- Récapitulatif de la version : état `valide`, date de validation, scores
- Avertissement : "L'archivage rend la version consultable pour l'audit uniquement"
- Bouton principal "Archiver" (style secondaire)
- Bouton secondaire "Annuler" → retour à `EC-COM-02`

**États de composant :**
- `état chargé` : version en `valide` affichée
- `état succès` : confirmation "Version archivée"

**Actions disponibles :**
- Archiver → passage à `archive`, conservation pour l'audit

**Règles d'interface :** DL-UI-04

---

### EC-DIR-05 — Export officiel des versions publiées

**Rôles :** `dir`  
**État de workflow :** `publie`  
**Parcours UF :** —  
**État de composant :** `état chargé`

**Structure :**
- Header : titre "Export officiel", retour vers `EC-COM-02`
- Sélecteur de version publiée, sélecteur de format, bouton de téléchargement

**Composants principaux :**
- Sélecteur de version : liste des versions en état `publie`
- Sélecteur de format : XLSX, PDF
- Bouton principal "Générer l'export officiel"
- Historique des exports officiels : date, version, format, taille, utilisateur

**États de composant :**
- `état chargé` : sélecteurs et historique affichés
- `état loading` : génération de l'export en cours

**Actions disponibles :**
- Générer l'export officiel → téléchargement du fichier

**Règles d'interface :** DL-UI-04

---

## §3. Flux de navigation entre écrans

| Écran source | Écran cible | Transition déclenchée par | Condition |
|--------------|-------------|---------------------------|-----------|
| `EC-COM-01` | `EC-COM-02` | Connexion réussie | Identifiants valides |
| `EC-COM-02` | `EC-GES-01` | Clic "Initialiser un nouveau semestre" | Rôle `gest` ou `admin` |
| `EC-COM-02` | `EC-RDEP-01` | Notification "Répartition à saisir" cliquée | Rôle `rdep`, état `initial` |
| `EC-COM-02` | `EC-GES-04` | Clic "Lancer génération" | Rôle `gest`, état `brouillon` |
| `EC-COM-02` | `EC-GES-06` | Clic sur une version en édition | Rôle `gest`, état `edition` |
| `EC-COM-02` | `EC-GES-08` | Clic "Soumettre pour validation" | Rôle `gest`, état `edition` |
| `EC-COM-02` | `EC-RDEP-03` | Notification "Version validé" cliquée | Rôle `rdep`, état `valid_pedag` |
| `EC-COM-02` | `EC-DIR-01` | Notification "Version en validation Direction" cliquée | Rôle `dir`, état `valid_dir` |
| `EC-COM-02` | `EC-GES-09` | Clic "Publier" | Rôle `gest`, état `valide` |
| `EC-COM-02` | `EC-GES-10` | Clic "Archiver" ou "Nouvelle version depuis archive" | Rôle `gest`/`admin` |
| `EC-COM-02` | `EC-ADM-04` | Clic "Journal d'audit" | Rôle `admin` |
| `EC-GES-04` | `EC-GES-05` | Sélection d'un scénario | ≥ 1 scénario généré |
| `EC-GES-05` | `EC-GES-06` | Sélection d'un scénario comme base | Scénario choisi |
| `EC-GES-06` | `EC-GES-07` | Clic sur une séance en conflit | Conflit détecté |
| `EC-GES-06` | `EC-GES-12` | Clic "Gérer les verrous" | État `edition` |
| `EC-GES-07` | `EC-GES-06` | Application d'une alternative | Alternative choisie |
| `EC-GES-08` | `EC-RDEP-03` | Soumission réussie | Couverture 100 %, pas de conflit dur |
| `EC-RDEP-03` | `EC-DIR-01` | Validation réussie | Tous les départements validés |
| `EC-RDEP-03` | `EC-GES-06` | Rejet avec motif | Motif saisi, retour à `edition` |
| `EC-DIR-01` | `EC-DIR-03` | Clic "Rejeter" | État `valid_dir` |
| `EC-DIR-03` | `EC-RDEP-04` | Rejet pédagogique confirmé | Type = pédagogique |
| `EC-DIR-03` | `EC-GES-06` | Rejet planning confirmé | Type = planning |
| `EC-GES-09` | `EC-GES-11` | Publication réussie | État `publie` |
| `EC-GES-10` | `EC-COM-02` | Archivage ou nouvelle version depuis archive | Confirmation |

---

## §4. Règles transversales applicables aux wireframes

| Règle | Description | Écrans concernés |
|-------|-------------|------------------|
| `RB-UI-01` | Un `rdep` ne voit et ne modifie que les données de son département (RBAC par département). Il consulte tous les départements en lecture seule. | `EC-RDEP-01`, `EC-RDEP-02`, `EC-RDEP-03`, `EC-RDEP-04`, `EC-RDEP-05` |
| `RB-UI-02` | Les enseignants n'ont pas de compte applicatif ; ils reçoivent les diffusions par e-mail (.ics, PDF). Aucun écran enseignant n'est prévu. | Tous (absence d'écran enseignant) |
| `RB-UI-03` | Un bail d'édition exclusif (30 min, renouvelable) empêche l'édition simultanée sur une version ; le second utilisateur reste en lecture seule. L'`admin` peut forcer la libération. | `EC-GES-06`, `EC-GES-07`, `EC-GES-12` |
| `RB-UI-04` | Un contrôle optimiste protège en seconde ligne contre les modifications concurrentes (vérification de version avant écriture). | `EC-GES-06`, `EC-GES-07`, `EC-GES-12` |
| `RB-UI-05` | Les verrous de séance (créneau, salle, enseignant, activité) sont affichés sur la grille et bloquent le déplacement par drag&drop. | `EC-GES-06`, `EC-GES-07`, `EC-GES-12` |
| `RB-UI-06` | Seule une couverture exactement égale à 100 % autorise la soumission vers `valid_pedag`. La sur-planification est un conflit bloquant. | `EC-GES-08` |
| `RB-UI-07` | Un verrou incompatible avec les contraintes bloque la génération avant tout appel au solver CP-SAT. | `EC-GES-04` |
| `RB-UI-08` | Les résultats partiels (séances `NON_PLACÉE`) sont affichés avec avertissement avant de permettre la transition vers `edition`. | `EC-GES-05` |

---

## §5. Decision Log UI Wireframes

| # | Décision | Conséquence |
|---|----------|-------------|
| DL-WF-01 | Grille EDT drag&drop avec `@dnd-kit` | Dépendance frontend à `@dnd-kit` pour la grille interactive sur `EC-GES-06` |
| DL-WF-02 | Pas d'écran enseignant | Pas de maquette enseignant ; diffusion par e-mail uniquement (.ics, PDF) |
| DL-WF-03 | Thème Ramadan vs Normal | Deux variantes de thème gérées par les design tokens (E0.3e : `packages/design-tokens/`) |
| DL-WF-04 | WCAG AA | Contraste conforme, états jamais rendus par la seule couleur (libellé + icône), pas de mode sombre en v1.0 |

---

*Fin du UI_WIREFRAMES.md — TAKT v0.1 (E0.3c — validé)*