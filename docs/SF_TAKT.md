# Spécification fonctionnelle — TAKT

**Application de planification et de gestion des emplois du temps pédagogiques**

| Version | 0.1 (E0.3 — validé) |
| Date | 30 octobre 2026 |
| Langue | Français uniquement |
| Déploiement | Sur site, réseau interne |
| Moteur de génération | Solver CP-SAT |
| Statut | Phase 0 (E0.3) — Validé |
| Documents liés | WORKFLOW_METIER.md (E0.2), PLAN_MACRO.md |

---

**Convention d'identification.** Chaque exigence porte un code stable `EX-<DOMAINE>-<NN>`. Le backlog et la spécification technique citent ces codes et jamais des numéros de section, qui peuvent changer. Les décisions de référence sont tracées dans le Decision Log (§16).

---

## §1. Objet et principes généraux

TAKT gère la répartition pédagogique, les contraintes de planification, la génération automatique des emplois du temps avec le solver CP-SAT, leur édition manuelle, leur validation, leur publication, leur versionnement, leur archivage et leur export. L'application est la source de vérité fonctionnelle. Le solver CP-SAT est un moteur externe qui reçoit uniquement des fichiers dérivés.

- **EX-PRI-01** — L'application est la source de vérité fonctionnelle. Le solver CP-SAT reçoit uniquement des fichiers dérivés et n'accède jamais à la base métier.
- **EX-PRI-02** — Une version publiée (`publie`) est immuable. Toute modification crée une nouvelle version de travail à partir de la précédente. L'ancienne version reste consultable.
- **EX-PRI-03** — La sélection finale d'une génération est toujours manuelle. Le système ne choisit jamais seul une proposition.
- **EX-PRI-04** — La répartition pédagogique et la construction du planning sont séparées fonctionnellement. Une validation pédagogique (`rep_pedag` → `brouillon`) ne vaut pas validation du planning (`valid_dir` → `valide`).
- **EX-PRI-05** — Les règles de planification sont centralisées dans un moteur unique qui alimente la génération du fichier solver, les contrôles avant génération, la validation des modifications manuelles et les contrôles de validation et de publication.
- **EX-PRI-06** — Une génération est reproductible à partir de son snapshot. Une publication référence toutes les versions nécessaires à sa reproduction.
- **EX-PRI-07** — Versioning strict : toute modification déclenche une nouvelle version complète repassant par l'intégralité du workflow de validation.

---

## §2. Périmètre et capacités

| Élément | Volumétrie cible |
|---------|-----------------|
| Enseignants | 400 |
| Départements | 10 |
| Salles | 150 |
| Séances par semestre | 4 000 |
| Semestres par année / semaines par semestre | 2 / 14 |
| Jours | lundi à samedi |
| Pas de temps | 30 minutes, fixe pour toute l'institution |

- **EX-PER-01** — Le planning est une grille hebdomadaire répétée pendant les 14 semaines d'un semestre. Il n'y a ni semaines A/B ni variation hebdomadaire individuelle.
- **EX-PER-02** — Pas de gestion de calendrier académique (jours fériés, vacances). La grille est dupliquée mécaniquement sur le semestre.

---

## §3. Rôles et droits

| Rôle | Raccourci | Résumé |
|------|-----------|--------|
| Administrateur | `admin` | Administration de l'application, gestion des référentiels durables, tous droits |
| Gestionnaire des emplois du temps | `gest` | Pilotage opérationnel, génération, publication, exports |
| Responsable de département | `rdep` | Affectation pédagogique, validation de son périmètre, revalidation ciblée |
| Direction | `dir` | Validation finale, rejet avec motif, consultation stratégique |

- **EX-ROL-01** — Si un nouveau rôle est ajouté, il sera rattaché à l'un de ces quatre acteurs existants.
- **EX-ROL-02** — Matrice des droits par rôle et par état de version (reprise de WORKFLOW_METIER §6).

---

## §4. Référentiels métier

Hiérarchie : **Établissement → Département → Parcours → Niveau → Groupe**.

- **EX-REF-01** — Chaque entité possède un identifiant technique UUID et un code fonctionnel unique dans son périmètre.
- **EX-REF-02** — **Enseignant ↔ Département : N:N**. Un enseignant peut intervenir sur plusieurs départements (table associative).
- **EX-REF-03** — **Salle ↔ Département : aucun lien**. La salle est transversale, affectable à tout département sans contrainte structurelle.
- **EX-REF-04** — CRUD complet des référentiels par `admin` ; consultation par les autres rôles selon leur périmètre.
- **EX-REF-05** — Import sélectif depuis une année clôturée avec aperçu et conservation du lien `originId`. Les lignes valides sont importées ; les lignes invalides sont listées avec le motif du rejet.
- **EX-REF-06** — Les créneaux sont définis par jour (lun–sam) et ordre consécutif (pas de 30 min fixe).

---

## §5. Répartition pédagogique

Nouvelle étape par rapport à l'ancien workflow. État `rep_pedag` → `brouillon`.

- **EX-REP-01** — Le `rdep` saisit et valide la répartition pédagogique de son périmètre (enseignants ↔ **matières** ↔ groupes, volumes horaires et type d'enseignement).
- **EX-REP-02** — Une fois validée, la répartition passe à `brouillon` et est figée sous forme de **snapshot immuable** pour la version courante. La charge horaire est verrouillée une fois l'affectation pédagogique validée.
- **EX-REP-03** — Le `gest` peut consulter la répartition validée mais ne peut pas la modifier directement.
- **EX-REP-04** — Une modification pédagogique impactant un département après sa validation initiale implique une revalidation ciblée de ce département depuis `rep_pedag`.
- **EX-REP-05** — Le `rdep` peut annuler la répartition (retour à `initial`) tant qu'aucune affectation n'est validée.
- **EX-REP-06** — Règle de déploiement : la génération de l'EDT ne peut être lancée que lorsque **tous les départements ont validé** leur version d'affectation pédagogique.

## §6. Préparation de version et génération

États `brouillon`, `generation`.

- **EX-PRE-01** — À partir d'un `brouillon`, le `gest` peut lancer une génération manuelle vers l'état `generation` (uniquement si tous les départements ont validé — EX-REP-06).
- **EX-PRE-02** — Le `gest` peut aussi passer directement en `edition` (saisie libre sans génération préalable).
- **EX-PRE-03** — Une génération produit un ou plusieurs scénarios avec un **score d'optimisation (0-100)** et des sous-scores (compacité, répartition, heures tardives, vœux, etc.). Résultats partiels acceptés (séances `NON_PLACÉE` avec avertissement).
- **EX-PRE-04** — Le `gest` sélectionne manuellement un scénario généré pour passer en `edition`.
- **EX-PRE-05** — Une génération peut être annulée (retour à `brouillon`) si aucun scénario n'a été adopté.
- **EX-PRE-06** — Le solver CP-SAT est appelé via un fichier dérivé ; il n'a jamais accès direct à la base métier.

---

## §7. Édition manuelle et verrous

État `edition`.

- **EX-EDI-01** — Modification du planning par glisser-déposer. Après chaque modification : recalcul immédiat des conflits, vérification des règles, mise à jour des indicateurs.
- **EX-EDI-02** — Classification des conflits : enseignant, groupe, salle, capacité, équipement, compatibilité, indisponibilité, pause, règle pédagogique, verrou, covoiturage, vœu, donnée manquante (sévérité : bloquant / avertissement / information).
- **EX-EDI-03** — Avant dépôt, simulation indiquant contraintes respectées et violées, avec jusqu'à 20 alternatives classées pour une séance en conflit (sans écriture).
- **EX-EDI-04** — Bail d'édition exclusif par version (30 min, renouvelable). Contrôle optimiste en seconde ligne. `admin` peut forcer la libération.
- **EX-EDI-05** — Contrôle de couverture : seule une couverture exactement égale à 100 % autorise la soumission vers `valid_pedag`.
- **EX-VRR-01** — Verrous par séance de quatre types : créneau, salle, enseignant, activité. Pose en masse par groupe/enseignant/salle. Verrous envoyés au solver comme positions imposées.
- **EX-VRR-02** — Un verrou incompatible avec les contraintes bloque la génération avant tout appel au solver.

---

## §8. Workflow de validation et publication

Cœur du document — traduit WORKFLOW_METIER en exigences fonctionnelles avec les 10 états.

- **EX-WKF-01** — Une version d'EDT passe par les états : `initial` → `rep_pedag` → `brouillon` → [`generation` →] `edition` → `valid_pedag` → `valid_dir` → `valide` → `publie`.
- **EX-WKF-02** — Depuis `valid_pedag`, le `rdep` peut valider (→ `valid_dir`) ou rejeter (→ `edition` avec motif obligatoire).
- **EX-WKF-03** — Depuis `valid_dir`, le `dir` peut valider (→ `valide`) ou rejeter : motif pédagogique (→ `rep_pedag`) ou motif planning (→ `edition`).
- **EX-WKF-04** — Depuis `valide`, le `gest` publie (→ `publie`, immuable) ou archive sans publier (→ `archive`).
- **EX-WKF-05** — Depuis `publie`, seule la transition vers `archive` est autorisée (immutabilité absolue).
- **EX-WKF-06** — Depuis `archive`, une nouvelle version peut être créée (→ `initial`) basée sur l'archivée ; l'originale reste consultable pour l'audit.
- **EX-WKF-07** — Le rejet depuis `valid_dir` ne peut pas aboutir directement à `brouillon`.
- **EX-WKF-08** — Chaque rejet comporte un motif obligatoire (texte libre).
- **EX-WKF-09** — Les verrous posés pendant `edition`, `valid_pedag` et `valid_dir` sont respectés par le solver lors d'une régénération.

---

## §9. Notifications

- **EX-NOT-01** — Notification in-app + email à chaque changement d'état de version avec destinataire selon la matrice de WORKFLOW_METIER §9.
- **EX-NOT-02** — Rejet Direction : notification avec motif détaillé au rôle concerné (`rdep` ou `gest`).
- **EX-NOT-03** — Publication : notification à tous les utilisateurs concernés avec exports disponibles (.ics, XLSX, PDF).

---

## §10. Exports et diffusion

- **EX-EXP-01** — Export Excel (XLSX) de la grille EDT par version publiée.
- **EX-EXP-02** — Export PDF de la grille EDT par version publiée.
- **EX-EXP-03** — Export calendrier (.ics) pour intégration dans les outils personnels.
- **EX-EXP-04** — La publication déclenche la génération et la mise à disposition de tous les exports.

---

## §11. Versionnement, snapshots et audit

- **EX-DAT-01** — Chaque génération référence un snapshot immuable des données utilisées (activités, groupes, enseignants, salles, créneaux, règles, contraintes, préférences, verrous, profil).
- **EX-DAT-02** — Une publication référence tous les snapshots nécessaires à sa reproduction.
- **EX-DAT-03** — Aucune génération n'est supprimée automatiquement sans politique d'archivage explicite.
- **EX-DAT-04** — Les verrous suivent la séance dans les nouvelles versions et disparaissent avec elle. Pose et levée sont auditées.
- **EX-DAT-05** — Journal d'audit : `action` + `horodatage` + métadonnées JSONB optionnel ; accès `admin` uniquement.

---

## §12. Interface utilisateur

Simple référence vers les livrables UI séparés (E0.3a à E0.3e).

- **EX-UI-01** — Arborescence des écrans par rôle : `docs/UI_ARBORESCENCE.md`.
- **EX-UI-02** — Parcours utilisateur critiques : `docs/UI_USER_FLOWS.md`.
- **EX-UI-03** — Maquettes basse fidélité : `docs/UI_WIREFRAMES/`.
- **EX-UI-04** — Comportement drag&drop, verrous, conflits : `docs/UI_INTERACTIONS.md`.
- **EX-UI-05** — Tokens de design, charte WCAG AA, thème Ramadan : `packages/design-tokens/` + doc.

---

## §13. Sécurité et authentification

- **EX-SEC-01** — Authentification locale : argon2id pour le hachage des mots de passe, JWT d'accès court + refresh rotatif.
- **EX-SEC-02** — RBAC avec portée par département : un `rdep` ne voit et ne modifie que les données de son département.
- **EX-SEC-03** — Contrôle d'accès par état de version : seuls les rôles autorisés peuvent effectuer une transition donnée (matrice WORKFLOW_METIER §6).

---

## §14. Ouvertes et hypothèses

| # | Question ouverte | Décision attendue | Responsable |
|---|------------------|-------------------|-------------|
| EX-OUV-01 | Le seuil de verrouillage maximal avant qu'une génération CP-SAT soit déclarée risquée | 75 % des séances verrouillées | Architecte |
| EX-OUV-02 | Une version `archive` peut-elle être dupliquée pour créer un nouveau semestre directement vers `initial` | Oui | MOA |
| EX-OUV-03 | Les notifications en cas de rejet doivent-elles inclure le motif détaillé | Oui, texte libre obligatoire | MOA |
| EX-OUV-04 | Le rôle `initial` peut-il être créé par le `gest` ou seulement par l'`admin` | `admin` et `gest` | MOA |

---

## §15. Glossaire

| Terme | Définition |
|-------|------------|
| Version | État versionné d'un planning pour un semestre, identifié par un des 10 états du workflow. |
| Scénario | Proposition de placement des séances produite par le solver CP-SAT, avec score global et sous-scores. |
| Snapshot | Copie immuable des données utilisées pour une génération. |
| Verrou | Contrainte imposée sur une séance (créneau, salle, enseignant, activité) respectée par le solver. |
| Couverture | Rapport entre le volume placé et le volume attendu pour une affectation (doit être 100 % pour soumission). |
| Bail d'édition | Verrou exclusif sur une version pendant l'édition manuelle (30 min). |

---

## §16. Decision Log

| # | Décision | Conséquence |
|---|----------|-------------|
| DL-01 | Solver CP-SAT (pas FET) | Le solver reçoit des fichiers dérivés, pas d'accès direct à la base métier |
| DL-02 | 10 états de workflow | `initial`, `rep_pedag`, `brouillon`, `generation`, `edition`, `valid_pedag`, `valid_dir`, `valide`, `publie`, `archive` |
| DL-03 | Raccourcis rôles | `admin`, `gest`, `rdep`, `dir` |
| DL-04 | Pas de portail public | Consultation interne uniquement, diffusion par exports |
| DL-05 | Immutabilité publiée | `publie` → seule transition possible : `archive` |
| DL-06 | Pas de calendrier académique | Grille hebdomadaire dupliquée, sans jours fériés ni vacances |
| DL-07 | Charge figée | Verrouillée une fois l'affectation pédagogique validée (`rep_pedag` → `brouillon`) |
| DL-08 | Génération conditionnée | Tous les départements doivent avoir validé avant lancement |

---

*Fin du SF_TAKT.md — TAKT v0.1 (E0.3 — validé)*

---