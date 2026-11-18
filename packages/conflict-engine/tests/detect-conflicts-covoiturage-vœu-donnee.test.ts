// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../src/detect-conflicts';
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

describe('COVOITURAGE', () => {
  it('détecte un covoiturage incompatible', () => {
    const seance = baseSeance();
    const contexte = baseContexte({ covoiturage: { actif: true, compatible: false } });
    const conflits = detectConflicts(seance, contexte);
    expect(conflits).toHaveLength(1);
    expect(conflits[0].type).toBe('COVOITURAGE');
    expect(conflits[0].severite).toBe('INFORMATION');
  });

  it('ne détecte rien si le covoiturage est compatible', () => {
    const seance = baseSeance();
    const contexte = baseContexte({ covoiturage: { actif: true, compatible: true } });
    expect(
      detectConflicts(seance, contexte).some((c) => c.type === 'COVOITURAGE'),
    ).toBe(false);
  });
});

describe('VŒU', () => {
  it('détecte un créneau indésirable', () => {
    const seance = baseSeance({ creneauDebutId: 'creneau-9h' });
    const contexte = baseContexte({ voeux: { creneauxIndesirables: ['creneau-9h'] } });
    const conflits = detectConflicts(seance, contexte);
    expect(conflits).toHaveLength(1);
    expect(conflits[0].type).toBe('VOEU');
    expect(conflits[0].severite).toBe('AVERTISSEMENT');
  });

  it('ne détecte rien si le créneau est souhaité', () => {
    const seance = baseSeance({ creneauDebutId: 'creneau-8h' });
    const contexte = baseContexte({ voeux: { creneauxIndesirables: ['creneau-9h'] } });
    expect(detectConflicts(seance, contexte).some((c) => c.type === 'VOEU')).toBe(false);
  });
});

describe('DONNEE_MANQUANTE', () => {
  it('détecte les champs manquants', () => {
    const seance = baseSeance({ salleId: undefined, enseignantId: undefined });
    const contexte = baseContexte();
    const conflits = detectConflicts(seance, contexte);
    expect(conflits).toHaveLength(1);
    expect(conflits[0].type).toBe('DONNEE_MANQUANTE');
    expect(conflits[0].severite).toBe('AVERTISSEMENT');
  });

  it('ne détecte rien si tout est renseigné', () => {
    expect(
      detectConflicts(baseSeance(), baseContexte()).some((c) => c.type === 'DONNEE_MANQUANTE'),
    ).toBe(false);
  });
});
