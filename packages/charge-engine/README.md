# @takt/charge-engine — Moteur de charge horaire

Package **pur** (aucune dépendance I/O, base de données, réseau) implémentant le calcul de charge horaire pour TAKT.
Conforme aux exigences : `EX-PRI-05`, `DL-07`, `ST_TAKT §0.2 B6`, `SC-LOAD-01/02/03`, `TE-TEST-02`.

## Installation

```bash
pnpm add @takt/charge-engine
```

## API principale

```typescript
import { computeCharge, type ChargeRuleSet, type AffectationCharge, type ResultatCalculCharge } from '@takt/charge-engine';

const ruleSet: ChargeRuleSet = { ... };
const affectations: AffectationCharge[] = [ ... ];

const resultat: ResultatCalculCharge = computeCharge(affectations, ruleSet);
```

### `ChargeRuleSet` — Jeu de règles versionné

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `string` | UUID unique |
| `code` | `string` | Code logique (ex: `CHARG-STD`) |
| `libelle` | `string` | Libellé humain |
| `version` | `number` | Numéro de version (incrémenté à chaque modification) |
| `estActive` | `boolean` | Version active (une seule par `code`) |
| `seuilAlerte` | `number` | Seuil d'alerte en % (ex: 90) |
| `plafondHebdomadaire` | `number` | Plafond en heures (dépassement = BLOQUANT) |
| `arrondi` | `'UNITAIRE' \| 'DEMI_JOURNEE' \| 'JOURNEE'` | Mode d'arrondi |
| `dureeJournee` | `number` | Durée d'une journée en heures (pour arrondi JOURNEE) |
| `dureeDemiJournee` | `number` | Durée d'une demi-journée en heures (pour arrondi DEMI_JOURNEE) |
| `coefficientsParTypeEnseignement` | `Record<string, number>` | Coefficients par code type (ex: `{ CM: 1.5, TD: 1 }`) |
| `cibleHebdomadaireParGrade` | `Record<string, number>` | Cible par code grade (ex: `{ MCF: 19, PR: 19 }`) |
| `toleranceEquilibrage` | `number` | Tolérance d'écart max-min intra-département (heures) |

### `AffectationCharge` — Entrée de calcul

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `string` | Identifiant de l'affectation |
| `enseignantId` | `string` | Identifiant de l'enseignant |
| `departementId` | `string` | Identifiant du département |
| `gradeCode?` | `string` | Code du grade (optionnel) |
| `typeEnseignementCode?` | `string` | Code du type d'enseignement (optionnel) |
| `volumeHebdo` | `number` | Volume horaire hebdomadaire brut |

### `ResultatCalculCharge` — Résultat

| Champ | Type | Description |
|-------|------|-------------|
| `parEnseignant` | `ChargeEnseignant[]` | Charge détaillée par enseignant |
| `parDepartement` | `ChargeDepartement[]` | Agrégats par département |
| `tauxDepassement` | `number` | % d'enseignants en dépassement de plafond |
| `ecartsEquilibrage` | `Array<{departementId, ecart, depasseTolerance}>` | Écarts d'équilibrage |
| `alertes` | `AlerteCharge[]` | Liste des alertes générées |

## Règles de calcul

1. **Coefficient** : `volumeHebdo × coefficient(typeEnseignementCode)` (défaut 1 si type absent/non mappé)
2. **Somme par enseignant** : somme des volumes pondérés
3. **Arrondi** : selon `arrondi` (UNITAIRE / DEMI_JOURNEE / JOURNEE), règle du demi-supérieur
4. **Cible** : `cibleHebdomadaireParGrade[gradeCode]` ou `plafondHebdomadaire` si grade non mappé
5. **Taux** : `chargeArrondie / cible × 100`
6. **Statut** :
   - `BLOQUANT` si `chargeArrondie > plafondHebdomadaire`
   - `AVERTISSEMENT` si `taux ≥ seuilAlerte` **et** `taux ≠ 100` (pas d'alerte à 100 % exact)
   - `CONFORME` sinon
7. **Équilibrage** : agrégation par département, calcul `max - min`, alerte si `écart > toleranceEquilibrage`

## Position dans le workflow TAKT

Le moteur est consommé par :
- **L05-04** : Validation de la répartition (`rep_pedag → brouillon`) → calcul + gel dans `Snapshot` (DL-07)
- **L06-09** : Contrôles avant génération / validation manuelle / publication

La charge devient **immuable** une fois la répartition validée (passage `rep_pedag → brouillon`).

## Tests

```bash
pnpm --filter @takt/charge-engine test
```

Couverture exigée : **100 % des branches** (service critique, TE-TEST-02).

## Développement

```bash
# Build
pnpm --filter @takt/charge-engine build

# Lint
pnpm --filter @takt/charge-engine lint

# Typecheck
pnpm --filter @takt/charge-engine typecheck
```