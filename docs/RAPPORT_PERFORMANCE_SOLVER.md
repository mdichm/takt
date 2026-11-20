# Rapport de performance du solveur CP-SAT (spike SPK-01)

**Ticket :** TAKT-L07-05 — Valider la performance du solveur (spike SPK-01)
**Lot :** L07 — Solveur CP-SAT
**Date :** 2026-11-20
**Statut :** Rapport final

---

## 1. Contexte et périmètre

Ce rapport présente les mesures de performance du solveur CP-SAT canonique
(`solver/model.py`, `solver/cp_sat_model.py`) pour les trois cas de benchmark
prescrits par [SPEC_SOLVER_CPSAT §8](../../SPEC_SOLVER_CPSAT.md) et la fiche
[TAKT-L07-05](../../BACKLOG_TAKT.md) : **200 / 1 000 / 4 000 séances**.

Une « séance » = 1 placement (occurrence) dans la grille hebdomadaire, unité
naturelle du solveur et de la mesure de SPEC §8.

Un cas complémentaire, **realistic-week** (~286 séances, lecture
SF_TAKT §2 : 4 000 séances/semestre sur 14 semaines ≈ 286 occurrences/semaine),
a été généré mais n'entre pas dans le verdict normatif.

## 2. Environnement

| Élément | Valeur |
|---------|--------|
| Processeur | Intel Core (voir `/proc/cpuinfo`) |
| Mémoire RAM | rapport `ru_maxrss` (Linux) |
| OS | Linux |
| Python | 3.11+ |
| OR-Tools | `ortools.sat.python.cp_model` |
## 3. Méthodologie

### 3.1 Générateur d'instances

Le générateur (`solver/benchmarks/generator.py`) produit des fichiers DerivedFile
déterministes (même graine → JSON identique) via `uuid.uuid5`. Volumétrie
conforme à SF_TAKT §2 :

- 400 enseignants, 150 salles (AMPHI/TD/TP/INFO), 10 départements
- Groupes ≈ 30 étudiants
- Mix : teachingType CM/TD/TP/PROJET, durationSlots 1–4, weeklyVolume 1–3
- Contraintes : indisponibilités enseignants (HARD), préférences (SOFT), verrous TIMESLOT
- Garde-fou de faisabilité : capacité totale (salles / enseignants / groupes)
  vérifiée avant résolution, pour mesurer une performance réelle et non un
  échec immédiat par infaisabilité.

### 3.2 Mesures

| Mesure | Source |
|--------|--------|
| `t_construction` | `TaktSolver.build_model()` |
| `t_resolution` | `TaktSolver.solve(max_scenarios, time_limit_sec)` |
| `t_total` | somme des deux |
| `peak_rss_mb` | `resource.getrusage(RUSAGE_SELF).ru_maxrss` (stdlib uniquement) |
| `nb_variables` | `len(model.Proto().variables)` |
| `nb_scenarios`, `status`, `coverage` | sortie du solveur |

### 3.3 Protocole

Chaque cas est exécuté avec sa limite de temps SPEC §8. Le code de sortie
`--enforce` est non-nul si un cas ne respecte pas ses seuils (utilisé en CI
avec `continue-on-error: true`).

## 4. Mesures brutes

### 4.1 Tableau récapitulatif

| Cas | Séances | Graine | t_construction (s) | t_resolution (s) | t_total (s) | Mémoire (Mo) | Variables | Scénarios | Couverture | Statut | Seuil SPEC §8 |
|-----|---------|--------|--------------------|------------------|-------------|--------------|-----------|-----------|------------|--------|---------------|
| `bench_200_seances` | 200 | 20261120 | 0,04 | 300,00 (timeout) | 300,04 | 147,59 | 10 200 | 0 | 0,0% | INFEASIBLE | < 300s |
| `bench_1000_seances` | 1 000 | 20261121 | 0,86 | 76,40 | 77,26 | 816,57 | 218 164 | 0 | 0,0% | INFEASIBLE | < 600s* |
| `bench_4000_seances` | 4 000 | 20261122 | 3,30 | >300 (interrompu) | >303 | n/d | 792 949 | n/d | n/d | n/d | < 1800s |

\* Le cas 1 000 n'a pas de seuil SPEC explicite ; l'objectif intermédiaire est
fixé à 10 min (600 s). Il est respecté en durée, mais le solveur ne retourne
aucun scénario (0 scénario, statut INFEASIBLE/UNKNOWN).

### 4.2 Évaluation contre les seuils

| Cas | Durée OK | Mémoire OK | Scénarios OK | Couverture OK | Cas conforme |
|-----|----------|------------|--------------|---------------|--------------|
| 200 séances | ❌ (300s ≥ 300s) | ✅ | ❌ (0) | ❌ (0%) | ❌ |
| 1 000 séances | ✅ (77s < 600s) | ✅ | ❌ (0) | ❌ (0%) | ❌ |
| 4 000 séances | ❌ (>300s, non terminé) | n/d | n/d | n/d | ❌ |

## 5. Analyse et points de contention

### 5.1 Construction du modèle

La construction du modèle est rapide pour tous les cas :
- 200 séances : 0,04s (10 200 variables)
- 1 000 séances : 0,86s (218 164 variables)
- 4 000 séances : 3,30s (792 949 variables)

La montée en puissance est linéaire (~200 variables par séance). La construction n'est
pas le goulot d'étranglement.

### 5.2 Résolution (CP-SAT)

La résolution est le point critique :

- **200 séances** : timeout à 300s (limite SPEC atteinte, pas de scénario retourné). Le solveur n'a trouvé aucune solution réalisable et n'a pas pu prouver l'infaisabilité dans le temps imparti.
- **1 000 séances** : résolution terminée en 76s mais sans scénario (0 scénario, statut INFEASIBLE/UNKNOWN rapporté). Le solveur a épuisé son temps ou retourné UNKNOWN.
- **4 000 séances** : la résolution n'a pas pu être mesurée (interrompue après 300s sans résultat).

### 5.3 Mémoire

La mémoire reste bien en dessous des seuils (147 Mo pour 200 séances, 817 Mo pour
1 000 séances, cible 4 096 Mo). Ce n'est pas un facteur limitant.

### 5.4 Points de contention identifiés dans `solver/model.py`

| Fichier:Ligne | Problème | Impact |
|---------------|----------|--------|
| `model.py:231-254` | `_add_hard_unavailability` reconstruit les intervalles de l'enseignant à chaque créneau indisponible → O(enseignants × créneaux × activités × salles) | Ralentit la construction sur les grandes instances |
| `model.py:548` / `model.py:299` | `_activity_by_id` / `_activity_index_by_id` : recherche linéaire, O(n²) | Ralentit les accès répétés par ID |
| `model.py:372` | `num_search_workers = 1` (déterminisme forcé) | Pas de parallélisation de la recherche |

## 6. Limites de l'étude

- Les instances générées sont déterministes mais peuvent être plus contraintes
  que des données réelles (garde-fou de capacité simplifié).
- Le cas 4 000 séances n'a pu être mesuré complètement (résolution interrompue
  après 300s sans résultat).
- Le statut "INFEASIBLE" peut masquer un "UNKNOWN" (timeout) car le solveur
  ne retourne aucun scénario dans les deux cas (voir `model.py:402-406`).
- Une seule graine par cas ; aucune analyse statistique sur plusieurs runs.

## 7. Recommandations

### 7.1 Seuils de repli

Compte tenu des mesures, les seuils SPEC §8 (< 5 min pour 200 séances, < 30 min
pour 4 000 séances) ne sont pas atteints. Seuils de repli recommandés :

| Cas | Seuil actuel (SPEC §8) | Seuil de repli recommandé |
|-----|------------------------|---------------------------|
| 200 séances | < 300 s | < 600 s (avec objectif < 300 s) |
| 4 000 séances | < 1 800 s | À réévaluer après optimisation du modèle |

### 7.2 Limite de séances par génération

Sur la base des mesures, le solveur ne peut pas traiter plus de ~200 séances
dans les temps cibles. **Recommandation : limiter à 200 séances par génération**
pour un usage interactif, avec une dégradation gracieuse (scénario partiel) au-
delà.

### 7.3 Stratégie de repli

1. **Décomposition par département** : générer séparément par département
   (≈ 200 séances / 10 départements = 20 séances par département), puis
   fusionner.
2. **Décomposition par semaine** : générer semaine par semaine (lecture
   realistic-week ≈ 286 séances/semaine) plutôt que le semestre en une fois.
3. **Mode dégradé** : retourner un scénario partiel (couverture cible 80-95%)
   plutôt qu'un échec complet.
4. **Parallélisation** : augmenter `num_search_workers` au-delà de 1 (perdre le
   déterminisme strict mais gagner en vitesse).

### 7.4 Corrections du modèle (à planifier)

- `model.py:231-254` : optimiser `_add_hard_unavailability` pour éviter la
  reconstruction répétée d'intervalles.
- `model.py:548` / `model.py:299` : remplacer les recherches linéaires par des
  dictionnaires d'index.
- `model.py:372` : évaluer l'impact de `num_search_workers > 1` sur les
  performances.

## 8. Verdict

**REJETÉ**

Aucun des trois cas prescrits (200 / 1 000 / 4 000 séances) n'atteint les seuils
de SPEC_SOLVER_CPSAT §8. Le solveur CP-SAT en l'état ne peut pas traiter
200 séances dans les 5 minutes cibles (timeout à 300s, aucun scénario
retourné). Le spike SPK-01 valide qu'une optimisation du modèle est nécessaire
avant de pouvoir proposer une génération de planning à grande échelle.

## 9. Reproductibilité

```bash
# Générer et exécuter le benchmark 200 séances
python3 solver/benchmarks/run.py --case 200 --format json

# Exécuter tous les cas (mode CI, non bloquant)
python3 solver/benchmarks/run.py --case all --enforce --format json

# Tests unitaires
python3 -m pytest solver/benchmarks/tests/ -q
```

Graines figées dans `solver/benchmarks/specs.py` :
- 200 séances : 20261120
- 1 000 séances : 20261121
- 4 000 séances : 20261122
- realistic-week : 20261123

Jeux de données versionnés : `solver/benchmarks/instances/manifest.json` +
`solver/benchmarks/instances/bench_200_seances.json`.

---

*Rapport généré dans le cadre du ticket TAKT-L07-05 (spike SPK-01).*

