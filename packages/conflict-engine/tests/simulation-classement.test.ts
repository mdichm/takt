// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { classerAlternatives } from '../src/simulation/classement';
import type { AlternativeSimulee } from '../src/simulation/types';
import type { Conflit } from '../src/types';

function conflit(type: Conflit['type'], severite: Conflit['severite']): Conflit {
  return { type, severite, message: 'x', details: {} };
}

function alternative(
  score: number,
  sousScores: { continuite: number; heuresTardives: number; preferences: number },
  creneau: string,
  salle: string,
): AlternativeSimulee {
  return {
    candidat: { creneauDebutId: creneau, salleId: salle },
    conflitsResiduels: [],
    score,
    sousScores,
  };
}

describe('classerAlternatives', () => {
  it('trie par score décroissant', () => {
    const alts = [
      alternative(50, { continuite: 0, heuresTardives: 0, preferences: 0 }, 'c-2', 'salle-b'),
      alternative(100, { continuite: 0, heuresTardives: 0, preferences: 0 }, 'c-1', 'salle-a'),
    ];
    const res = classerAlternatives(alts);
    expect(res.map((a) => a.score)).toEqual([100, 50]);
  });

  it('trie par sous-scores pondérés en cas d\'égalité de score', () => {
    const alts = [
      alternative(80, { continuite: 100, heuresTardives: 0, preferences: 0 }, 'c-2', 'salle-b'),
      alternative(80, { continuite: 0, heuresTardives: 100, preferences: 0 }, 'c-1', 'salle-a'),
    ];
    // 30*100 + 40*0 + 20*0 = 3000  vs  30*0 + 40*100 + 20*0 = 4000 → c-1 en premier
    const res = classerAlternatives(alts);
    expect(res[0].candidat.creneauDebutId).toBe('c-1');
    expect(res[1].candidat.creneauDebutId).toBe('c-2');
  });

  it('applique le tie-break créneau asc, salle asc, id asc', () => {
    const alts = [
      alternative(100, { continuite: 0, heuresTardives: 0, preferences: 0 }, 'c-2', 'salle-a'),
      alternative(100, { continuite: 0, heuresTardives: 0, preferences: 0 }, 'c-1', 'salle-a'),
    ];
    const res = classerAlternatives(alts);
    expect(res[0].candidat.creneauDebutId).toBe('c-1');
    expect(res[1].candidat.creneauDebutId).toBe('c-2');
  });

  it('tie-break salleId asc quand tout le reste est égal', () => {
    const alts = [
      alternative(100, { continuite: 0, heuresTardives: 0, preferences: 0 }, 'c-1', 'salle-b'),
      alternative(100, { continuite: 0, heuresTardives: 0, preferences: 0 }, 'c-1', 'salle-a'),
    ];
    const res = classerAlternatives(alts);
    expect(res[0].candidat.salleId).toBe('salle-a');
    expect(res[1].candidat.salleId).toBe('salle-b');
  });

  it('départage par sous-scores quand scores égaux', () => {
    const alts = [
      alternative(80, { continuite: 0, heuresTardives: 0, preferences: 100 }, 'c-2', 'salle-a'),
      alternative(80, { continuite: 0, heuresTardives: 100, preferences: 0 }, 'c-1', 'salle-a'),
    ];
    // 30*0+40*0+20*100 = 2000  vs  30*0+40*100+20*0 = 4000 → c-1 (heuresTardives) premier
    const res = classerAlternatives(alts);
    expect(res[0].candidat.creneauDebutId).toBe('c-1');
  });

  it('limite à 20 alternatives maximum', () => {
    const alts = Array.from({ length: 25 }, (_, i) =>
      alternative(100, { continuite: 0, heuresTardives: 0, preferences: 0 }, `c-${i % 4}`, `salle-${i % 3}`),
    );
    const res = classerAlternatives(alts);
    expect(res).toHaveLength(20);
  });

  it('retourne une liste vide si aucune alternative', () => {
    expect(classerAlternatives([])).toEqual([]);
  });
});
