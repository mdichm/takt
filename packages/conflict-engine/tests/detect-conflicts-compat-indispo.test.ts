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

describe('COMPATIBILITE', () => {
  it('détecte un type de salle incompatible', () => {
    const seance = baseSeance({ salleId: 'salle-101', activite: 'TP' });
    const contexte = baseContexte({
      salle: { id: 'salle-101', capacite: 40, typeSalleId: 'AMPHI', equipements: [] },
      typesSalleCompatibles: { TP: ['SALLE_TP', 'INFO'] },
    });
    const conflits = detectConflicts(seance, contexte);
    expect(conflits).toHaveLength(1);
    expect(conflits[0].type).toBe('COMPATIBILITE');
    expect(conflits[0].severite).toBe('AVERTISSEMENT');
  });

  it('ne détecte rien si le type de salle est compatible', () => {
    const seance = baseSeance({ salleId: 'salle-101', activite: 'TP' });
    const contexte = baseContexte({
      salle: { id: 'salle-101', capacite: 40, typeSalleId: 'SALLE_TP', equipements: [] },
      typesSalleCompatibles: { TP: ['SALLE_TP', 'INFO'] },
    });
    expect(
      detectConflicts(seance, contexte).some((c) => c.type === 'COMPATIBILITE'),
    ).toBe(false);
  });
});

describe('INDISPONIBILITE', () => {
  it('détecte une indisponibilité de l\'enseignant', () => {
    const seance = baseSeance({ enseignantId: 'ens-dupont' });
    const contexte = baseContexte({
      enseignant: {
        id: 'ens-dupont',
        indisponibilites: [new Date('2026-01-12T00:00:00Z')],
      },
    });
    const conflits = detectConflicts(seance, contexte);
    expect(conflits).toHaveLength(1);
    expect(conflits[0].type).toBe('INDISPONIBILITE');
    expect(conflits[0].severite).toBe('BLOQUANT');
  });

  it('détecte une contrainte d\'indisponibilité active sur la version', () => {
    const seance = baseSeance();
    const contexte = baseContexte({ contraintesIndisponibilite: ['contrainte-1'] });
    const conflits = detectConflicts(seance, contexte);
    expect(conflits).toHaveLength(1);
    expect(conflits[0].type).toBe('INDISPONIBILITE');
    expect(conflits[0].severite).toBe('BLOQUANT');
  });
});
