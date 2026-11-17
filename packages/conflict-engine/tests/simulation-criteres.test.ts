// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import {
  evaluerContinuite,
  evaluerHeuresTardives,
  evaluerPreferences,
} from '../src/simulation/criteres';
import type { Conflit } from '../src/types';

function conflit(type: Conflit['type'], severite: Conflit['severite']): Conflit {
  return { type, severite, message: 'x', details: {} };
}

const seanceVoisine = (enseignantId: string, groupeId: string, ordre: number) => ({
  id: 's-voisin',
  enseignantId,
  groupeId,
  ordre,
  jour: 1,
  creneauDebutId: `c-${ordre}`,
  nbCreneaux: 1,
});

describe('evaluerContinuite', () => {
  const base = {
    ordre: 5,
    enseignantId: 'ens-1',
    groupeId: 'groupe-1',
  };

  it('retourne 100 si adjacent à une séance du même enseignant', () => {
    const voisins = [
      seanceVoisine('ens-1', 'groupe-2', 4),
      seanceVoisine('ens-1', 'groupe-3', 6),
    ];
    expect(evaluerContinuite(base, voisins)).toBe(100);
  });

  it('retourne 50 si adjacent uniquement au même groupe', () => {
    const voisins = [seanceVoisine('ens-2', 'groupe-1', 4)];
    expect(evaluerContinuite(base, voisins)).toBe(50);
  });

  it('retourne 0 si aucun voisin', () => {
    expect(evaluerContinuite(base, [])).toBe(0);
  });

  it('retourne 0 si voisin d\'un autre enseignant et autre groupe', () => {
    const voisins = [seanceVoisine('ens-2', 'groupe-2', 4)];
    expect(evaluerContinuite(base, voisins)).toBe(0);
  });
});

describe('evaluerHeuresTardives', () => {
  const base = { creneauDebutId: 'c-10', dureeMinutes: 60 };

  const creerHeure = (hhmm: string) => `2026-01-12T${hhmm}:00Z`;

  it('retourne 100 si fin <= 18h', () => {
    expect(evaluerHeuresTardives({ ...base, heureFin: creerHeure('17:59') })).toBe(100);
    expect(evaluerHeuresTardives({ ...base, heureFin: creerHeure('18:00') })).toBe(100);
  });

  it('pénalise 2 points par minute après 18h, plancher 0', () => {
    // 18h30 → 30 min × 2 = 60 → 40
    expect(evaluerHeuresTardives({ ...base, heureFin: creerHeure('18:30') })).toBe(40);
    // 19h → 60 min × 2 = 120 → 0
    expect(evaluerHeuresTardives({ ...base, heureFin: creerHeure('19:00') })).toBe(0);
    // 22h → 240 min × 2 = 480 → 0
    expect(evaluerHeuresTardives({ ...base, heureFin: creerHeure('22:00') })).toBe(0);
  });
});

describe('evaluerPreferences', () => {
  const base = { enseignantId: 'ens-1' };

  it('retourne 100 sans conflit de préférence', () => {
    expect(evaluerPreferences(base, [])).toBe(100);
  });

  it('pénalise 50 par conflit VOEU', () => {
    expect(evaluerPreferences(base, [conflit('VOEU', 'AVERTISSEMENT')])).toBe(50);
    expect(
      evaluerPreferences(base, [
        conflit('VOEU', 'AVERTISSEMENT'),
        conflit('VOEU', 'AVERTISSEMENT'),
      ]),
    ).toBe(0);
  });

  it('pénalise 20 par conflit COVOITURAGE', () => {
    expect(evaluerPreferences(base, [conflit('COVOITURAGE', 'INFORMATION')])).toBe(80);
  });

  it('combine les pénalités, plancher 0', () => {
    expect(
      evaluerPreferences(base, [
        conflit('VOEU', 'AVERTISSEMENT'),
        conflit('COVOITURAGE', 'INFORMATION'),
        conflit('COVOITURAGE', 'INFORMATION'),
        conflit('COVOITURAGE', 'INFORMATION'),
      ]),
    ).toBe(0);
  });

  it('n\'pénalise pas les conflits hors VOEU/COVOITURAGE', () => {
    expect(
      evaluerPreferences(base, [conflit('SALLE', 'BLOQUANT'), conflit('ENSEIGNANT', 'AVERTISSEMENT')]),
    ).toBe(100);
  });

  it('retourne 100 pour une heureFin invalide (pas de HH:MM)', () => {
    expect(evaluerHeuresTardives({ ...base, heureFin: 'invalide' })).toBe(100);
  });
});
