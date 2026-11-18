// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import {
  indexCreneau,
  intervalleSeance,
  intervallesSeChevauchent,
  seancesSeChevauchent,
} from '../src/helpers/creneaux';

const creneaux = ['creneau-8h', 'creneau-9h', 'creneau-10h', 'creneau-11h'];

describe('indexCreneau', () => {
  it('retourne l\'index du créneau présent', () => {
    expect(indexCreneau('creneau-9h', creneaux)).toBe(1);
  });

  it('retourne -1 si le créneau est inconnu', () => {
    expect(indexCreneau('creneau-inconnu', creneaux)).toBe(-1);
  });
});

describe('intervalleSeance', () => {
  it('calcule l\'intervalle occupé sur un créneau unique', () => {
    expect(intervalleSeance('creneau-9h', 1, creneaux)).toEqual({ debut: 1, fin: 1 });
  });

  it('calcule l\'intervalle sur plusieurs créneaux consécutifs', () => {
    expect(intervalleSeance('creneau-8h', 3, creneaux)).toEqual({ debut: 0, fin: 2 });
  });

  it('utilise au moins 1 créneau même si nbCreneaux est 0', () => {
    expect(intervalleSeance('creneau-8h', 0, creneaux)).toEqual({ debut: 0, fin: 0 });
  });

  it('retourne null si le créneau de début est inconnu', () => {
    expect(intervalleSeance('creneau-inconnu', 1, creneaux)).toBeNull();
  });
});

describe('intervallesSeChevauchent', () => {
  it('retourne true si les intervalles se chevauchent', () => {
    expect(intervallesSeChevauchent({ debut: 0, fin: 1 }, { debut: 1, fin: 2 })).toBe(true);
  });

  it('retourne true si un intervalle contient l\'autre', () => {
    expect(intervallesSeChevauchent({ debut: 0, fin: 2 }, { debut: 1, fin: 1 })).toBe(true);
  });

  it('retourne false si les intervalles sont disjoints', () => {
    expect(intervallesSeChevauchent({ debut: 0, fin: 0 }, { debut: 2, fin: 2 })).toBe(false);
  });
});

describe('seancesSeChevauchent', () => {
  const base = (creneauDebutId: string, nbCreneaux = 1) => ({
    jour: new Date('2026-01-12T00:00:00Z'),
    creneauDebutId,
    nbCreneaux,
  });

  it('retourne true pour deux séances sur le même créneau le même jour', () => {
    expect(seancesSeChevauchent(base('creneau-8h'), base('creneau-8h'), creneaux)).toBe(true);
  });

  it('retourne true pour deux séances sur des créneaux chevauchants', () => {
    expect(
      seancesSeChevauchent(base('creneau-8h', 2), base('creneau-9h', 1), creneaux),
    ).toBe(true);
  });

  it('retourne false pour deux séances sur des créneaux disjoints', () => {
    expect(seancesSeChevauchent(base('creneau-8h'), base('creneau-10h'), creneaux)).toBe(false);
  });

  it('retourne false pour deux séances sur des jours différents', () => {
    expect(
      seancesSeChevauchent(
        { ...base('creneau-8h'), jour: new Date('2026-01-12T00:00:00Z') },
        { ...base('creneau-8h'), jour: new Date('2026-01-13T00:00:00Z') },
        creneaux,
      ),
    ).toBe(false);
  });

  it('retourne false si un créneau de début est inconnu', () => {
    expect(seancesSeChevauchent(base('creneau-inconnu'), base('creneau-8h'), creneaux)).toBe(
      false,
    );
  });
});
