// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { computeCharge } from '../src/compute-charge';
import type { ChargeRuleSet, AffectationCharge } from '../src/types';

describe('computeCharge - critères L05-03', () => {
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

  it('19 h / cible 19 h → taux 100 %, aucun avertissement', () => {
    const result = computeCharge([baseAffectation({ volumeHebdo: 19 })], baseRuleSet);
    expect(result.parEnseignant[0].taux).toBe(100);
    expect(result.parEnseignant[0].statut).toBe('CONFORME');
    const alertes = result.alertes.filter((a) => a.enseignantId === 'e1');
    expect(alertes).toHaveLength(0);
  });

  it('22 h / plafond 20 h → BLOQUANT', () => {
    const result = computeCharge([baseAffectation({ volumeHebdo: 22 })], baseRuleSet);
    expect(result.parEnseignant[0].depassePlafond).toBe(true);
    expect(result.parEnseignant[0].statut).toBe('BLOQUANT');
    const bloquantes = result.alertes.filter((a) => a.type === 'DEPASSEMENT_PLAFOND');
    expect(bloquantes).toHaveLength(1);
  });

  it('20 h vs 10 h même département → écart 10 h', () => {
    const aff = [
      baseAffectation({ id: 'a1', enseignantId: 'e1', volumeHebdo: 20 }),
      baseAffectation({ id: 'a2', enseignantId: 'e2', volumeHebdo: 10 }),
    ];
    const result = computeCharge(aff, baseRuleSet);
    expect(result.parDepartement[0].ecart).toBe(10);
    expect(result.ecartsEquilibrage[0].ecart).toBe(10);
    expect(result.ecartsEquilibrage[0].depasseTolerance).toBe(true);
  });

  it('arrondi DEMI_JOURNEE : 3 h → 3.5 h', () => {
    const rs = { ...baseRuleSet, arrondi: 'DEMI_JOURNEE' as const };
    const result = computeCharge([baseAffectation({ volumeHebdo: 3 })], rs);
    expect(result.parEnseignant[0].chargeArrondie).toBe(3.5);
  });
});