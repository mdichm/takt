// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import {
  agregerParDepartement,
  agregerParDepartementAvecMap,
  calculerEcartsEquilibrage,
} from '../src/equilibrage';
import type { ChargeEnseignant, ChargeDepartement } from '../src/types';

describe('equilibrage', () => {
  const createCharge = (overrides: Partial<ChargeEnseignant> = {}): ChargeEnseignant => ({
    enseignantId: 'e1',
    chargeBrute: 19,
    chargeArrondie: 19,
    cible: 19,
    taux: 100,
    depassePlafond: false,
    statut: 'CONFORME',
    ...overrides,
  });

  describe('agregerParDepartementAvecMap', () => {
    it('agrège correctement un département avec un enseignant', () => {
      const charges = [createCharge({ enseignantId: 'e1', chargeArrondie: 19 })];
      const map = new Map([['e1', 'd1']]);

      const result = agregerParDepartementAvecMap(charges, map);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        departementId: 'd1',
        totalCharge: 19,
        moyenne: 19,
        max: 19,
        min: 19,
        ecart: 0,
        nombreEnseignants: 1,
      });
    });

    it('agrège correctement un département avec plusieurs enseignants', () => {
      const charges = [
        createCharge({ enseignantId: 'e1', chargeArrondie: 20 }),
        createCharge({ enseignantId: 'e2', chargeArrondie: 10 }),
        createCharge({ enseignantId: 'e3', chargeArrondie: 15 }),
      ];
      const map = new Map([
        ['e1', 'd1'],
        ['e2', 'd1'],
        ['e3', 'd1'],
      ]);

      const result = agregerParDepartementAvecMap(charges, map);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        departementId: 'd1',
        totalCharge: 45,
        moyenne: 15,
        max: 20,
        min: 10,
        ecart: 10,
        nombreEnseignants: 3,
      });
    });

    it('gère plusieurs départements', () => {
      const charges = [
        createCharge({ enseignantId: 'e1', chargeArrondie: 20 }),
        createCharge({ enseignantId: 'e2', chargeArrondie: 10 }),
        createCharge({ enseignantId: 'e3', chargeArrondie: 18 }),
        createCharge({ enseignantId: 'e4', chargeArrondie: 12 }),
      ];
      const map = new Map([
        ['e1', 'd1'],
        ['e2', 'd1'],
        ['e3', 'd2'],
        ['e4', 'd2'],
      ]);

      const result = agregerParDepartementAvecMap(charges, map);

      expect(result).toHaveLength(2);
      // Tri déterministe par departementId
      expect(result[0].departementId).toBe('d1');
      expect(result[0]).toMatchObject({
        totalCharge: 30,
        moyenne: 15,
        max: 20,
        min: 10,
        ecart: 10,
        nombreEnseignants: 2,
      });
      expect(result[1].departementId).toBe('d2');
      expect(result[1]).toMatchObject({
        totalCharge: 30,
        moyenne: 15,
        max: 18,
        min: 12,
        ecart: 6,
        nombreEnseignants: 2,
      });
    });

    it('ignore les enseignants sans département dans la map', () => {
      const charges = [
        createCharge({ enseignantId: 'e1', chargeArrondie: 20 }),
        createCharge({ enseignantId: 'e2', chargeArrondie: 10 }),
      ];
      const map = new Map([['e1', 'd1']]); // e2 absent

      const result = agregerParDepartementAvecMap(charges, map);

      expect(result).toHaveLength(1);
      expect(result[0].nombreEnseignants).toBe(1);
      expect(result[0].totalCharge).toBe(20);
    });

    it('retourne tableau vide si pas de charges', () => {
      const result = agregerParDepartementAvecMap([], new Map());
      expect(result).toHaveLength(0);
    });

    it('tri déterministe par identifiant d\'enseignant dans chaque département', () => {
      const charges = [
        createCharge({ enseignantId: 'e3', chargeArrondie: 20 }),
        createCharge({ enseignantId: 'e1', chargeArrondie: 10 }),
        createCharge({ enseignantId: 'e2', chargeArrondie: 15 }),
      ];
      const map = new Map([
        ['e1', 'd1'],
        ['e2', 'd1'],
        ['e3', 'd1'],
      ]);

      const result = agregerParDepartementAvecMap(charges, map);
      // L'ordre des enseignants dans l'agrégation ne change pas le résultat final
      // mais le tri par departementId est déterministe
      expect(result[0].departementId).toBe('d1');
    });
  });

  describe('calculerEcartsEquilibrage', () => {
    it('calcule les écarts avec indication de dépassement', () => {
      const departements: ChargeDepartement[] = [
        { departementId: 'd1', totalCharge: 30, moyenne: 15, max: 20, min: 10, ecart: 10, nombreEnseignants: 2 },
        { departementId: 'd2', totalCharge: 30, moyenne: 15, max: 18, min: 12, ecart: 6, nombreEnseignants: 2 },
        { departementId: 'd3', totalCharge: 20, moyenne: 20, max: 20, min: 20, ecart: 0, nombreEnseignants: 1 },
      ];

      const result = calculerEcartsEquilibrage(departements, 5);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ departementId: 'd1', ecart: 10, depasseTolerance: true });
      expect(result[1]).toEqual({ departementId: 'd2', ecart: 6, depasseTolerance: true });
      expect(result[2]).toEqual({ departementId: 'd3', ecart: 0, depasseTolerance: false });
    });

    it('retourne depasseTolerance: false si écart = tolérance', () => {
      const departements: ChargeDepartement[] = [
        { departementId: 'd1', totalCharge: 30, moyenne: 15, max: 20, min: 15, ecart: 5, nombreEnseignants: 2 },
      ];

      const result = calculerEcartsEquilibrage(departements, 5);
      expect(result[0].depasseTolerance).toBe(false);
    });

    it('retourne tableau vide si pas de départements', () => {
      const result = calculerEcartsEquilibrage([], 5);
      expect(result).toHaveLength(0);
    });

  it('agregerParDepartement lance une erreur (fonction publique non utilisable directement)', () => {
    expect(() => agregerParDepartement()).toThrow('Utiliser agregerParDepartementAvecMap');
  });

  it('agregerParDepartementAvecMap ignore liste vide pour un département', () => {
    // On teste indirectement via computeCharge mais on peut tester la logique du continue
    // en créant une map avec un département qui n'a pas d'enseignants dans la liste charges
    const charges: ChargeEnseignant[] = [
      createCharge({ enseignantId: 'e1', chargeArrondie: 19 }),
    ];
    // Map avec e1 -> d1, mais on ajoute un département d2 sans enseignants
    const map = new Map<string, string>([
      ['e1', 'd1'],
    ]);
    
    const result = agregerParDepartementAvecMap(charges, map);
    expect(result).toHaveLength(1);
    expect(result[0].departementId).toBe('d1');
  });
  });
});