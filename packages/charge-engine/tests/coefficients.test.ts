// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { appliquerCoefficient } from '../src/coefficients';
import type { ChargeRuleSet, AffectationCharge } from '../src/types';

describe('coefficients', () => {
  const ruleSet: ChargeRuleSet = {
    id: 'rs1',
    code: 'TEST',
    libelle: 'Test',
    version: 1,
    estActive: true,
    seuilAlerte: 90,
    plafondHebdomadaire: 20,
    arrondi: 'UNITAIRE',
    dureeJournee: 7,
    dureeDemiJournee: 3.5,
    coefficientsParTypeEnseignement: {
      CM: 1.5,
      TD: 1,
      TP: 1,
      PROJET: 1,
    },
    cibleHebdomadaireParGrade: {
      MCF: 19,
      PR: 19,
    },
    toleranceEquilibrage: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseAffectation: AffectationCharge = {
    id: 'a1',
    enseignantId: 'e1',
    departementId: 'd1',
    volumeHebdo: 10,
  };

  describe('appliquerCoefficient', () => {
    it('applique le coefficient CM (1.5)', () => {
      const aff = { ...baseAffectation, typeEnseignementCode: 'CM', volumeHebdo: 10 };
      expect(appliquerCoefficient(aff, ruleSet)).toBe(15);
    });

    it('applique le coefficient TD (1)', () => {
      const aff = { ...baseAffectation, typeEnseignementCode: 'TD', volumeHebdo: 10 };
      expect(appliquerCoefficient(aff, ruleSet)).toBe(10);
    });

    it('applique le coefficient TP (1)', () => {
      const aff = { ...baseAffectation, typeEnseignementCode: 'TP', volumeHebdo: 10 };
      expect(appliquerCoefficient(aff, ruleSet)).toBe(10);
    });

    it('applique le coefficient PROJET (1)', () => {
      const aff = { ...baseAffectation, typeEnseignementCode: 'PROJET', volumeHebdo: 10 };
      expect(appliquerCoefficient(aff, ruleSet)).toBe(10);
    });

    it('retourne le volume brut si typeEnseignementCode est absent', () => {
      const aff = { ...baseAffectation, typeEnseignementCode: undefined, volumeHebdo: 10 };
      expect(appliquerCoefficient(aff, ruleSet)).toBe(10);
    });

    it('retourne le volume brut si typeEnseignementCode est null', () => {
      const aff = { ...baseAffectation, typeEnseignementCode: null as any, volumeHebdo: 10 };
      expect(appliquerCoefficient(aff, ruleSet)).toBe(10);
    });

    it('retourne le volume brut si le type n\'est pas mappé (coefficient inconnu)', () => {
      const aff = { ...baseAffectation, typeEnseignementCode: 'INCONNU', volumeHebdo: 10 };
      expect(appliquerCoefficient(aff, ruleSet)).toBe(10);
    });

    it('gère un coefficient de 0 (type mappé à 0)', () => {
      const rsZero: ChargeRuleSet = {
        ...ruleSet,
        coefficientsParTypeEnseignement: { CM: 0 },
      };
      const aff = { ...baseAffectation, typeEnseignementCode: 'CM', volumeHebdo: 10 };
      expect(appliquerCoefficient(aff, rsZero)).toBe(0);
    });

    it('gère un coefficient décimal (ex: 1.25)', () => {
      const rsDecimal: ChargeRuleSet = {
        ...ruleSet,
        coefficientsParTypeEnseignement: { CM: 1.25 },
      };
      const aff = { ...baseAffectation, typeEnseignementCode: 'CM', volumeHebdo: 8 };
      expect(appliquerCoefficient(aff, rsDecimal)).toBe(10);
    });

    it('gère un volume horaire nul', () => {
      const aff = { ...baseAffectation, typeEnseignementCode: 'CM', volumeHebdo: 0 };
      expect(appliquerCoefficient(aff, ruleSet)).toBe(0);
    });
  });
});