// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import {
  determinerStatut,
  genererAlertesEnseignant,
  genererAlertesEquilibrage,
} from '../src/seuils';
import type { ChargeRuleSet, ChargeEnseignant } from '../src/types';

describe('seuils', () => {
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
    coefficientsParTypeEnseignement: { CM: 1.5 },
    cibleHebdomadaireParGrade: { MCF: 19 },
    toleranceEquilibrage: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('determinerStatut', () => {
    it('retourne BLOQUANT si chargeArrondie > plafondHebdomadaire', () => {
      const charge: ChargeEnseignant = {
        enseignantId: 'e1',
        chargeBrute: 22,
        chargeArrondie: 22,
        cible: 19,
        taux: 115.8,
        depassePlafond: true,
        statut: 'CONFORME',
      };
      expect(determinerStatut(charge, ruleSet)).toBe('BLOQUANT');
    });

    it('retourne CONFORME à 100 % exact (pas d\'alerte à 100 %)', () => {
      const charge: ChargeEnseignant = {
        enseignantId: 'e1',
        chargeBrute: 19,
        chargeArrondie: 19,
        cible: 19,
        taux: 100,
        depassePlafond: false,
        statut: 'CONFORME',
      };
      expect(determinerStatut(charge, ruleSet)).toBe('CONFORME');
    });

    it('retourne AVERTISSEMENT si taux >= seuilAlerte et taux !== 100', () => {
      const charge: ChargeEnseignant = {
        enseignantId: 'e1',
        chargeBrute: 18,
        chargeArrondie: 18,
        cible: 19,
        taux: 94.7,
        depassePlafond: false,
        statut: 'CONFORME',
      };
      expect(determinerStatut(charge, ruleSet)).toBe('AVERTISSEMENT');
    });

    it('retourne AVERTISSEMENT si taux = seuilAlerte exact (90 %)', () => {
      const charge: ChargeEnseignant = {
        enseignantId: 'e1',
        chargeBrute: 17.1,
        chargeArrondie: 17.1,
        cible: 19,
        taux: 90,
        depassePlafond: false,
        statut: 'CONFORME',
      };
      expect(determinerStatut(charge, ruleSet)).toBe('AVERTISSEMENT');
    });

    it('retourne CONFORME si taux < seuilAlerte', () => {
      const charge: ChargeEnseignant = {
        enseignantId: 'e1',
        chargeBrute: 15,
        chargeArrondie: 15,
        cible: 19,
        taux: 78.9,
        depassePlafond: false,
        statut: 'CONFORME',
      };
      expect(determinerStatut(charge, ruleSet)).toBe('CONFORME');
    });
  });
});