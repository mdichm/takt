// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { computeCharge } from '../src/compute-charge';
import type { ChargeRuleSet, AffectationCharge } from '../src/types';

describe('computeCharge - cas limites et déterminisme', () => {
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

  it('affectations vides', () => {
    const result = computeCharge([], baseRuleSet);
    expect(result.parEnseignant).toHaveLength(0);
    expect(result.parDepartement).toHaveLength(0);
    expect(result.tauxDepassement).toBe(0);
    expect(result.ecartsEquilibrage).toHaveLength(0);
    expect(result.alertes).toHaveLength(0);
  });

  it('plusieurs affectations même enseignant → somme', () => {
    const aff = [
      baseAffectation({ id: 'a1', volumeHebdo: 10, typeEnseignementCode: 'CM' }), // 15
      baseAffectation({ id: 'a2', volumeHebdo: 5, typeEnseignementCode: 'TD' }), // 5
    ];
    const result = computeCharge(aff, baseRuleSet);
    expect(result.parEnseignant[0].chargeBrute).toBe(20);
  });

  it('taux de dépassement global', () => {
    const aff = [
      baseAffectation({ id: 'a1', enseignantId: 'e1', volumeHebdo: 22 }), // dépassement
      baseAffectation({ id: 'a2', enseignantId: 'e2', volumeHebdo: 19 }), // OK
      baseAffectation({ id: 'a3', enseignantId: 'e3', volumeHebdo: 15 }), // OK
    ];
    const result = computeCharge(aff, baseRuleSet);
    expect(result.tauxDepassement).toBeCloseTo(33.33, 1);
  });

  it('déterminisme : même entrée → même sortie', () => {
    const aff = [
      baseAffectation({ id: 'a1', enseignantId: 'e1', volumeHebdo: 10 }),
      baseAffectation({ id: 'a2', enseignantId: 'e2', volumeHebdo: 15 }),
      baseAffectation({ id: 'a3', enseignantId: 'e3', volumeHebdo: 20 }),
    ];
    const r1 = computeCharge(aff, baseRuleSet);
    const r2 = computeCharge(aff, baseRuleSet);
    expect(r1).toEqual(r2);
  });

  it('déterminisme : ordre permuté → même sortie', () => {
    const aff1 = [
      baseAffectation({ id: 'a1', enseignantId: 'e1', volumeHebdo: 10 }),
      baseAffectation({ id: 'a2', enseignantId: 'e2', volumeHebdo: 15 }),
    ];
    const aff2 = [
      baseAffectation({ id: 'a2', enseignantId: 'e2', volumeHebdo: 15 }),
      baseAffectation({ id: 'a1', enseignantId: 'e1', volumeHebdo: 10 }),
    ];
    const r1 = computeCharge(aff1, baseRuleSet);
    const r2 = computeCharge(aff2, baseRuleSet);
    expect(r1).toEqual(r2);
  });

  it('tri déterministe par identifiant enseignant', () => {
    const aff = [
      baseAffectation({ id: 'a3', enseignantId: 'e3', volumeHebdo: 20 }),
      baseAffectation({ id: 'a1', enseignantId: 'e1', volumeHebdo: 10 }),
      baseAffectation({ id: 'a2', enseignantId: 'e2', volumeHebdo: 15 }),
    ];
    const result = computeCharge(aff, baseRuleSet);
    expect(result.parEnseignant.map((c) => c.enseignantId)).toEqual(['e1', 'e2', 'e3']);
  });

  it('seuil d\'alerte à 90 % exact → AVERTISSEMENT', () => {
    // 17.5 → arrondi UNITAIRE = 18 ; 18/19 = 94.7% ≥ 90%
    const aff = [baseAffectation({ volumeHebdo: 17.5 })];
    const result = computeCharge(aff, baseRuleSet);
    expect(result.parEnseignant[0].statut).toBe('AVERTISSEMENT');
  });

  it('cible = 0 → taux = 0 (branche cible > 0)', () => {
    const rs = { ...baseRuleSet, plafondHebdomadaire: 0, cibleHebdomadaireParGrade: { MCF: 0 } };
    const aff = [baseAffectation({ volumeHebdo: 10 })];
    const result = computeCharge(aff, rs);
    expect(result.parEnseignant[0].taux).toBe(0);
    expect(result.parEnseignant[0].cible).toBe(0);
  });

  it('seuil d\'alerte au-dessus (95 %) → AVERTISSEMENT', () => {
    const aff = [baseAffectation({ volumeHebdo: 18 })];
    const result = computeCharge(aff, baseRuleSet);
    expect(result.parEnseignant[0].statut).toBe('AVERTISSEMENT');
  });

  it('en-dessous du seuil (85 %) → CONFORME', () => {
    const aff = [baseAffectation({ volumeHebdo: 16 })];
    const result = computeCharge(aff, baseRuleSet);
    expect(result.parEnseignant[0].statut).toBe('CONFORME');
  });

  it('équilibrage : dépassement tolérance', () => {
    const rs = { ...baseRuleSet, toleranceEquilibrage: 3 };
    const aff = [
      baseAffectation({ id: 'a1', enseignantId: 'e1', volumeHebdo: 20 }),
      baseAffectation({ id: 'a2', enseignantId: 'e2', volumeHebdo: 10 }),
    ];
    const result = computeCharge(aff, rs);
    expect(result.ecartsEquilibrage[0].depasseTolerance).toBe(true);
    const alertesEq = result.alertes.filter((a) => a.type === 'ECART_EQUILIBRAGE');
    expect(alertesEq).toHaveLength(1);
  });
});