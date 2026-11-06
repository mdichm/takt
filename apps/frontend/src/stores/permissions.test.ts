// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { calculerPermissions, PERMISSIONS_VIDES } from './permissions';

describe('calculerPermissions (matrice ST_TAKT §5.2-5.3)', () => {
  it('retourne des permissions vides quand aucune version n est sélectionnée', () => {
    expect(calculerPermissions(null, 'gest')).toEqual(PERMISSIONS_VIDES);
  });

  it('publie : immuable pour tous, sauf lecture pour admin', () => {
    const p = calculerPermissions('publie', 'rdep', true);
    expect(p.peutLire).toBe(true);
    expect(p.peutEditer).toBe(false);
    expect(p.peutGenerer).toBe(false);
    expect(p.peutForcerVerrou).toBe(false);
    expect(p.peutReactiverArchive).toBe(false);
  });

  it('publie : admin peut forcer et archiver (publie -> archive, GG-09)', () => {
    const p = calculerPermissions('publie', 'admin');
    expect(p.peutLire).toBe(true);
    expect(p.peutForcerVerrou).toBe(true);
    expect(p.peutReactiverArchive).toBe(false); // publie n'est pas archive
    expect(p.peutEditer).toBe(false);
  });

  it('archive : non accessible ni réactivable sauf admin', () => {
    const pNonAdmin = calculerPermissions('archive', 'gest');
    expect(pNonAdmin.peutLire).toBe(false);
    expect(pNonAdmin.peutReactiverArchive).toBe(false);

    const pAdmin = calculerPermissions('archive', 'admin');
    expect(pAdmin.peutLire).toBe(true);
    expect(pAdmin.peutReactiverArchive).toBe(true);
    expect(pAdmin.peutForcerVerrou).toBe(true);
  });

  it('brouillon : gest peut éditer et générer, pas forcer de verrou', () => {
    const p = calculerPermissions('brouillon', 'gest', true);
    expect(p.peutEditer).toBe(true);
    expect(p.peutGenerer).toBe(true);
    expect(p.peutVerrouiller).toBe(true);
    expect(p.peutForcerVerrou).toBe(false);
  });

  it('edition : rdep propriétaire du département peut éditer, pas générer', () => {
    const p = calculerPermissions('edition', 'rdep', true);
    expect(p.peutEditer).toBe(true);
    expect(p.peutGenerer).toBe(false);
    expect(p.peutGererDepartement).toBe(false);
  });

  it('edition : rdep non propriétaire du département ne peut pas éditer', () => {
    const p = calculerPermissions('edition', 'rdep', false);
    expect(p.peutEditer).toBe(false);
  });

  it('dir peut gérer les départements sur un état modifiable', () => {
    const p = calculerPermissions('brouillon', 'dir', true);
    expect(p.peutGererDepartement).toBe(true);
    expect(p.peutEditer).toBe(true);
  });

  it('initial : admin peut tout faire sauf réactiver une archive', () => {
    const p = calculerPermissions('initial', 'admin', true);
    expect(p.peutEditer).toBe(true);
    expect(p.peutGenerer).toBe(false); // admin n'est pas gest
    expect(p.peutForcerVerrou).toBe(true);
    expect(p.peutReactiverArchive).toBe(false); // état initial, pas archive
  });

  it('generation : lecture seule, pas d édition', () => {
    const p = calculerPermissions('generation', 'gest', true);
    expect(p.peutLire).toBe(true);
    expect(p.peutEditer).toBe(false);
    expect(p.peutGenerer).toBe(false);
  });
});