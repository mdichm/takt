// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { computeCouverture } from '../src/couverte';
import type {
  AffectationCouverture,
  SeanceCouverture,
} from '../src/types';

const uneAffectation = (
  overrides: Partial<AffectationCouverture> = {},
): AffectationCouverture => ({
  id: 'a1',
  departementId: 'd1',
  volumeHebdo: 10,
  ...overrides,
});

const uneSeance = (
  overrides: Partial<SeanceCouverture> = {},
): SeanceCouverture => ({
  id: 's1',
  affectationId: 'a1',
  nbCreneaux: 1,
  dureeCreneauMinutes: 30,
  ...overrides,
});

describe('computeCouverture (TAKT-L06-09)', () => {
  it('retourne un résultat vide et conforme pour des entrées vides', () => {
    const result = computeCouverture([], []);

    expect(result.parAffectation).toEqual([]);
    expect(result.parDepartement).toEqual([]);
    expect(result.tauxGlobal).toBe(0);
    expect(result.estConforme).toBe(true);
    expect(result.seancesOrphelines).toEqual([]);
  });

  it('100 % : volume planifié == déclaré → CONFORME', () => {
    const result = computeCouverture(
      [uneAffectation()],
      [uneSeance({ nbCreneaux: 20 })],
    );

    expect(result.tauxGlobal).toBe(100);
    expect(result.estConforme).toBe(true);
    expect(result.parAffectation).toHaveLength(1);
    expect(result.parAffectation[0].statut).toBe('CONFORME');
    expect(result.parAffectation[0].taux).toBe(100);
    expect(result.parAffectation[0].volumeDeclareMinutes).toBe(600);
    expect(result.parAffectation[0].volumePlanifieMinutes).toBe(600);
    expect(result.seancesOrphelines).toEqual([]);
  });

  it('0 % : aucune séance planifiée → SOUS_PLANIFICATION', () => {
    const result = computeCouverture(
      [uneAffectation({ volumeHebdo: 10 })],
      [],
    );

    expect(result.tauxGlobal).toBe(0);
    expect(result.estConforme).toBe(false);
    expect(result.parAffectation[0].statut).toBe('SOUS_PLANIFICATION');
    expect(result.parAffectation[0].taux).toBe(0);
  });

  it('97 % : sous-planification → SOUS_PLANIFICATION (TE-MET-02)', () => {
    const result = computeCouverture(
      [uneAffectation({ id: 'a1', volumeHebdo: 100 })],
      [uneSeance({ id: 's1', affectationId: 'a1', nbCreneaux: 194 })],
    );

    expect(result.tauxGlobal).toBe(97);
    expect(result.estConforme).toBe(false);
    expect(result.parAffectation[0].statut).toBe('SOUS_PLANIFICATION');
    expect(result.parAffectation[0].taux).toBe(97);
  });
  it('105 % : sur-planification → SUR_PLANIFICATION (RB-UI-06)', () => {
    const result = computeCouverture(
      [uneAffectation({ id: 'a1', volumeHebdo: 100 })],
      [uneSeance({ id: 's1', affectationId: 'a1', nbCreneaux: 210 })],
    );

    expect(result.tauxGlobal).toBe(105);
    expect(result.estConforme).toBe(false);
    expect(result.parAffectation[0].statut).toBe('SUR_PLANIFICATION');
    expect(result.parAffectation[0].taux).toBe(105);
  });

  it('séance orpheline : bloquante, version non conforme', () => {
    const result = computeCouverture(
      [uneAffectation({ id: 'a1', volumeHebdo: 10 })],
      [uneSeance({ id: 's1', affectationId: 'a-inexistante', nbCreneaux: 20 })],
    );

    expect(result.estConforme).toBe(false);
    expect(result.seancesOrphelines).toEqual(['s1']);
    expect(result.parAffectation[0].statut).toBe('SOUS_PLANIFICATION');
    expect(result.parAffectation[0].taux).toBe(0);
  });

  it('volume déclaré nul et aucun planifié → CONFORME (cas défensif)', () => {
    const result = computeCouverture(
      [uneAffectation({ id: 'a1', volumeHebdo: 0 })],
      [],
    );

    expect(result.parAffectation[0].statut).toBe('CONFORME');
    expect(result.parAffectation[0].taux).toBe(0);
    expect(result.tauxGlobal).toBe(0);
    expect(result.estConforme).toBe(true);
  });

  it('volume déclaré nul mais séances planifiées → SUR_PLANIFICATION (cas défensif)', () => {
    const result = computeCouverture(
      [uneAffectation({ id: 'a1', volumeHebdo: 0 })],
      [uneSeance({ id: 's1', affectationId: 'a1', nbCreneaux: 5 })],
    );

    expect(result.parAffectation[0].statut).toBe('SUR_PLANIFICATION');
    expect(result.parAffectation[0].taux).toBe(0);
    expect(result.estConforme).toBe(false);
  });

  it('agrége par département et calcule le taux global', () => {
    const result = computeCouverture(
      [
        uneAffectation({ id: 'a1', departementId: 'd1', volumeHebdo: 10 }),
        uneAffectation({ id: 'a2', departementId: 'd2', volumeHebdo: 10 }),
      ],
      [
        uneSeance({ id: 's1', affectationId: 'a1', nbCreneaux: 20 }),
        uneSeance({ id: 's2', affectationId: 'a2', nbCreneaux: 10, dureeCreneauMinutes: 30 }),
      ],
    );

    expect(result.parDepartement).toHaveLength(2);
    const d1 = result.parDepartement.find((d) => d.departementId === 'd1')!;
    const d2 = result.parDepartement.find((d) => d.departementId === 'd2')!;
    expect(d1.taux).toBe(100);
    expect(d2.taux).toBe(50);
    expect(result.tauxGlobal).toBe(75);
    expect(result.estConforme).toBe(false);
  });

  it('tri déterministe des affectations et des séances orphelines', () => {
    const result = computeCouverture(
      [
        uneAffectation({ id: 'b1', departementId: 'd1', volumeHebdo: 5 }),
        uneAffectation({ id: 'a1', departementId: 'd1', volumeHebdo: 5 }),
      ],
      [
        uneSeance({ id: 's2', affectationId: 'a-inexistante-2' }),
        uneSeance({ id: 's1', affectationId: 'a-inexistante-1' }),
      ],
    );

    expect(result.parAffectation.map((a) => a.affectationId)).toEqual([
      'a1',
      'b1',
    ]);
    expect(result.seancesOrphelines).toEqual(['s1', 's2']);
  });

  it('deux affectations même département avec planifié : agrégation cumulée', () => {
    // a1 et a2 dans d1, chacun 10 h déclarés et 600 min planifiés → d1 à 100 %
    const result = computeCouverture(
      [
        uneAffectation({ id: 'a1', departementId: 'd1', volumeHebdo: 10 }),
        uneAffectation({ id: 'a2', departementId: 'd1', volumeHebdo: 10 }),
      ],
      [
        uneSeance({ id: 's1', affectationId: 'a1', nbCreneaux: 20 }), // 600 min
        uneSeance({ id: 's2', affectationId: 'a2', nbCreneaux: 20 }), // 600 min
      ],
    );

    expect(result.parDepartement).toHaveLength(1);
    const d1 = result.parDepartement[0];
    expect(d1.departementId).toBe('d1');
    expect(d1.volumeDeclareMinutes).toBe(1200);
    expect(d1.volumePlanifieMinutes).toBe(1200);
    expect(d1.taux).toBe(100);
    expect(result.tauxGlobal).toBe(100);
    expect(result.estConforme).toBe(true);
  });
});