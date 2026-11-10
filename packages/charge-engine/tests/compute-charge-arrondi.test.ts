// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { computeCharge } from '../src/compute-charge';
import type { ChargeRuleSet, AffectationCharge } from '../src/types';

describe('computeCharge - modes d\'arrondi', () => {
  const baseRuleSet: ChargeRuleSet = {
    id: 'rs1',
    code: 'CHARG-STD',
    libelle: 'Règles standard',
    version: 1,
    estActive: true,
    seuilAlerte: 90,
    plafondHebdomadaire: 20,
    arrondi: 'UNITAIRE',
    dureeJournee: 7,
    dureeDemiJournee: 3.5,
    coefficientsParTypeEnseignement: { CM: 1.5, TD: 1, TP: 1, PROJET: 1 },
    cibleHebdomadaireParGrade: { MCF: 19, PR: 19, ATER: 19, PAST: 19 },
    toleranceEquilibrage: 5,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const baseAffectation = (overrides: Partial<AffectationCharge> = {}): AffectationCharge => ({
    id: 'a1',
    enseignantId: 'e1',
    departementId: 'd1',
    gradeCode: 'MCF',
    typeEnseignementCode: 'TD',
    volumeHebdo: 10,
    ...overrides,
  });

  describe('UNITAIRE', () => {
    it('3.2 → 3', () => {
      const rs = { ...baseRuleSet, arrondi: 'UNITAIRE' as const };
      expect(computeCharge([baseAffectation({ volumeHebdo: 3.2 })], rs).parEnseignant[0].chargeArrondie).toBe(3);
    });

    it('3.5 → 4 (demi-supérieur)', () => {
      const rs = { ...baseRuleSet, arrondi: 'UNITAIRE' as const };
      expect(computeCharge([baseAffectation({ volumeHebdo: 3.5 })], rs).parEnseignant[0].chargeArrondie).toBe(4);
    });

    it('3.7 → 4', () => {
      const rs = { ...baseRuleSet, arrondi: 'UNITAIRE' as const };
      expect(computeCharge([baseAffectation({ volumeHebdo: 3.7 })], rs).parEnseignant[0].chargeArrondie).toBe(4);
    });
  });

  describe('DEMI_JOURNEE (3.5h)', () => {
    it('3 → 3.5', () => {
      const rs = { ...baseRuleSet, arrondi: 'DEMI_JOURNEE' as const };
      expect(computeCharge([baseAffectation({ volumeHebdo: 3 })], rs).parEnseignant[0].chargeArrondie).toBe(3.5);
    });

    it('3.5 → 3.5', () => {
      const rs = { ...baseRuleSet, arrondi: 'DEMI_JOURNEE' as const };
      expect(computeCharge([baseAffectation({ volumeHebdo: 3.5 })], rs).parEnseignant[0].chargeArrondie).toBe(3.5);
    });

    it('5 → 3.5', () => {
      const rs = { ...baseRuleSet, arrondi: 'DEMI_JOURNEE' as const };
      expect(computeCharge([baseAffectation({ volumeHebdo: 5 })], rs).parEnseignant[0].chargeArrondie).toBe(3.5);
    });

    it('5.25 → 7 (milieu → demi-supérieur)', () => {
      const rs = { ...baseRuleSet, arrondi: 'DEMI_JOURNEE' as const };
      expect(computeCharge([baseAffectation({ volumeHebdo: 5.25 })], rs).parEnseignant[0].chargeArrondie).toBe(7);
    });
  });

  describe('JOURNEE (7h)', () => {
    it('3 → 0', () => {
      const rs = { ...baseRuleSet, arrondi: 'JOURNEE' as const };
      expect(computeCharge([baseAffectation({ volumeHebdo: 3 })], rs).parEnseignant[0].chargeArrondie).toBe(0);
    });

    it('3.5 → 7 (milieu → demi-supérieur)', () => {
      const rs = { ...baseRuleSet, arrondi: 'JOURNEE' as const };
      expect(computeCharge([baseAffectation({ volumeHebdo: 3.5 })], rs).parEnseignant[0].chargeArrondie).toBe(7);
    });

    it('5 → 7', () => {
      const rs = { ...baseRuleSet, arrondi: 'JOURNEE' as const };
      expect(computeCharge([baseAffectation({ volumeHebdo: 5 })], rs).parEnseignant[0].chargeArrondie).toBe(7);
    });

    it('10.5 → 14 (milieu → demi-supérieur)', () => {
      const rs = { ...baseRuleSet, arrondi: 'JOURNEE' as const };
      expect(computeCharge([baseAffectation({ volumeHebdo: 10.5 })], rs).parEnseignant[0].chargeArrondie).toBe(14);
    });
  });
});