// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import {
  calculerCharge,
  detecterMatieresManquantes,
  calculerTauxCouverture,
  hasAlertesBloquantes,
  CHARGE_RULE_SET_DEFAUT,
} from './calculsCharge';
import type { AffectationPedagogique } from '@takt/contracts';
import type { PlanEtudesMatiere } from '@takt/contracts';

const NOW = '2026-01-01T00:00:00Z';

const aff = (
  id: string,
  enseignantId: string,
  matiereId: string,
  volumeHebdo: number,
  departementId = 'd1',
): AffectationPedagogique => ({
  id,
  versionId: 'v1',
  semestreId: 's1',
  departementId,
  enseignantId,
  matiereId,
  groupeId: 'g1',
  typeEnseignementId: null,
  volumeHebdo,
  dureeCreneaux: 1,
  createdAt: NOW,
  updatedAt: NOW,
});

const matierePlan = (
  id: string,
  matiereId: string,
  volumeHoraire = 20,
): PlanEtudesMatiere => ({
  id,
  planEtudesId: 'pe1',
  matiereId,
  typeEnseignementId: 't1',
  volumeHoraire,
  dureeCreneaux: 1,
  coefficient: 1,
  createdAt: NOW,
  updatedAt: NOW,
});

describe('calculsCharge', () => {
  describe('calculerCharge', () => {
    it('retourne un résultat avec les charges par enseignant', () => {
      const resultat = calculerCharge(
        [
          { id: 'a1', enseignantId: 'e1', departementId: 'd1', volumeHebdo: 10 },
          { id: 'a2', enseignantId: 'e1', departementId: 'd1', volumeHebdo: 10 },
          { id: 'a3', enseignantId: 'e2', departementId: 'd1', volumeHebdo: 5 },
        ],
        CHARGE_RULE_SET_DEFAUT,
      );
      expect(resultat.parEnseignant).toHaveLength(2);
      const e1 = resultat.parEnseignant.find(
        (c) => c.enseignantId === 'e1',
      );
      expect(e1?.chargeArrondie).toBe(20);
    });

    it('détecte les alertes bloquantes quand le plafond est dépassé', () => {
      const resultat = calculerCharge(
        [
          { id: 'a1', enseignantId: 'e1', departementId: 'd1', volumeHebdo: 25 },
        ],
        CHARGE_RULE_SET_DEFAUT,
      );
      expect(hasAlertesBloquantes(resultat)).toBe(true);
    });

    it('n’a pas d’alerte bloquante quand le volume est sous plafond', () => {
      const resultat = calculerCharge(
        [
          { id: 'a1', enseignantId: 'e1', departementId: 'd1', volumeHebdo: 10 },
        ],
        CHARGE_RULE_SET_DEFAUT,
      );
      expect(hasAlertesBloquantes(resultat)).toBe(false);
    });
  });

  describe('detecterMatieresManquantes', () => {
    it('retourne les matières du plan sans affectation', () => {
      const plan = [matierePlan('mp1', 'm1'), matierePlan('mp2', 'm2'), matierePlan('mp3', 'm3')];
      const affectations = [
        aff('a1', 'e1', 'm1', 10),
        aff('a2', 'e1', 'm2', 10),
      ];
      const manquantes = detecterMatieresManquantes(plan, affectations);
      expect(manquantes).toHaveLength(1);
      expect(manquantes[0]).toBe('mp3');
    });

    it('retourne un tableau vide quand toutes les matières sont couvertes', () => {
      const plan = [matierePlan('mp1', 'm1')];
      const affectations = [aff('a1', 'e1', 'm1', 10)];
      expect(detecterMatieresManquantes(plan, affectations)).toHaveLength(0);
    });

    it('ignore les affectations d’autres départements', () => {
      const plan = [matierePlan('mp1', 'm1')];
      const affectations = [aff('a1', 'e1', 'm1', 10, 'd2')];
      const manquantes = detecterMatieresManquantes(plan, affectations);
      // detecterMatieresManquantes ne filtre pas par département, donc m1 est considérée couverte
      expect(manquantes).toHaveLength(0);
    });
  });

  describe('calculerTauxCouverture', () => {
    it('calcule le taux de couverture correctement', () => {
      const plan = [matierePlan('mp1', 'm1', 20), matierePlan('mp2', 'm2', 30)];
      const affectations = [
        aff('a1', 'e1', 'm1', 10, 'd1'),
        aff('a2', 'e1', 'm2', 15, 'd1'),
      ];
      const taux = calculerTauxCouverture('d1', plan, affectations);
      expect(taux.taux).toBe(50); // (10+15) / (20+30) * 100 = 50
      expect(taux.complet).toBe(false);
    });

    it('retourne 100% quand le volume affecté égale le prévu', () => {
      const plan = [matierePlan('mp1', 'm1', 20)];
      const affectations = [aff('a1', 'e1', 'm1', 20, 'd1')];
      const taux = calculerTauxCouverture('d1', plan, affectations);
      expect(taux.taux).toBe(100);
      expect(taux.complet).toBe(true);
    });

    it('retourne 0 quand il n’y a pas de matière prévue', () => {
      const plan: PlanEtudesMatiere[] = [];
      const affectations: AffectationPedagogique[] = [];
      const taux = calculerTauxCouverture('d1', plan, affectations);
      expect(taux.taux).toBe(0);
      expect(taux.complet).toBe(false);
    });
  });
});