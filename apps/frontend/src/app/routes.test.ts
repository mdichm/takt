// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { ROUTES, REDIRECTION_PAR_DEFAUT } from './routes';

const ROLES = ['admin', 'gest', 'rdep', 'dir'] as const;

describe('table de routes (UI_FRONTEND_SPECS §5)', () => {
  it('déclare 29 routes', () => {
    expect(ROUTES).toHaveLength(29);
  });

  it('chaque route a un chemin unique', () => {
    const chemins = ROUTES.map((r) => r.chemin);
    expect(new Set(chemins).size).toBe(29);
  });

  it('chaque route porte un code EC-* unique et valide', () => {
    const codes = ROUTES.map((r) => r.code);
    expect(new Set(codes).size).toBe(29);
    for (const code of codes) {
      expect(/^EC-[A-Z]+-\d{2}$/.test(code)).toBe(true);
    }
  });

  it('chaque route déclare au moins un rôle autorisé parmi le catalogue', () => {
    const rolesDeclares = new Set(ROUTES.flatMap((r) => r.roles));
    for (const role of ROLES) {
      expect(rolesDeclares.has(role)).toBe(true);
    }
    for (const route of ROUTES) {
      for (const role of route.roles) {
        expect(ROLES).toContain(role);
      }
    }
  });

  it('redirection par défaut conforme par rôle', () => {
    expect(REDIRECTION_PAR_DEFAUT).toEqual({
      admin: '/admin/users',
      gest: '/ges/init',
      rdep: '/rdep/allocation',
      dir: '/dir/scenario',
    });
  });

  it('les écrans transversaux sont accessibles à tous les rôles', () => {
    const transversaux = ['EC-COM-01', 'EC-COM-02', 'EC-COM-03'];
    for (const code of transversaux) {
      const route = ROUTES.find((r) => r.code === code);
      expect(route).toBeDefined();
      for (const role of ROLES) {
        expect(route!.roles).toContain(role);
      }
    }
  });

  it('les écrans admin ne sont accessibles qu à admin', () => {
    const adminRoutes = ['EC-ADM-01', 'EC-ADM-02', 'EC-ADM-03', 'EC-ADM-04'];
    for (const code of adminRoutes) {
      const route = ROUTES.find((r) => r.code === code)!;
      expect(route.roles).toEqual(['admin']);
    }
  });

  it('EC-GES-10 (archivage) est accessible à gest et admin', () => {
    const route = ROUTES.find((r) => r.code === 'EC-GES-10')!;
    expect(route.roles).toEqual(['gest', 'admin']);
  });

  it('les écrans rdep sont accessibles à rdep (et parfois admin/gest)', () => {
    const rdepRoutes = ['EC-RDEP-01', 'EC-RDEP-02', 'EC-RDEP-03', 'EC-RDEP-04', 'EC-RDEP-05'];
    for (const code of rdepRoutes) {
      const route = ROUTES.find((r) => r.code === code)!;
      expect(route.roles).toContain('rdep');
    }
  });

  it('les écrans dir sont accessibles à dir', () => {
    const dirRoutes = ['EC-DIR-01', 'EC-DIR-02', 'EC-DIR-03', 'EC-DIR-04', 'EC-DIR-05'];
    for (const code of dirRoutes) {
      const route = ROUTES.find((r) => r.code === code)!;
      expect(route.roles).toContain('dir');
    }
  });

  it('EC-GES-06 (grille) comporte un garde d édition', () => {
    const route = ROUTES.find((r) => r.code === 'EC-GES-06')!;
    expect(route.editionLock).toBe(true);
  });

  it('les écrans rdep comportent un garde de département (RB-UI-01)', () => {
    const rdepRoutes = ['EC-RDEP-01', 'EC-RDEP-02'];
    for (const code of rdepRoutes) {
      const route = ROUTES.find((r) => r.code === code)!;
      expect(route.departement).toBe(true);
    }
  });
});
