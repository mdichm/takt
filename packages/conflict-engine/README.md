# @takt/conflict-engine — Moteur de conflits de planning

Package **pur** (aucune dépendance I/O, base de données, réseau) implémentant la détection des conflits de séances sur la grille hebdomadaire pour TAKT.
Conforme aux exigences : `EX-EDI-02`, `ST_TAKT §4.3`, `HC-RES-01` à `HC-RES-03`, `HC-ROOM-01` à `HC-ROOM-03`, `SC-LOAD-01`, `SC-LOAD-02`, `TE-TEST-02`.

## Installation

```bash
pnpm add @takt/conflict-engine
```

## API principale

```typescript
import { detectConflicts, type SeanceAAnalyser, type ContexteConflits, type Conflit } from '@takt/conflict-engine';

const seance: SeanceAAnalyser = {
  id: 's1',
  versionId: 'v1',
  jour: new Date('2026-01-12T00:00:00Z'),
  creneauDebutId: 'creneau-8h',
  nbCreneaux: 2,
  salleId: 'salle-101',
  enseignantId: 'ens-dupont',
  groupeId: 'groupe-L3',
  activite: 'CM',
};

const contexte: ContexteConflits = {
  seancesConcurrentes: [],
  salle: { id: 'salle-101', capacite: 30, equipements: [] },
  groupe: { id: 'groupe-L3', effectif: 30 },
  enseignant: { id: 'ens-dupont' },
  contraintesIndisponibilite: [],
  verrous: [],
  reglesPedagogiques: [],
  pauses: [],
  creneauxOrdonnees: ['creneau-8h', 'creneau-9h', 'creneau-10h'],
  pasDeTempsMinutes: 60,
  margeCapacite: 1.1,
};

const conflits: Conflit[] = detectConflicts(seance, contexte);
if (conflits.some((c) => c.severite === 'BLOQUANT')) {
  // ⇒ HTTP 409 avec la liste complète des conflits
}
```

### `detectConflicts(seance, contexte)` — Point d'entrée unique

Retourne une liste de conflits `[{ type, severite, message, details }]`, un par type au plus, triée de manière déterministe (par type, puis par message).

| Type | Sévérité par défaut | Règle source | Signification |
|------|---------------------|--------------|---------------|
| `ENSEIGNANT` | `BLOQUANT` | `HC-RES-01` | Enseignant déjà placé sur un créneau chevauchant |
| `GROUPE` | `BLOQUANT` | `HC-RES-03` | Groupe déjà placé sur un créneau chevauchant |
| `SALLE` | `BLOQUANT` | `HC-RES-02` | Salle déjà occupée sur un créneau chevauchant |
| `CAPACITE` | `BLOQUANT` | `HC-ROOM-02` | Capacité salle < effectif groupe × marge (défaut 10 %) |
| `EQUIPEMENT` | `AVERTISSEMENT` | — | Équipement requis manquant dans la salle |
| `COMPATIBILITE` | `AVERTISSEMENT` | — | Type de salle incompatible avec l'activité |
| `INDISPONIBILITE` | `BLOQUANT` | — | Salle / enseignant / groupe indisponible sur le créneau |
| `PAUSE` | `AVERTISSEMENT` | — | Séance sur une période de pause |
| `REGLE_PEDAGOGIQUE` | `INFORMATION` (selon règle) | — | Règle pédagogique non respectée |
| `VERROU` | `BLOQUANT` | `HC-LOCK-01 à 04` | Séance viole un verrou posé |
| `COVOITURAGE` | `INFORMATION` | — | Préférence covoiturage non satisfaite |
| `VOEU` | `AVERTISSEMENT` | — | Vœu de placement non respecté |
| `DONNEE_MANQUANTE` | `AVERTISSEMENT` | — | Donnée requise absente (ex: pas d'effectif → pas de contrôle capacité) |

Un conflit `BLOQUANT` interdit la soumission de la séance (retour HTTP **409** avec la liste complète des conflits).

### Helpers exportés

- `aConflitBloquant(conflits)` : vrai si au moins un conflit est bloquant.
- `severiteParDefaut(type)` : sévérité associée par défaut à un type.
- `LISTE_TYPES_CONFLIT` : les 13 codes de type supportés.

## Position dans le workflow TAKT

Le moteur est consommé par :
- **L06-05** : détection des conflits avant écriture d'une séance (POST / PUT / PATCH `/api/v1/seances`)
- **L06-09** : pré-contrôles avant génération / validation / publication

## Tests

```bash
pnpm --filter @takt/conflict-engine test
```

Couverture exigée : **100 % des branches** (service critique, TE-TEST-02).

## Développement

```bash
# Build
pnpm --filter @takt/conflict-engine build

# Lint
pnpm --filter @takt/conflict-engine lint

# Typecheck
pnpm --filter @takt/conflict-engine typecheck
```

## Licence

AGPL-3.0-only. Voir LICENCE_AGPL.md à la racine du dépôt.
