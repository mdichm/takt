// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../src/detect-conflicts';
import { TYPES_CONFLIT } from '../src/types';
import type { SeanceAAnalyser, ContexteConflits } from '../src/types';

function baseSeance(overrides: Partial<SeanceAAnalyser> = {}): SeanceAAnalyser {
  return {
    id: 's1',
    versionId: 'v1',
    jour: new Date('2026-01-12T00:00:00Z'),
    creneauDebutId: 'creneau-9h',
    nbCreneaux: 1,
    salleId: undefined,
    enseignantId: undefined,
    groupeId: undefined,
    ...overrides,
  };
}

function baseContexte(overrides: Partial<ContexteConflits> = {}): ContexteConflits {
  return {
    seancesConcurrentes: [],
    salle: { id: 'salle-101', capacite: 40, equipements: [] },
    groupe: { id: 'groupe-L3', effectif: 30 },
    enseignant: { id: 'ens-dupont' },
    contraintesIndisponibilite: [],
    verrous: [],
    reglesPedagogiques: [],
    pauses: [],
    creneauxOrdonnees: ['creneau-8h', 'creneau-9h', 'creneau-10h'],
    pasDeTempsMinutes: 60,
    margeCapacite: 1.1,
    ...overrides,
  };
}

function seanceConcurrente(overrides: Record<string, unknown> = {}) {
  return {
    id: 's2',
    jour: new Date('2026-01-12T00:00:00Z'),
    creneauDebutId: 'creneau-8h',
    nbCreneaux: 1,
    salleId: 'salle-101',
    enseignantId: 'ens-dupont',
    groupeId: 'groupe-L3',
    ...overrides,
  };
}

describe('tri déterministe', () => {
  it('trie les conflits par type puis par message', () => {
    const seance = baseSeance();
    const contexte = baseContexte({
      seancesConcurrentes: [seanceConcurrente({ enseignantId: 'ens-dupont', salleId: 'salle-101', groupeId: 'groupe-L3' })],
      pauses: [{ nom: 'Pause midi', creneaux: ['creneau-9h'] }],
      voeux: { creneauxIndesirables: ['creneau-9h'] },
      contraintesIndisponibilite: ['c-1'],
    });
    const conflits = detectConflicts(seance, contexte);
    const ordre = new Map<string, number>();
    TYPES_CONFLIT.forEach((t, i) => ordre.set(t, i));
    const tries = [...conflits].sort(
      (a, b) => (ordre.get(a.type) ?? 99) - (ordre.get(b.type) ?? 99) || a.message.localeCompare(b.message),
    );
    expect(conflits.map((c) => c.type)).toEqual(tries.map((c) => c.type));
  });
});
