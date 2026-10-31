# Arborescence des écrans — TAKT (UI_ARBORESCENCE.md)

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques  
**Version :** 0.1 (E0.3a — validé)  
**Date :** 30 octobre 2026  
**Responsables :** UX Designer + MOA  
**Statut :** Phase 0 (E0.3a) — Validé  
**Critère de sortie :** Cartographie des vues par rôle validée  
**Documents liés :** SF_TAKT.md (§12 EX-UI-01), WORKFLOW_METIER.md (§6 responsabilités par rôle/état)

---

**Convention d'identification.** Chaque écran porte un code stable `EC-<DOMAINE>-<NN>` (ex: `EC-GES-01`, `EC-ADM-02`). Le code est cité dans les spécifications d'interaction (E0.3d) et les wireframes (E0.3c), jamais le numéro de section.

---

## §1. Vue d'ensemble par rôle

| Rôle | Raccourci | Écrans dédiés | Écrans partagés | États de workflow concernés |
|------|-----------|---------------|-----------------|----------------------------|
| Administrateur | `admin` | 4 | 3 | Tous (consultation globale) |
| Gestionnaire des emplois du temps | `gest` | 12 | 3 | `initial` → `publie` → `archive` |
| Responsable de département | `rdep` | 5 | 3 | `rep_pedag`, `brouillon`, `valid_pedag`, `valid_dir` |
| Direction | `dir` | 5 | 3 | `valid_dir`, `valide`, `publie`, `archive` |

**Total :** 26 écrans distincts (10 transversaux + 16 par rôle)

---

## §2. Écrans transversaux (tous les rôles selon droits)

| Code | Nom | Rôles | États workflow | Description |
|------|-----|-------|----------------|-------------|
| `EC-COM-01` | Connexion / Login | Tous | — | Authentification JWT (argon2id, accès court + refresh rotatif) |
| `EC-COM-02` | Tableau de bord centralisé | Tous | Tous | Vue d'état global des versions en cours, notifications, actions rapides, rafraîchissement automatique |
| `EC-COM-03` | Profil utilisateur | Tous | — | Données personnelles, préférences de notification (e-mail / in-app) |

---

## §3. Écrans Administrateur (`admin`)

| Code | Nom | États workflow | Description | Composants principaux |
|------|-----|----------------|-------------|----------------------|
| `EC-ADM-01` | Gestion des utilisateurs | Tous | Création, édition, désactivation de comptes ; attribution de rôles (`admin`, `gest`, `rdep`, `dir`) | Liste utilisateurs, formulaire CRUD, sélecteur de rôle, activation/désactivation |
| `EC-ADM-02` | Référentiels durables | Tous | Établissement, départements, types d'enseignement, grades, coefficients de charge | Tables de référence, formulaires d'édition, gestion des couleurs par type d'enseignement |
| `EC-ADM-03` | Paramètres système | Tous | Pas de temps (30 min fixe), jours ouvrés (lun–sam), seuils de verrouillage, seuil de risque de génération | Formulaire de configuration, sélecteurs, champs numériques |
| `EC-ADM-04` | Journal d'audit | Tous | Consultation uniquement (accès Admin exclusivement) | Table d'audit filtrable (action, horodatage, utilisateur, entité), export des logs, conservation 3 ans |

## §4. Écrans Gestionnaire (`gest`)

| Code | Nom | États workflow | Description | Composants principaux |
|------|-----|----------------|-------------|----------------------|
| `EC-GES-01` | Initialisation année/semestre | `initial` | Création du squelette, import sélectif depuis année clôturée, verrouillage du référentiel | Formulaire d'initialisation, assistant d'import, rapport d'erreurs par ligne |
| `EC-GES-02` | Préparation des plans d'études | `brouillon` | Parcours, matières, volumes horaires, types d'enseignement, groupes ; héritage automatique par groupe | Éditeur de plans d'études, tableau de héritage |
| `EC-GES-03` | Tableau de préparation (contraintes) | `brouillon` | Saisie des contraintes, vœux, exigences de salle, indisponibilités enseignants | Formulaires de contraintes, indicateurs de couverture, alarmes de faisabilité |
| `EC-GES-04` | Lancement et suivi des générations | `generation` | Lancement CP-SAT, suivi de progression du job, liste des scénarios trouvés, logs | Bouton lancer, barre de progression, tableau des scénarios, visualisation des logs |
| `EC-GES-05` | Comparaison de scénarios | `generation` | Vue côte à côte de 2 à 4 générations, métriques globales, différences d'affectation | Comparateur côté à côte, tableau de scores, highlight des différences (séances déplacées, salles, enseignants) |
| `EC-GES-06` | Grille EDT drag&drop | `edition` | Modification par glisser-déposer, recalcul immédiat des conflits, gestion des verrous | Grille interactive (dnd-kit), indicateurs de conflits temps réel, palette de verrous |
| `EC-GES-07` | Simulation et résolution de conflits | `edition` | Jusqu'à 20 alternatives classées par séance en conflit, sans écriture immédiate | Modal de simulation, liste d'alternatives classées, bouton appliquer |
| `EC-GES-08` | Soumission pour validation Département | `valid_pedag` | Soumission de la version choisie au `rdep` pour validation de son périmètre | Bouton soumettre, récapitulatif des scores et conflits, liste des départements |
| `EC-GES-09` | Publication de la version | `publie` | Publication (immuable), génération des exports, notification aux utilisateurs | Bouton publier, confirmation d'immutabilité, suivi de diffusion |
| `EC-GES-10` | Archivage d'une version | `archive` | Archiver sans publier depuis `valide`, ou archiver depuis `publie` | Bouton archiver, sélection de version source, historique des archives |
| `EC-GES-11` | Exports (XLSX, PDF, .ics) | `publie` | Génération et téléchargement des exports par version publiée | Sélecteur de format, bouton télécharger, historique des exports |
| `EC-GES-12` | Gestion des verrous de séance | `edition`, `valid_pedag`, `valid_dir` | Pose/levée de verrous (créneau, salle, enseignant, activité), pose en masse par groupe/enseignant/salle | Icônes de verrou sur la grille, modal de verrouillage en masse, historique des verrous |

---

## §5. Écrans Responsable Département (`rdep`)

| Code | Nom | États workflow | Description | Composants principaux |
|------|-----|----------------|-------------|----------------------|
| `EC-RDEP-01` | Répartition pédagogique | `rep_pedag` | Saisie et validation des affectations enseignants ↔ matières ↔ groupes, volumes horaires et type d'enseignement | Matrice d'affectation, suivi des charges, alertes de dépassement de fourchette, blocage si seuil bloquant |
| `EC-RDEP-02` | Suivi des charges horaires | `rep_pedag`, `brouillon` | Surveillance des charges par enseignant, alertes si dépassement de la fourchette, blocage si seuil bloquant atteint | Tableau de bord des charges, indicateurs de seuil, indicateurs d'alarme |
| `EC-RDEP-03` | Validation de son périmètre | `valid_pedag` | Validation ou rejet de la version pour son département, motif obligatoire en cas de rejet | Bouton valider, bouton rejeter, champ de motif texte libre obligatoire |
| `EC-RDEP-04` | Revalidation ciblée | `valid_dir` | Revalidation uniquement si son département est impacté par une modification Direction | Notification de revalidation, bouton valider/rejeter, champ de motif |
| `EC-RDEP-05` | Consultation des départements | Tous | Consultation en lecture seule de tous les départements, état de validation par département | Liste des départements, état de validation (en attente, approuvé, rejeté, reporté) |

---

## §6. Écrans Direction (`dir`)

| Code | Nom | États workflow | Description | Composants principaux |
|------|-----|----------------|-------------|----------------------|
| `EC-DIR-01` | Consultation du scénario final | `valid_dir` | Consultation du scénario, des scores et du détail des séances | Vue détaillée du scénario, tableau des scores, détail des séances par groupe/enseignant/salle |
| `EC-DIR-02` | Validation ou rejet de la version finale | `valid_dir` | Validation définitive (→ `valide`) ou rejet avec motif | Bouton valider, bouton rejeter, champ de motif obligatoire |
| `EC-DIR-03` | Rejet avec motif | `valid_dir` → `rep_pedag` ou `edition` | Motif pédagogique (→ `rep_pedag`) ou motif planning (→ `edition`) | Sélecteur de type de rejet, saisie de motif texte libre obligatoire |
| `EC-DIR-04` | Archivage sans publication | `valide` → `archive` | Archiver une version validée sans la publier | Bouton archiver, confirmation d'archivage |
| `EC-DIR-05` | Export officiel des versions publiées | `publie` | Téléchargement des exports (XLSX, PDF, .ics) des versions publiées | Sélecteur de format, bouton télécharger, historique des exports officiels |

---

## §7. Tableau de correspondance Écran ↔ État de workflow

| État | Écrans accessibles | Rôles principaux |
|------|-------------------|------------------|
| `initial` | `EC-COM-02`, `EC-GES-01` | `admin`, `gest`, `rdep` |
| `rep_pedag` | `EC-RDEP-01`, `EC-RDEP-02`, `EC-RDEP-05` | `rdep` (CRUD), `gest` (consultation), `admin` (consultation) |
| `brouillon` | `EC-GES-02`, `EC-GES-03`, `EC-RDEP-02`, `EC-RDEP-05` | `gest` (CRUD complet), `rdep` (affectation de son département) |
| `generation` | `EC-GES-04`, `EC-GES-05` | `gest` (lancer/suivre génération) |
| `edition` | `EC-GES-06`, `EC-GES-07`, `EC-GES-12`, `EC-RDEP-05` | `gest` (drag&drop, verrous), `rdep` (affectation de son département) |
| `valid_pedag` | `EC-GES-08`, `EC-RDEP-03`, `EC-RDEP-05` | `gest` (soumission), `rdep` (validation de son périmètre) |
| `valid_dir` | `EC-DIR-01`, `EC-DIR-02`, `EC-DIR-03`, `EC-RDEP-04`, `EC-RDEP-05` | `dir` (valider/rejeter), `rdep` (revalidation ciblée si impacté) |
| `valide` | `EC-GES-09`, `EC-GES-10`, `EC-DIR-04`, `EC-RDEP-05` | `gest` (publier/archiver), `dir` (valider finale/archiver) |
| `publie` | `EC-GES-11`, `EC-DIR-05`, `EC-COM-02` | `gest` (export), `dir` (export officiel), `admin` (consultation + export) |
| `archive` | `EC-GES-10`, `EC-ADM-04`, `EC-RDEP-05` | `admin` (consultation + audit), `gest` (consultation), `rdep` (consultation) |

---

## §8. Règles d'interface et de navigation

- **RB-UI-01** — Un `rdep` ne voit et ne modifie que les données de son département (RBAC par département). Il consulte tous les départements en lecture seule.
- **RB-UI-02** — Les enseignants n'ont pas de compte applicatif ; ils reçoivent les diffusions par e-mail (.ics, PDF). Aucun écran enseignant n'est prévu.
- **RB-UI-03** — Un bail d'édition exclusif (30 min, renouvelable) empêche l'édition simultanée sur une version ; le second utilisateur reste en lecture seule. L'`admin` peut forcer la libération.
- **RB-UI-04** — Un contrôle optimiste protège en seconde ligne contre les modifications concurrentes (vérification de version avant écriture).
- **RB-UI-05** — Les verrous de séance (créneau, salle, enseignant, activité) sont affichés sur la grille et bloquent le déplacement par drag&drop.
- **RB-UI-06** — Seule une couverture exactement égale à 100 % autorise la soumission vers `valid_pedag`. La sur-planification est un conflit bloquant.
- **RB-UI-07** — Un verrou incompatible avec les contraintes bloque la génération avant tout appel au solver CP-SAT.
- **RB-UI-08** — Les résultats partiels (séances `NON_PLACÉE`) sont affichés avec avertissement avant de permettre la transition vers `edition`.

---

## §9. Decision Log UI

| # | Décision | Conséquence |
|---|----------|-------------|
| DL-UI-01 | Grille EDT en drag&drop avec dnd-kit | Dépendance frontend à `@dnd-kit` pour la grille interactive |
| DL-UI-02 | Pas de compte enseignant | Diffusion par e-mail uniquement (.ics, PDF), pas d'interface enseignant |
| DL-UI-03 | Thème Ramadan vs Normal | Deux variantes de thème gérées par les design tokens (E0.3e : `packages/design-tokens/`) |
| DL-UI-04 | WCAG AA | Contraste conforme, états jamais rendus par la seule couleur (libellé + icône), pas de mode sombre en v1.0 |

---

*Fin du UI_ARBORESCENCE.md — TAKT v0.1 (E0.3a — validé)*

---