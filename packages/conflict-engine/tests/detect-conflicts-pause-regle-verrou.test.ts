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

describe('PAUSE', () => {
  it('détecte un chevauchement avec une pause', () => {
    const seance = baseSeance({ creneauDebutId: 'creneau-9h' });
    const contexte = baseContexte({
      pauses: [{ nom: 'Pause midi', creneaux: ['creneau-9h', 'creneau-10h'] }],
    });
    const conflits = detectConflicts(seance, contexte);
    expect(conflits).toHaveLength(1);
    expect(conflits[0].type).toBe('PAUSE');
    expect(conflits[0].severite).toBe('AVERTISSEMENT');
  });

  it('ne détecte rien hors pause', () => {
    const seance = baseSeance({ creneauDebutId: 'creneau-8h' });
    const contexte = baseContexte({
      pauses: [{ nom: 'Pause midi', creneaux: ['creneau-9h', 'creneau-10h'] }],
    });
    expect(detectConflicts(seance, contexte).some((c) => c.type === 'PAUSE')).toBe(false);
  });
});

describe('REGLE_PEDAGOGIQUE', () => {
  it('émet un conflit avec la sévérité de la règle non respectée', () => {
    const seance = baseSeance();
    const contexte = baseContexte({
      reglesPedagogiques: [
        {
          id: 'r1',
          libelle: 'Pas le lundi matin',
          severite: 'AVERTISSEMENT',
          estRespectee: false,
        },
      ],
    });
    const conflits = detectConflicts(seance, contexte);
    expect(conflits).toHaveLength(1);
    expect(conflits[0].type).toBe('REGLE_PEDAGOGIQUE');
    expect(conflits[0].severite).toBe('AVERTISSEMENT');
  });

  it('ne détecte rien si toutes les règles sont respectées', () => {
    const seance = baseSeance();
    const contexte = baseContexte({
      reglesPedagogiques: [
        { id: 'r1', libelle: 'Règle', severite: 'BLOQUANT', estRespectee: true },
      ],
    });
    expect(
      detectConflicts(seance, contexte).some((c) => c.type === 'REGLE_PEDAGOGIQUE'),
    ).toBe(false);
  });
});

describe('VERROU', () => {
  it('détecte une violation de verrou sur le créneau', () => {
    const seance = baseSeance({ creneauDebutId: 'creneau-9h' });
    const contexte = baseContexte({
      verrous: [{ id: 'vr1', seanceId: 's1', type: 'CRENEAU', valeur: 'creneau-8h', poids: 100 }],
    });
    const conflits = detectConflicts(seance, contexte);
    expect(conflits).toHaveLength(1);
    expect(conflits[0].type).toBe('VERROU');
    expect(conflits[0].severite).toBe('BLOQUANT');
  });

  it('ne détecte rien si le verrou est respecté', () => {
    const seance = baseSeance({ creneauDebutId: 'creneau-8h' });
    const contexte = baseContexte({
      verrous: [{ id: 'vr1', seanceId: 's1', type: 'CRENEAU', valeur: 'creneau-8h', poids: 100 }],
    });
    expect(detectConflicts(seance, contexte).some((c) => c.type === 'VERROU')).toBe(false);
  });
});
