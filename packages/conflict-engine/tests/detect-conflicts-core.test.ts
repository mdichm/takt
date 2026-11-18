// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import {
  detectConflicts,
  aConflitBloquant,
  LISTE_TYPES_CONFLIT,
  severiteParDefaut,
} from '../src/detect-conflicts';
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

describe('LISTE_TYPES_CONFLIT', () => {
  it('contient les 13 types de conflit', () => {
    expect(LISTE_TYPES_CONFLIT).toHaveLength(13);
  });

  it('ne contient pas de doublon', () => {
    expect(new Set(LISTE_TYPES_CONFLIT).size).toBe(LISTE_TYPES_CONFLIT.length);
  });
});

describe('severiteParDefaut', () => {
  it('retourne BLOQUANT pour ENSEIGNANT', () => {
    expect(severiteParDefaut('ENSEIGNANT')).toBe('BLOQUANT');
  });

  it('retourne AVERTISSEMENT pour EQUIPEMENT', () => {
    expect(severiteParDefaut('EQUIPEMENT')).toBe('AVERTISSEMENT');
  });

  it('retourne INFORMATION pour COVOITURAGE', () => {
    expect(severiteParDefaut('COVOITURAGE')).toBe('INFORMATION');
  });
});

describe('aConflitBloquant', () => {
  it('retourne false sur une liste vide', () => {
    expect(aConflitBloquant([])).toBe(false);
  });

  it('retourne false si aucun conflit n\'est bloquant', () => {
    expect(
      aConflitBloquant([
        { type: 'EQUIPEMENT', severite: 'AVERTISSEMENT', message: 'm', details: {} },
      ]),
    ).toBe(false);
  });

  it('retourne true si au moins un conflit est bloquant', () => {
    expect(
      aConflitBloquant([
        { type: 'ENSEIGNANT', severite: 'BLOQUANT', message: 'm', details: {} },
        { type: 'EQUIPEMENT', severite: 'AVERTISSEMENT', message: 'm2', details: {} },
      ]),
    ).toBe(true);
  });
});

describe('detectConflicts — aucun conflit', () => {
  it('retourne une liste vide quand tout est cohérent', () => {
    expect(detectConflicts(baseSeance(), baseContexte())).toEqual([]);
  });

  it('retourne une liste vide quand les champs optionnels sont absents', () => {
    const seance = baseSeance({
      equipementsRequises: undefined,
    });
    const contexte = baseContexte({
      salle: undefined,
      groupe: { id: 'groupe-L3' },
      enseignant: undefined,
      equipementsRequises: undefined,
    });
    expect(detectConflicts(seance, contexte)).toEqual([]);
  });
});
