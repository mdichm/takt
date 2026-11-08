// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { computeCharge } from '../src/compute-charge';
import type { ChargeRuleSet, AffectationCharge } from '../src/types';

describe('computeCharge - coefficients et cibles', () => {
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

  it('coefficient CM = 1.5', () => {
    const result = computeCharge([baseAffectation({ typeEnseignementCode: 'CM', volumeHebdo: 10 })], baseRuleSet);
    expect(result.parEnseignant[0].chargeBrute).toBe(15);
  });

  it('coefficient TD = 1', () => {
    const result = computeCharge([baseAffectation({ typeEnseignementCode: 'TD', volumeHebdo: 10 })], baseRuleSet);
    expect(result.parEnseignant[0].chargeBrute).toBe(10);
  });

  it('type non mappé → coefficient 1', () => {
    const result = computeCharge([baseAffectation({ typeEnseignementCode: 'INCONNU', volumeHebdo: 10 })], baseRuleSet);
    expect(result.parEnseignant[0].chargeBrute).toBe(10);
  });

  it('type absent → coefficient 1', () => {
    const result = computeCharge([baseAffectation({ typeEnseignementCode: undefined, volumeHebdo: 10 })], baseRuleSet);
    expect(result.parEnseignant[0].chargeBrute).toBe(10);
  });

  it('cible selon grade MCF = 19', () => {
    const result = computeCharge([baseAffectation({ gradeCode: 'MCF', volumeHebdo: 19 })], baseRuleSet);
    expect(result.parEnseignant[0].cible).toBe(19);
  });

  it('cible selon grade PR = 19', () => {
    const result = computeCharge([baseAffectation({ gradeCode: 'PR', volumeHebdo: 19 })], baseRuleSet);
    expect(result.parEnseignant[0].cible).toBe(19);
  });

  it('grade non mappé → plafond', () => {
    const result = computeCharge([baseAffectation({ gradeCode: 'INCONNU', volumeHebdo: 19 })], baseRuleSet);
    expect(result.parEnseignant[0].cible).toBe(20);
  });

  it('grade absent → plafond', () => {
    const result = computeCharge([baseAffectation({ gradeCode: undefined, volumeHebdo: 19 })], baseRuleSet);
    expect(result.parEnseignant[0].cible).toBe(20);
  });
});