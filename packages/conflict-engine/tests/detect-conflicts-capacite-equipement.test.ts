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

describe('CAPACITE', () => {
  it('détecte une capacité insuffisante (marge 10 %)', () => {
    const seance = baseSeance({ salleId: 'salle-101', groupeId: 'groupe-L3' });
    const contexte = baseContexte({
      salle: { id: 'salle-101', capacite: 30, equipements: [] },
      groupe: { id: 'groupe-L3', effectif: 30 },
    });
    const conflits = detectConflicts(seance, contexte);
    expect(conflits).toHaveLength(1);
    expect(conflits[0].type).toBe('CAPACITE');
    expect(conflits[0].severite).toBe('BLOQUANT');
  });

  it('ne détecte pas de conflit si la capacité est suffisante', () => {
    const seance = baseSeance({ salleId: 'salle-101', groupeId: 'groupe-L3' });
    const contexte = baseContexte({
      salle: { id: 'salle-101', capacite: 40, equipements: [] },
      groupe: { id: 'groupe-L3', effectif: 30 },
    });
    expect(
      detectConflicts(seance, contexte).some((c) => c.type === 'CAPACITE'),
    ).toBe(false);
  });

  it('ne détecte pas de conflit de capacité si l\'effectif est inconnu', () => {
    const seance = baseSeance({ salleId: 'salle-101', groupeId: 'groupe-L3' });
    const contexte = baseContexte({
      salle: { id: 'salle-101', capacite: 10, equipements: [] },
      groupe: { id: 'groupe-L3' },
    });
    expect(
      detectConflicts(seance, contexte).some((c) => c.type === 'CAPACITE'),
    ).toBe(false);
  });
});

describe('EQUIPEMENT', () => {
  it('détecte un équipement manquant', () => {
    const seance = baseSeance({
      salleId: 'salle-101',
      equipementsRequises: ['video-projecteur', 'tableau'],
    });
    const contexte = baseContexte({
      salle: { id: 'salle-101', capacite: 40, equipements: ['tableau'] },
    });
    const conflits = detectConflicts(seance, contexte);
    expect(conflits).toHaveLength(1);
    expect(conflits[0].type).toBe('EQUIPEMENT');
    expect(conflits[0].severite).toBe('AVERTISSEMENT');
  });

  it('ne détecte rien si tous les équipements sont présents', () => {
    const seance = baseSeance({
      salleId: 'salle-101',
      equipementsRequises: ['tableau'],
    });
    const contexte = baseContexte({
      salle: { id: 'salle-101', capacite: 40, equipements: ['tableau'] },
    });
    expect(
      detectConflicts(seance, contexte).some((c) => c.type === 'EQUIPEMENT'),
    ).toBe(false);
  });
});
