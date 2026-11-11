// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import {
  MATRICE_TRANSITIONS,
  NOMBRE_TRANSITIONS_ATTENDU,
  REGLE_PAR_ACTION,
} from './workflow-matrix';

const ACTIONS_REJET = [
  'rejeterPedagogique',
  'rejeterDirectionPedagogique',
  'rejeterDirectionPlanning',
];

describe('matrice de transitions workflow (TAKT-L06-02)', () => {
  it('définit exactement 18 transitions canoniques', () => {
    expect(MATRICE_TRANSITIONS.length).toBe(NOMBRE_TRANSITIONS_ATTENDU);
    expect(MATRICE_TRANSITIONS.length).toBe(18);
  });

  it('chaque règle a un from, un to, des rôles et une garde non vides', () => {
    for (const regle of MATRICE_TRANSITIONS) {
      expect(typeof regle.from).toBe('string');
      expect(regle.from.length).toBeGreaterThan(0);
      expect(typeof regle.to).toBe('string');
      expect(regle.to.length).toBeGreaterThan(0);
      expect(Array.isArray(regle.roles)).toBe(true);
      expect(regle.roles.length).toBeGreaterThan(0);
      expect(typeof regle.garde).toBe('string');
      expect(regle.garde.length).toBeGreaterThan(0);
      expect(typeof regle.motifObligatoire).toBe('boolean');
    }
  });

  it('les actions sont uniques', () => {
    const actions = MATRICE_TRANSITIONS.map((r) => r.action);
    expect(new Set(actions).size).toBe(actions.length);
  });

  it('REGLE_PAR_ACTION contient 18 entrées indexées par action', () => {
    expect(REGLE_PAR_ACTION.size).toBe(18);
    for (const regle of MATRICE_TRANSITIONS) {
      expect(REGLE_PAR_ACTION.get(regle.action)).toBe(regle);
    }
  });

  it('les 3 actions de rejet exigent un motif', () => {
    for (const action of ACTIONS_REJET) {
      const regle = MATRICE_TRANSITIONS.find((r) => r.action === action);
      expect(regle).toBeDefined();
      expect(regle!.motifObligatoire).toBe(true);
    }
  });

  it('les actions non-rejet n’exigent pas de motif', () => {
    for (const regle of MATRICE_TRANSITIONS) {
      if (!ACTIONS_REJET.includes(regle.action)) {
        expect(regle.motifObligatoire).toBe(false);
      }
    }
  });

  it('chaque from correspond à un état canonique du workflow', () => {
    const etatsCanoniques = [
      'initial',
      'rep_pedag',
      'brouillon',
      'generation',
      'edition',
      'valid_pedag',
      'valid_dir',
      'valide',
      'publie',
      'archive',
    ];
    for (const regle of MATRICE_TRANSITIONS) {
      expect(etatsCanoniques).toContain(regle.from as (typeof etatsCanoniques)[number]);
      expect(etatsCanoniques).toContain(regle.to as (typeof etatsCanoniques)[number]);
    }
  });

  it('les rôles sont tous parmi admin, gest, rdep, dir', () => {
    const rolesValides = ['admin', 'gest', 'rdep', 'dir'];
    for (const regle of MATRICE_TRANSITIONS) {
      for (const role of regle.roles) {
        expect(rolesValides).toContain(role);
      }
    }
  });

  it('la matrice est cohérente (pas de doublon dans la map)', () => {
    const doublons = MATRICE_TRANSITIONS.filter(
      (r, index, self) => self.findIndex((x) => x.action === r.action) !== index,
    );
    expect(doublons).toHaveLength(0);
  });
});
