# Worker CP-SAT — solveur de planification TAKT

Worker Dockerisé (Python 3.11 + OR-Tools CP-SAT) qui produit des scénarios de
placement d'activités pédagogiques à partir d'un fichier dérivé
``DerivedFile`` (contrat ``@takt/contracts``).

Conforme à ``SPEC_SOLVER_CPSAT §7``. Ce worker est **agnostique de la base de
données** : il ne lit aucune variable ``DATABASE_URL`` et ne reçoit qu'un fichier
dérivé JSON (GG-10, GG-16).

## 1. Exécution CLI

### Sous-processus local

```bash
python -m solver.cp_sat_model \
    --input derived.json \
    --output scenarios/ \
    --max-scenarios 3 \
    --time-limit 300
```

### Via Docker

```bash
# Build (depuis la racine du repo)
docker build -f solver/Dockerfile -t takt/solver-worker .

# Lancement
docker run --rm \
    -v $(pwd)/derived.json:/app/input/derived.json:ro \
    -v $(pwd)/scenarios:/app/output \
    takt/solver-worker \
    --input /app/input/derived.json \
    --output /app/output \
    --max-scenarios 3 \
    --time-limit 300
```

### Variables d'environnement (replis des arguments CLI)

| Variable | Défaut | Rôle |
|----------|--------|------|
| `DERIVED_FILE_PATH` | — | Chemin du fichier dérivé JSON d'entrée |
| `OUTPUT_PATH` | — | Chemin de sortie (fichier `.json` ou répertoire) |
| `MAX_SCENARIOS` | `3` | Nombre maximal de scénarios produits |
| `TIMEOUT_SEC` | `300` | Limite de temps de résolution (secondes) |

Aucune variable ``DATABASE_URL`` n'est lue (GG-10, GG-16).

### Contrat d'entrée/sortie

**Entrée (stdin ou fichier)** : objet JSON conforme au schéma ``zDerivedFile``
(``packages/contracts/src/solver.ts``).

**Sortie (stdout)** : enveloppe JSON unique, seule chose lue par
``SolverClient`` (``packages/solver-client``) :

```json
{
  "scenarios": [ { ... SolverScenario ... } ],
  "metrics": { "peakRssMb": 42.5 }
}
```


## 2. Contrat entrée/sortie détaillé

### Entrée : `DerivedFile` (schéma `zDerivedFile`)

| Champ | Type | Description |
|-------|------|-------------|
| `metadata` | objet | `generationId`, `versionId`, `semestre`, `createdAt`, `timeSlotMinutes=30`, `days=6`, `slotsPerDay=24` |
| `timeGrid` | objet | `totalSlots=144`, `slotDurationMinutes=30`, `dayLabels[6]`, `slotLabels[24]` |
| `rooms[]` | objet | `id`, `code`, `type` (AMPHI/TD/TP/INFO), `capacity`, `building`, `equipment[]` |
| `teachers[]` | objet | `id`, `code`, `name`, `departmentId`, `maxHoursPerWeek`, `unavailableSlots[]` |
| `groups[]` | objet | `id`, `code`, `size`, `departmentId` |
| `subjects[]` | objet | `id`, `code`, `name`, `departmentId`, `teachingType`, `chargeCoefficient` |
| `activities[]` | objet | `id`, `subjectId`, `teacherIds[]`, `groupIds[]`, `roomType`, `durationSlots`, `weeklyVolume`, `teachingType` |
| `constraints[]` | objet | `id`, `type`, `category` (HARD/SOFT), `scope`, `targetId`, `value`, `weight` (1-100), `isActive`, `source`, `createdBy`, `createdAt` |
| `locks[]` | objet | `id`, `activityId`, `lockType` (TIMESLOT/ROOM/TEACHER/ACTIVITY), `value`, `poids` (1-100) |

### Sortie : `SolverOutput` (schéma `zSolverOutput`)

| Champ | Type | Description |
|-------|------|-------------|
| `scenarios[]` | tableau (max 3) | `SolverScenario` (voir ci-dessous) |
| `metrics` | objet optionnel | `{ peakRssMb: nombre }` |

### `SolverScenario`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant du scénario |
| `generationId` | UUID | Identifiant de la génération |
| `score` | entier 0-100 | Score global pondéré |
| `subScores` | objet | `coverage`, `timeslotRespect`, `roomRespect`, `teacherRespect`, `continuity`, `loadBalance` (chacun 0-100) |
| `placements[]` | objet | `activityId`, `day` (0-5), `slot` (0-23), `roomId`, `teacherId` |
| `unplacedActivities[]` | UUID | Activités non complètement placées |
| `status` | enum | `OPTIMAL`, `FEASIBLE`, `PARTIAL`, `INFEASIBLE`, `TIMEOUT` |
| `createdAt` | ISO-8601 | Horodatage de production |


## 3. Encodage du modèle CP-SAT

Pour chaque couple **(activité × jour × salle candidate)** le modèle crée :

* une variable de présence booléenne `presence[a][d][r]` ;
* un `OptionalIntervalVar` dont le `start` est le créneau de début et la taille
  `durationSlots`.

L'identifiant du placement est donc le quadruplet **(activité, jour, créneau,
salle)** exigé par le livrable, sans explosion en O(activités × 144 × salles).

## 4. Contraintes dures (HC)

| ID | Règle | Mécanisme CP-SAT |
|----|-------|------------------|
| HC-STR-04 | Volume hebdomadaire exact, 1 occurrence max / jour | `sum(presence) == weeklyVolume` ; `<= 1` par jour |
| HC-RES-01 | Pas deux activités dans la même salle en même temps | `AddNoOverlap` par salle |
| HC-RES-02 | Pas deux activités du même enseignant en même temps | `AddNoOverlap` par enseignant |
| HC-RES-03 | Pas deux activités du même groupe en même temps | `AddNoOverlap` par groupe |
| HC-UNAV | Indisponibilités enseignants | Intervalle fixe de durée 1 + `AddNoOverlap` |
| HC-ROOM | Salle compatible (type, capacité, équipement) | Filtrage des salles candidates |
| HC-LOCK | Verrous TIMESLOT / ROOM | `start == slot` forcé ; salles interdites |

## 5. Tableau des sous-scores (SC)

Chaque sous-score est noté sur 100. Le score global est la moyenne pondérée.

| Sous-score | Poids | Définition (v1) |
|------------|-------|-----------------|
| `coverage` | 25 | % d'occurrences placées / total attendu (`weeklyVolume`) |
| `timeslotRespect` | 20 | % de préférences de créneaux (TEACHER_PREFERENCE) satisfaites |
| `roomRespect` | 20 | 100 (toutes les salles sont des candidates valides HC-ROOM) |
| `teacherRespect` | 15 | Idem `timeslotRespect` (cible = enseignant de la préférence) |
| `continuity` | 10 | 100 (bloc contigu garanti par `OptionalIntervalVar`) |
| `loadBalance` | 10 | `100 - (écart-type charge / moyenne charge) × 100` |

**Score global** = Σ (sous-score × poids) / 100, arrondi à l'entier, clampé [0-100].

## 6. Diversification des scénarios (3 scénarios)

Après chaque scénario trouvé, un *no-good cut* interdit de retrouver exactement le
même placement pour toutes les activités (somme des placements identiques <= N-1).
Le solveur est ainsi forcé à explorer une région différente de l'espace des
solutions, produisant jusqu'à 3 scénarios distincts.

## 7. Hypothèses et limitations (v1)

1. **Un enseignant par activité** : l'enseignant affecté est `teacherIds[0]`.
   Le choix multi-enseignants par activité est reporté (limitation connue).
2. **Une occurrence = un jour** : une activité occupe un bloc contigu sur un
   seul jour ; son volume hebdomadaire est le nombre de jours de placement.
3. **Verrous TEACHER / ACTIVITY** : ignorés avec avertissement (à implémenter
   dans un ticket ultérieur).
4. **Conflits enseignant** : calculés sur l'enseignant principal uniquement.

## 8. Intégration — 3 divergences documentaires (hors périmètre worker)

Lors de l'analyse (point d'attention clos), 3 divergences entre documents ont
été identifiées. Elles sont documentées ici pour traçabilité mais n'ont **pas**
été corrigées dans ce worker (hors périmètre TAKT-L07-04) :

1. **Emplacement du fichier de sortie** : `SPEC_SOLVER_CPSAT §5` décrit une
   écriture sur `OUTPUT_PATH` alors que le client `SolverClient` (TAKT-L07-02)
   lit la sortie sur **stdout**. Le worker implémente les deux (stdout + fichier)
   pour satisfaire les deux contrats.
2. **Statut `PARTIAL`** : le schéma `zSolverScenarioStatus` inclut `PARTIAL`, mais
   aucun document ne précise quand le passer. Le worker passe en `PARTIAL`
   quand des activités ne sont pas complètement placées.
3. **Champ `teacherId` dans le placement** : le schéma l'exige, mais le fichier
   dérivé fournit `teacherIds[]` (liste). Le worker prend `teacherIds[0]`
   (hypothèse v1, voir §7).

## 9. Tests

```bash
# Depuis la racine du repo
python3 -m pytest solver/tests -v
```

51 tests unitaires couvrent : chargement/validation du fichier dérivé,
construction du modèle, contraintes dures, résolution, sous-scores, assemblage
des scénarios, écriture stdout/fichiers, et CLI.

## 10. Docker

Image : `python:3.11-slim` + OR-Tools (`ortools>=9.14,<10`). Utilisateur
non-root `solver`. Entrypoint : `python -m solver.cp_sat_model`.

```bash
docker build -f solver/Dockerfile -t takt/solver-worker .
docker run --rm takt/solver-worker --help
```

Les logs du solveur CP-SAT sont écrits sur **stderr** (jamais sur stdout).
