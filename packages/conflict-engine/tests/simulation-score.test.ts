// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { calculerScore, pondererConflits } from '../src/simulation/score';
import type { Conflit } from '../src/types';

function conflit(type: Conflit['type'], severite: Conflit['severite']): Conflit {
  return {
    type,
    severite,
    message: `conflit ${type}`,
    details: {},
  };
}

describe('pondererConflits', () => {
  it('retourne 0 pour une liste vide', () => {
    expect(pondererConflits([])).toBe(0);
  });

  it('pénalise un BLOQUANT à 100', () => {
    expect(pondererConflits([conflit('ENSEIGNANT', 'BLOQUANT')])).toBe(100);
  });

  it('pénalise un AVERTISSEMENT à 20', () => {
    expect(pondererConflits([conflit('EQUIPEMENT', 'AVERTISSEMENT')])).toBe(20);
  });

  it('ne pénalise pas un INFORMATION', () => {
    expect(pondererConflits([conflit('COVOITURAGE', 'INFORMATION')])).toBe(0);
  });

  it('somme les pénalités de plusieurs conflits', () => {
    expect(
      pondererConflits([
        conflit('ENSEIGNANT', 'BLOQUANT'),
        conflit('EQUIPEMENT', 'AVERTISSEMENT'),
        conflit('COVOITURAGE', 'INFORMATION'),
      ]),
    ).toBe(120);
  });
});

describe('calculerScore', () => {
  it('retourne 100 pour une pénalité nulle', () => {
    expect(calculerScore(0)).toBe(100);
  });

  it('retourne 0 pour une pénalité >= 100', () => {
    expect(calculerScore(100)).toBe(0);
    expect(calculerScore(120)).toBe(0);
    expect(calculerScore(999)).toBe(0);
  });

  it('décroît linéairement entre 0 et 100', () => {
    expect(calculerScore(20)).toBe(80);
    expect(calculerScore(50)).toBe(50);
    expect(calculerScore(80)).toBe(20);
  });

  it('est borné à 0', () => {
    expect(calculerScore(-5)).toBe(100);
    expect(calculerScore(-999)).toBe(100);
  });
});
