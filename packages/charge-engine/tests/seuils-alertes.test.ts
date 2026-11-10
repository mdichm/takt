// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import {
  genererAlertesEnseignant,
  genererAlertesEquilibrage,
} from '../src/seuils';
import type { ChargeRuleSet, ChargeEnseignant } from '../src/types';

describe('seuils - alertes', () => {
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

  describe('genererAlertesEnseignant', () => {
    it('génère alerte DEPASSEMENT_PLAFOND BLOQUANT', () => {
      const charge: ChargeEnseignant = {
        enseignantId: 'e1',
        chargeBrute: 22,
        chargeArrondie: 22,
        cible: 19,
        taux: 115.8,
        depassePlafond: true,
        statut: 'BLOQUANT',
      };
      const alertes = genererAlertesEnseignant(charge, ruleSet);
      expect(alertes).toHaveLength(1);
      expect(alertes[0]).toMatchObject({
        type: 'DEPASSEMENT_PLAFOND',
        severite: 'BLOQUANT',
        enseignantId: 'e1',
      });
      expect(alertes[0].details).toEqual({ chargeArrondie: 22, plafond: 20 });
    });

    it('génère alerte SEUIL_ALERTE AVERTISSEMENT', () => {
      const charge: ChargeEnseignant = {
        enseignantId: 'e1',
        chargeBrute: 18,
        chargeArrondie: 18,
        cible: 19,
        taux: 94.7,
        depassePlafond: false,
        statut: 'AVERTISSEMENT',
      };
      const alertes = genererAlertesEnseignant(charge, ruleSet);
      expect(alertes).toHaveLength(1);
      expect(alertes[0]).toMatchObject({
        type: 'SEUIL_ALERTE',
        severite: 'AVERTISSEMENT',
        enseignantId: 'e1',
      });
    });

    it('ne génère aucune alerte si CONFORME (taux < seuil, pas de dépassement)', () => {
      const charge: ChargeEnseignant = {
        enseignantId: 'e1',
        chargeBrute: 15,
        chargeArrondie: 15,
        cible: 19,
        taux: 78.9,
        depassePlafond: false,
        statut: 'CONFORME',
      };
      const alertes = genererAlertesEnseignant(charge, ruleSet);
      expect(alertes).toHaveLength(0);
    });

    it('ne génère aucune alerte à 100 % exact', () => {
      const charge: ChargeEnseignant = {
        enseignantId: 'e1',
        chargeBrute: 19,
        chargeArrondie: 19,
        cible: 19,
        taux: 100,
        depassePlafond: false,
        statut: 'CONFORME',
      };
      const alertes = genererAlertesEnseignant(charge, ruleSet);
      expect(alertes).toHaveLength(0);
    });
  });

  describe('genererAlertesEquilibrage', () => {
    it('génère alerte ECART_EQUILIBRAGE si écart > tolérance', () => {
      const dep = [{ departementId: 'd1', ecart: 8 }];
      const alertes = genererAlertesEquilibrage(dep, ruleSet);
      expect(alertes).toHaveLength(1);
      expect(alertes[0]).toMatchObject({
        type: 'ECART_EQUILIBRAGE',
        severite: 'AVERTISSEMENT',
        departementId: 'd1',
      });
      expect(alertes[0].details).toEqual({ ecart: 8, tolerance: 5 });
    });

    it('ne génère pas d\'alerte si écart <= tolérance', () => {
      const dep = [{ departementId: 'd1', ecart: 5 }];
      const alertes = genererAlertesEquilibrage(dep, ruleSet);
      expect(alertes).toHaveLength(0);
    });

    it('ne génère pas d\'alerte si écart < tolérance', () => {
      const dep = [{ departementId: 'd1', ecart: 3 }];
      const alertes = genererAlertesEquilibrage(dep, ruleSet);
      expect(alertes).toHaveLength(0);
    });

    it('gère plusieurs départements', () => {
      const dep = [
        { departementId: 'd1', ecart: 8 },
        { departementId: 'd2', ecart: 3 },
        { departementId: 'd3', ecart: 6 },
      ];
      const alertes = genererAlertesEquilibrage(dep, ruleSet);
      expect(alertes).toHaveLength(2);
      expect(alertes.map((a) => a.departementId).sort()).toEqual(['d1', 'd3']);
    });

    it('retourne tableau vide si pas de départements', () => {
      const alertes = genererAlertesEquilibrage([], ruleSet);
      expect(alertes).toHaveLength(0);
    });
  });
});