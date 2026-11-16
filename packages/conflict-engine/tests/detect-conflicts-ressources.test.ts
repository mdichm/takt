// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { detectConflicts, aConflitBloquant } from '../src/detect-conflicts';
import type { SeanceAAnalyser, ContexteConflits } from '../src/types';

function baseSeance(overrides: Partial<SeanceAAnalyser> = {}): SeanceAAnalyser {
  return {
    id: 's1',
    versionId: 'v1',
    jour: new Date('2026-01-12T00:00:00Z'),
    creneauDebutId: 'creneau-8h',
    nbCreneaux: 1,
    salleId: 'salle-101',
    enseignantId: 'ens-dupont',
    groupeId: 'groupe-L3',
    activite: 'CM',
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

// Séance concurrente sur le même jour/créneau, mais avec TOUTES les ressources différentes
// de la cible, pour isoler le champ sous test.
function seanceConcurrente(overrides: Record<string, unknown> = {}) {
  return {
    id: 's2',
    jour: new Date('2026-01-12T00:00:00Z'),
    creneauDebutId: 'creneau-8h',
    nbCreneaux: 1,
    salleId: 'salle-autre',
    enseignantId: 'ens-autre',
    groupeId: 'groupe-autre',
    ...overrides,
  };
}

describe('detectConflicts — ENSEIGNANT (BLOQUANT)', () => {
  it('détecte un enseignant déjà placé sur le même créneau', () => {
    const seance = baseSeance({ enseignantId: 'ens-dupont' });
    const contexte = baseContexte({
      seancesConcurrentes: [seanceConcurrente({ enseignantId: 'ens-dupont' })],
    });
    const conflits = detectConflicts(seance, contexte);
    expect(conflits).toHaveLength(1);
    expect(conflits[0].type).toBe('ENSEIGNANT');
    expect(conflits[0].severite).toBe('BLOQUANT');
    expect(aConflitBloquant(conflits)).toBe(true);
  });

  it('ne détecte rien si l\'enseignant est différent', () => {
    const seance = baseSeance({ enseignantId: 'ens-dupont' });
    const contexte = baseContexte({
      seancesConcurrentes: [seanceConcurrente({ enseignantId: 'ens-autre' })],
    });
    expect(detectConflicts(seance, contexte)).toEqual([]);
  });

  it('ne détecte rien sur un jour différent', () => {
    const seance = baseSeance({ enseignantId: 'ens-dupont' });
    const contexte = baseContexte({
      seancesConcurrentes: [
        seanceConcurrente({
          enseignantId: 'ens-dupont',
          jour: new Date('2026-01-13T00:00:00Z'),
        }),
      ],
    });
    expect(detectConflicts(seance, contexte)).toEqual([]);
  });
});

describe('detectConflicts — GROUPE (BLOQUANT)', () => {
  it('détecte un groupe déjà placé sur le même créneau', () => {
    const seance = baseSeance({ groupeId: 'groupe-L3' });
    const contexte = baseContexte({
      seancesConcurrentes: [seanceConcurrente({ groupeId: 'groupe-L3' })],
    });
    const conflits = detectConflicts(seance, contexte);
    expect(conflits).toHaveLength(1);
    expect(conflits[0].type).toBe('GROUPE');
    expect(conflits[0].severite).toBe('BLOQUANT');
  });

  it('ne détecte rien si le groupe est différent', () => {
    const seance = baseSeance({ groupeId: 'groupe-L3' });
    const contexte = baseContexte({
      seancesConcurrentes: [seanceConcurrente({ groupeId: 'groupe-autre' })],
    });
    expect(detectConflicts(seance, contexte)).toEqual([]);
  });
});

describe('detectConflicts — SALLE (BLOQUANT)', () => {
  it('détecte une salle déjà occupée sur le même créneau', () => {
    const seance = baseSeance({ salleId: 'salle-101' });
    const contexte = baseContexte({
      seancesConcurrentes: [seanceConcurrente({ salleId: 'salle-101' })],
    });
    const conflits = detectConflicts(seance, contexte);
    expect(conflits).toHaveLength(1);
    expect(conflits[0].type).toBe('SALLE');
    expect(conflits[0].severite).toBe('BLOQUANT');
  });

  it('ne détecte rien si la salle est différente', () => {
    const seance = baseSeance({ salleId: 'salle-101' });
    const contexte = baseContexte({
      seancesConcurrentes: [seanceConcurrente({ salleId: 'salle-autre' })],
    });
    expect(detectConflicts(seance, contexte)).toEqual([]);
  });
});
