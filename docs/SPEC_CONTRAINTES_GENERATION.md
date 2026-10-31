# Spécification des Contraintes de Génération EDT — TAKT (SPEC_CONTRAINTES_GENERATION.md)

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques
**Version :** 1.0
**Date :** 30 octobre 2026
**Responsable :** Architecte + Backend Lead + MOA
**Statut :** Validé — Complément G3
**Documents liés :** SPEC_SOLVER_CPSAT.md, SF_TAKT.md (§7, §8, §9), WORKFLOW_METIER.md (§3, §7, §8), ST_TAKT.md (§2, §3), UI_INTERACTIONS.md, UI_WIREFRAMES.md

---

## 1. Objectif

Fournir la **liste exhaustive et normative** de toutes les règles et contraintes pouvant être appliquées lors de la génération d'emplois du temps par le solver CP-SAT. Ce document sert de référence unique pour :
- L'implémentation du moteur de contraintes (backend + solver)
- La configuration des poids dans l'interface de gestion des contraintes
- Les tests de validation du solver
- La documentation utilisateur (gest/rdep)

---

## 2. Classification des contraintes

### 2.1 Par nature

| Catégorie | Description | Poids CP-SAT | Exemples |
|-----------|-------------|--------------|----------|
| **Contraintes dures (HARD)** | Doivent être satisfaites à 100% — violation = génération impossible | 100 (fixe) | Conflits salle/enseignant/groupe, verrous, indisponibilités |
| **Contraintes souples (SOFT)** | Préférences — violation pénalisée dans la fonction objectif | 1-99 (configurable) | Préférences enseignant, continuité, équilibrage, fenêtres |

### 2.2 Par portée

| Portée | Cible | Exemples |
|--------|-------|----------|
| **Globale** | Tout l'EDT | Nombre max de jours d'enseignement, équilibrage global |
| **Par enseignant** | Un enseignant spécifique | Indisponibilités, max heures/jour, préférences créneaux |
| **Par groupe** | Un groupe d'étudiants | Pas de trous, max heures/jour, regroupement par matière |
| **Par salle** | Une salle spécifique | Type requis, capacité, équipements |
| **Par activité/séance** | Une séance spécifique | Verrous, durée, type salle requis |
---

## 3. Contraintes DURES (HARD) — Poids 100

Ces contraintes sont **non négociables**. Si le solver ne peut pas les satisfaire, la génération échoue (statut `INFEASIBLE`).

### 3.1 Conflits de ressources (Détection automatique)

| Code | Nom | Description | Détection | Source |
|------|-----|-------------|-----------|--------|
| **HC-RES-01** | Conflit salle | Deux séances ne peuvent pas occuper la même salle au même créneau | Automatique (contrainte UNIQUE `versionId, jour, creneauDebut, salleId`) | ST_TAKT TE-DB-03 |
| **HC-RES-02** | Conflit enseignant | Un enseignant ne peut pas être à deux endroits au même créneau | Automatique | Métier |
| **HC-RES-03** | Conflit groupe | Un groupe d'étudiants ne peut pas avoir deux séances simultanées | Automatique | Métier |

> **Implémentation solver** : Variables booléennes `x[activité][jour][créneau][salle][enseignant]` + contraintes `AddAllDifferent` ou `AddLinearConstraint(sum <= 1)`

### 3.2 Verrous de séance (Posés manuellement par le `gest`)

| Code | Type verrou | Description | Effet solver | Source |
|------|-------------|-------------|--------------|--------|
| **HC-LOCK-01** | `CRÉNEAU` | Jour + créneau imposés | Variable fixée à 1 pour ce créneau | WORKFLOW_METIER §8 |
| **HC-LOCK-02** | `SALLE` | Salle imposée | Variable fixée à 1 pour cette salle | WORKFLOW_METIER §8 |
| **HC-LOCK-03** | `ENSEIGNANT` | Enseignant imposé | Variable fixée à 1 pour cet enseignant | WORKFLOW_METIER §8 |
| **HC-LOCK-04** | `ACTIVITÉ` | Contenu (matière/type) imposé | Variable fixée à 1 pour cette activité | WORKFLOW_METIER §8 |

> **Règle** : Un verrou incompatible avec d'autres contraintes dures → génération `INFEASIBLE`. Le système avertit avant lancement si taux verrouillage > seuil configurable (défaut 75%, EX-OUV-01).

### 3.3 Indisponibilités enseignants (Saisies en `brouillon`)

| Code | Description | Format valeur | Source |
|------|-------------|---------------|--------|
| **HC-UNAV-01** | Indisponibilité ponctuelle | `{"day": 2, "slots": [0,1,2,3]}` (mercredi 8h-10h) | SF_TAKT §7 |
| **HC-UNAV-02** | Indisponibilité récurrente (jour entier) | `{"day": 4, "allDay": true}` (vendredi) | SF_TAKT §7 |
| **HC-UNAV-03** | Indisponibilité multi-jours | `{"days": [5,6], "slots": [0..23]}` (week-end) | SF_TAKT §7 |

> **Poids** : 100 (HARD). Si enseignant indisponible sur tous créneaux possibles pour une activité → `INFEASIBLE`.

### 3.4 Exigences de salle (Typage salle)

| Code | Description | Règle | Source |
|------|-------------|-------|--------|
| **HC-ROOM-01** | Type salle requis | Activité `CM` → salle type `AMPHI` ; `TD` → `TD` ; `TP` → `TP`/`INFO` ; `PROJET` → `TD`/`INFO` | SF_TAKT §7, ST_TAKT §2 |
| **HC-ROOM-02** | Capacité minimale | `capacité_salle ≥ effectif_groupe` (avec marge 10%) | ST_TAKT §2 |
| **HC-ROOM-03** | Équipements requis | Salle `INFO` → ordinateurs ; Salle `TP` → matériel spécifique | Référentiel salles |

### 3.5 Contraintes structurelles (Fixes institution)

| Code | Description | Valeur | Source |
|------|-------------|--------|--------|
| **HC-STR-01** | Pas de temps | 30 minutes (fixe) | SF_TAKT EX-PER-01 |
| **HC-STR-02** | Jours ouvrés | Lundi à Samedi (6 jours) | Configuration `jours_ouvres` |
| **HC-STR-03** | Créneaux par jour | 24 (8h-20h) | Configuration `slots_per_day` |
| **HC-STR-04** | Volume hebdomadaire exact | Chaque activité doit être placée exactement `weeklyVolume` fois par semaine | Affectation pédagogique |
---

## 4. Contraintes SOUPLES (SOFT) — Poids 1-99

Ces contraintes définissent la **qualité** de l'EDT. Le solver maximise la somme pondérée des contraintes satisfaites.

### 4.1 Préférences enseignants

| Code | Nom | Description | Valeur (JSON) | Poids défaut | Configurable |
|------|-----|-------------|---------------|--------------|--------------|
| **SC-PREF-01** | Créneaux préférés | Enseignant préfère certains créneaux | `{"teacherId": "t1", "preferred": [{"day":1,"slots":[4,5,6]},{"day":2,"slots":[4,5,6]}]}` | 30 | Oui |
| **SC-PREF-02** | Créneaux évités | Enseignant évite certains créneaux (sans être indisponible) | `{"teacherId": "t1", "avoided": [{"day":5,"slots":[0..10]}]}` | 20 | Oui |
| **SC-PREF-03** | Jours préférés | Regroupement sur certains jours | `{"teacherId": "t1", "preferredDays": [1,2,3]}` | 25 | Oui |
| **SC-PREF-04** | Salle préférée | Enseignant préfère une salle spécifique | `{"teacherId": "t1", "preferredRoom": "r5"}` | 15 | Oui |

> **Note** : Ces préférences sont saisies par le `rdep` ou le `gest` en état `brouillon`.

### 4.2 Contraintes de continuité et compacité

| Code | Nom | Description | Valeur (JSON) | Poids défaut | Configurable |
|------|-----|-------------|---------------|--------------|--------------|
| **SC-CONT-01** | Séances consécutives | Séances d'une même activité groupées (ex: CM 2h = 4 créneaux consécutifs) | `{"activityId": "a1", "minConsecutive": 4}` | 40 | Oui |
| **SC-CONT-02** | Pas de trous (groupes) | Éviter les trous dans l'emploi du temps d'un groupe | `{"groupId": "g1", "maxGapsPerDay": 1}` | 35 | Oui |
| **SC-CONT-03** | Pas de trous (enseignants) | Éviter les trous dans l'emploi du temps d'un enseignant | `{"teacherId": "t1", "maxGapsPerDay": 2}` | 30 | Oui |
| **SC-CONT-04** | Journées compactes | Regrouper les séances sur moins de jours | `{"target": "teacher|group", "maxDaysPerWeek": 4}` | 25 | Oui |
| **SC-CONT-05** | Demi-journées libres | Garantir au moins une demi-journée libre par semaine | `{"target": "group", "minFreeHalfDays": 1}` | 20 | Oui |

### 4.3 Contraintes de charge horaire

| Code | Nom | Description | Valeur (JSON) | Poids défaut | Configurable |
|------|-----|-------------|---------------|--------------|--------------|
| **SC-LOAD-01** | Max heures/jour enseignant | Ne pas dépasser X heures d'affilée | `{"teacherId": "t1", "maxHoursPerDay": 6}` | 50 | Oui |
| **SC-LOAD-02** | Max heures/semaine enseignant | Respecter la charge hebdomadaire cible | `{"teacherId": "t1", "maxHoursPerWeek": 19}` | 60 | Oui |
| **SC-LOAD-03** | Équilibrage charge | Répartition équitable entre enseignants d'un même département | `{"departmentId": "d1", "balanceWeight": 30}` | 30 | Oui |
| **SC-LOAD-04** | Fenêtre horaire | Séances dans une plage horaire donnée (ex: 8h-18h) | `{"teacherId": "t1", "windowStart": 0, "windowEnd": 20}` | 40 | Oui |

### 4.4 Contraintes pédagogiques

| Code | Nom | Description | Valeur (JSON) | Poids défaut | Configurable |
|------|-----|-------------|---------------|--------------|--------------|
| **SC-PED-01** | Matières regroupées | Même matière regroupée sur la journée | `{"subjectId": "s1", "groupByDay": true}` | 25 | Oui |
| **SC-PED-02** | Alternance CM/TD | TD après CM (même semaine) | `{"subjectId": "s1", "cmBeforeTd": true}` | 30 | Oui |
| **SC-PED-03** | Répartition équilibrée | Séances réparties sur la semaine (pas toutes le lundi) | `{"activityId": "a1", "spreadWeight": 20}` | 20 | Oui |
| **SC-PED-04** | Éviter dernier créneau | Pas de séance au dernier créneau (19h30-20h) | `{"target": "all", "avoidLastSlot": true}` | 15 | Oui |

### 4.5 Contraintes de salle

| Code | Nom | Description | Valeur (JSON) | Poids défaut | Configurable |
|------|-----|-------------|---------------|--------------|--------------|
| **SC-ROOM-01** | Même salle pour même activité | Régularité de salle pour une activité | `{"activityId": "a1", "sameRoomWeight": 25}` | 25 | Oui |
| **SC-ROOM-02** | Proximité salles | Salles proches pour séances consécutives même groupe | `{"groupId": "g1", "proximityWeight": 20}` | 20 | Oui |
| **SC-ROOM-03** | Bâtiment préféré | Préférence pour un bâtiment | `{"departmentId": "d1", "preferredBuilding": "A"}` | 15 | Oui |
---

## 5. Modèle de données unifié (Contrainte → Solver)

### 5.1 Structure complète d'une contrainte

```json
{
  "id": "uuid",
  "type": "UNAVAILABILITY|ROOM_REQUIREMENT|TEACHER_PREFERENCE|CONSECUTIVE_SLOTS|MAX_HOURS_PER_DAY|WINDOW_CONSTRAINT|NO_GAPS|COMPACT_DAYS|LOAD_BALANCE|SUBJECT_GROUPING|CM_BEFORE_TD|SPREAD|AVOID_LAST_SLOT|SAME_ROOM|ROOM_PROXIMITY|PREFERRED_BUILDING",
  "category": "HARD|SOFT",
  "scope": "GLOBAL|TEACHER|GROUP|ROOM|ACTIVITY|DEPARTMENT",
  "targetId": "uuid|null",
  "value": "JSON string selon type",
  "weight": 100,
  "isActive": true,
  "source": "AUTO|MANUAL|CONFIG",
  "createdBy": "userId",
  "createdAt": "ISO8601"
}
```

### 5.2 Mapping Type Contrainte → Variable Solver

| Type contrainte | Variable CP-SAT concernée | Type de contrainte CP-SAT |
|-----------------|---------------------------|---------------------------|
| `UNAVAILABILITY` | `x[act][day][slot][room][teacher]` | `AddLinearConstraint(sum == 0)` |
| `ROOM_REQUIREMENT` | `x[act][day][slot][room][teacher]` | `AddAllowedAssignments` (salles autorisées) |
| `TEACHER_PREFERENCE` | `x[act][day][slot][room][teacher]` | `AddWeightedSum` dans objectif |
| `CONSECUTIVE_SLOTS` | `x[act][day][slot][room][teacher]` | `AddCircuit` / `AddAutomaton` (régularité) |
| `MAX_HOURS_PER_DAY` | `sum_slots x[act][day][slot]...` | `AddLinearConstraint(sum <= max)` |
| `WINDOW_CONSTRAINT` | `x[act][day][slot]...` | `AddLinearConstraint(slot ∈ [start,end])` |
| `NO_GAPS` | Variables d'occupation par jour | `AddAutomaton` (pas de 0 entre 1) |
| `COMPACT_DAYS` | Variables d'occupation par jour | `AddLinearConstraint(count_days <= max)` |
| `LOAD_BALANCE` | Variables par enseignant | `AddMinMaxEquality` dans objectif |
| `SUBJECT_GROUPING` | Variables par matière/jour | `AddLinearConstraint` |
| `CM_BEFORE_TD` | Variables CM/TD | `AddImplication` (CM → TD après) |
| `SPREAD` | Variables par jour | Entropie / variance dans objectif |
| `AVOID_LAST_SLOT` | `x[act][day][last_slot]` | Poids négatif dans objectif |
| `SAME_ROOM` | `x[act][day][slot][room]` | `AddEquality` entre jours |
| `ROOM_PROXIMITY` | Distance salles | Poids dans objectif |
| `PREFERRED_BUILDING` | Bâtiment salle | Poids dans objectif |

---

## 6. Règles de validation AVANT génération (Pre-flight checks)

Le système **bloque** le lancement de la génération si ces règles ne sont pas respectées (voir `WORKFLOW_METIER.md` §3, transition `brouillon` → `generation`).

| Code | Règle | Vérification | Message si échec |
|------|-------|--------------|------------------|
| **PRE-01** | Répartition pédagogique validée | Tous départements concernés en `rep_pedag` validés → `brouillon` | "Tous les départements doivent avoir validé leur répartition" |
| **PRE-02** | Contraintes saisies | Au moins les indisponibilités enseignants renseignées | "Des indisponibilités enseignants manquent" |
| **PRE-03** | Aucun verrou bloquant | Taux verrouillage < seuil (config `seuil_verrouillage_risque_pct`, défaut 75%) | "Taux de verrouillage trop élevé (> 75%), génération risquée" |
| **PRE-04** | Couverture pédagogique 100% | Toutes les affectations ont un volume > 0 | "Certaines affectations ont un volume nul" |
| **PRE-05** | Salles disponibles | Au moins 1 salle compatible par type d'activité | "Aucune salle de type AMPHI disponible pour les CM" |
| **PRE-06** | Enseignants disponibles | Chaque activité a au moins 1 enseignant disponible | "Activité X sans enseignant disponible" |
| **PRE-07** | Capacité salles | Pour chaque activité, ∃ salle capacité ≥ effectif max groupe | "Salles trop petites pour les groupes de l'activité X" |
| **PRE-08** | Volume total ≤ créneaux dispo | Somme volumes hebdo ≤ créneaux semaine × salles dispo | "Volume total dépasse la capacité d'accueil" |

> **Implémentation** : Service `GenerationPreflightService` exécuté avant soumission job pg-boss.

---

## 7. Fonction objectif CP-SAT (Objectif global)

Le solver **maximise** la fonction objectif :

```
MAXIMIZE
  Σ (weight_i × satisfaction_i)           // Contraintes SOFT satisfaites
  - Σ (penalty_j × violation_j)           // Pénalités (séances non placées, trous, etc.)
```

### 7.1 Sous-scores (pour affichage et comparaison scénarios)

| Sous-score | Description | Calcul | Poids dans score global |
|------------|-------------|--------|-------------------------|
| **Couverture** | % séances placées / séances attendues | `placées / attendues × 100` | 40% |
| **Respect créneaux** | % contraintes créneaux satisfaites | `satisfaites / totales × 100` | 15% |
| **Respect salles** | % contraintes salles satisfaites | `satisfaites / totales × 100` | 15% |
| **Respect enseignants** | % préférences enseignants satisfaites | `satisfaites / totales × 100` | 15% |
| **Continuité** | % séances consécutives / sans trous | Métriques compacité | 10% |
| **Équilibre charge** | Écart-type charge enseignants | `1 - (écart-type / moyenne)` | 5% |

> **Score global** = Somme pondérée des sous-scores (0-100)

### 7.2 Pénalités fixes

| Violation | Pénalité | Description |
|-----------|----------|-------------|
| Séance `NON_PLACÉE` | -1000 par séance | Priorité absolue : tout placer |
| Conflit HARD non résolu | -10000 | Génération invalide (INFEASIBLE) |
| Verrou violé | -10000 | Génération invalide |
---

## 8. Configuration par défaut (Seeds)

### 8.1 Poids par défaut des contraintes SOFT

```yaml
# config/contraintes-defaults.yaml
soft_constraints_defaults:
  # Préférences enseignants
  TEACHER_PREFERRED_SLOTS: 30
  TEACHER_AVOIDED_SLOTS: 20
  TEACHER_PREFERRED_DAYS: 25
  TEACHER_PREFERRED_ROOM: 15
  
  # Continuité
  CONSECUTIVE_SLOTS: 40
  NO_GAPS_GROUPS: 35
  NO_GAPS_TEACHERS: 30
  COMPACT_DAYS: 25
  FREE_HALF_DAYS: 20
  
  # Charge
  MAX_HOURS_PER_DAY: 50
  MAX_HOURS_PER_WEEK: 60
  LOAD_BALANCE: 30
  WINDOW_CONSTRAINT: 40
  
  # Pédagogique
  SUBJECT_GROUPING: 25
  CM_BEFORE_TD: 30
  SPREAD: 20
  AVOID_LAST_SLOT: 15
  
  # Salles
  SAME_ROOM: 25
  ROOM_PROXIMITY: 20
  PREFERRED_BUILDING: 15
```

### 8.2 Seuils configurables (table `Configuration`)

| Clé | Défaut | Description |
|-----|--------|-------------|
| `seuil_verrouillage_risque_pct` | 75 | % max verrouillage avant avertissement |
| `bail_edition_duree_minutes` | 30 | Durée bail édition |
| `pas_temps_minutes` | 30 | Pas de temps (fixe institution) |
| `jours_ouvres` | "1,2,3,4,5,6" | Jours ouvrés (1=lundi) |
| `generation_max_scenarios` | 3 | Nombre max scénarios générés |
| `generation_time_limit_seconds` | 300 | Timeout solver |
| `generation_max_memory_gb` | 4 | Limite mémoire solver |
---

## 9. Interface utilisateur (Gestion des contraintes)

### 9.1 Écran `EC-GES-03` — Configuration des contraintes (Wireframe `UI_WIREFRAMES.md`)

| Section | Contraintes affichées | Actions |
|---------|----------------------|---------|
| **Indisponibilités** | Liste par enseignant (jour/créneaux) | Ajouter/Modifier/Supprimer |
| **Préférences enseignants** | Créneaux préférés/évités, jours, salles | Édition par enseignant |
| **Continuité** | Max trous/jour, max jours/semaine, demi-journées libres | Curseurs par cible (groupe/enseignant) |
| **Charge** | Max h/jour, max h/semaine, fenêtre horaire, équilibrage | Saisie numérique |
| **Pédagogique** | Regroupement matière, CM avant TD, étalement, éviter dernier créneau | Cases à cocher + poids |
| **Salles** | Même salle, proximité, bâtiment préféré | Sélection + poids |

### 9.2 Règle d'or UI

> **Toute contrainte modifiable en UI doit avoir un poids configurable (1-99) et être désactivable.**
> Les contraintes HARD (conflits, verrous, indisponibilités, exigences salle) ne sont **pas** éditables en poids (fixe 100).

---

## 10. Exemples concrets de scénarios de contraintes

### 10.1 Cas nominal (Génération standard)

```json
{
  "constraints": [
    { "type": "UNAVAILABILITY", "targetId": "t1", "value": "{\"day\":4,\"allDay\":true}", "weight": 100 },
    { "type": "TEACHER_PREFERENCE", "targetId": "t1", "value": "{\"preferredDays\":[1,2,3]}", "weight": 25 },
    { "type": "NO_GAPS", "targetId": "g1", "value": "{\"maxGapsPerDay\":1}", "weight": 35 },
    { "type": "MAX_HOURS_PER_DAY", "targetId": "t1", "value": "{\"maxHours\":6}", "weight": 50 },
    { "type": "CONSECUTIVE_SLOTS", "targetId": "a1", "value": "{\"minConsecutive\":4}", "weight": 40 }
  ]
}
```

### 10.2 Cas contrainte forte (Beaucoup de verrous)

```json
{
  "locks": [
    { "lockType": "TIMESLOT", "activityId": "a1", "value": "day:1,slot:4" },
    { "lockType": "ROOM", "activityId": "a2", "value": "r5" },
    { "lockType": "TEACHER", "activityId": "a3", "value": "t7" }
  ],
  "constraints": [
    { "type": "UNAVAILABILITY", "targetId": "t7", "value": "{\"day\":2,\"slots\":[0,1,2,3]}", "weight": 100 }
  ]
}
```
→ **Avertissement pré-génération** : "3 verrous + 1 indisponibilité = 82% verrouillage > 75%. Génération risquée."

### 10.3 Cas département spécifique (Ex: INFO - TP machines)

```json
{
  "constraints": [
    { "type": "ROOM_REQUIREMENT", "targetId": "a_tp_info", "value": "{\"roomType\":\"INFO\",\"requiredEquipment\":[\"PC\",\"Projecteur\"]}", "weight": 100 },
    { "type": "PREFERRED_BUILDING", "targetId": "d_INFO", "value": "{\"building\":\"B\"}", "weight": 15 },
    { "type": "ROOM_PROXIMITY", "targetId": "g_info_1", "value": "{}", "weight": 20 }
  ]
}
```

---

## 11. Gestion des résultats partiels

Si le solver ne peut pas placer toutes les séances (timeout ou INFEASIBLE partiel) :

| Statut | Description | Action UI |
|--------|-------------|-----------|
| `OPTIMAL` | Toutes séances placées, optimum prouvé | ✅ Transition `edition` autorisée |
| `FEASIBLE` | Toutes séances placées, pas optimum prouvé | ✅ Transition `edition` autorisée |
| `PARTIAL` | X% séances placées, Y `NON_PLACÉE` | ⚠️ Avertissement, transition `edition` possible avec confirmation |
| `INFEASIBLE` | Aucune solution (conflits HARD) | ❌ Blocage, retour erreurs détaillées |
| `TIMEOUT` | Temps écoulé, meilleure solution trouvée | ⚠️ Comme `PARTIAL` si séances placées |

> **Règle** : Une version ne peut passer en `valid_pedag` que si **couverture = 100%** (règle `RB-UI-06` dans `UI_WIREFRAMES.md`).

---

## 12. Extensibilité (Ajout de nouvelles contraintes)

### 12.1 Processus d'ajout

1. **Spécification** : Ajouter entrée dans ce document (nouveau code `SC-XXX-XX` ou `HC-XXX-XX`)
2. **Modèle** : Étendre `Constraint` type dans `SPEC_SOLVER_CPSAT.md` §3.1
3. **Backend** : Ajouter mapping dans `GenerationConstraintMapper`
4. **Solver** : Implémenter contrainte CP-SAT dans `cp_sat_model.py`
5. **Frontend** : Ajouter champ dans `EC-GES-03` + validation
6. **Tests** : Cas de test unitaire + E2E

### 12.2 Nommage des nouveaux codes

| Préfixe | Signification |
|---------|---------------|
| `HC-` | Hard Constraint (poids 100) |
| `SC-` | Soft Constraint (poids 1-99) |
| `PRE-` | Pre-flight check |
| `RES-` | Resource conflict |
| `LOCK-` | Lock type |
| `UNAV-` | Unavailability |
| `ROOM-` | Room requirement |
| `PREF-` | Teacher preference |
| `CONT-` | Continuity/compactness |
| `LOAD-` | Load balancing |
| `PED-` | Pedagogical |
| `STR-` | Structural |

---

## 13. Références croisées

| Document | Sections pertinentes |
|----------|---------------------|
| `SPEC_SOLVER_CPSAT.md` | §3 (JSON Schema), §4 (Types TS), §7 (Modèle Python) |
| `SF_TAKT.md` | §7 (Planification & Génération), §8 (Verrous), §9 (Validation) |
| `WORKFLOW_METIER.md` | §3 (Transitions), §7 (Charge horaire), §8 (Verrous) |
| `ST_TAKT.md` | §2 (Modèle de données), §3 (Contraintes SQL) |
| `UI_INTERACTIONS.md` | Drag&drop, verrous, conflits, feedback |
| `UI_WIREFRAMES.md` | `EC-GES-03` (Config contraintes), `EC-GES-04` (Génération) |

---

## 14. Checklist de validation (Definition of Done contrainte)

Pour chaque nouvelle contrainte ajoutée :

- [ ] Code unique attribué (`HC-XXX-XX` ou `SC-XXX-XX`)
- [ ] Description métier claire (français)
- [ ] Type CP-SAT identifié (Hard/Soft, portée, variable)
- [ ] Mapping JSON `value` documenté avec exemple
- [ ] Poids par défaut défini (si SOFT)
- [ ] Configurable via `Configuration` table (si applicable)
- [ ] Implémentée dans `cp_sat_model.py` (solver)
- [ ] Mappée dans `GenerationConstraintMapper` (backend)
- [ ] Affichée/éditable dans `EC-GES-03` (frontend)
- [ ] Test unitaire solver (cas positif + négatif)
- [ ] Test E2E génération avec cette contrainte
- [ ] Documentation utilisateur mise à jour

---

*Fin du SPEC_CONTRAINTES_GENERATION.md — TAKT v1.0*