// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { zDepartement, zRole, zUser, zUserList } from '../src/referentiels';

const UUID_ROLE = '11111111-1111-4111-8111-111111111111';
const UUID_DEPARTEMENT = '22222222-2222-4222-8222-222222222222';

describe('contrats des référentiels', () => {
  it('accepte un utilisateur valide', () => {
    expect(
      zUser.parse({
        email: 'utilisateur@exemple.fr',
        nom: 'Martin',
        prenom: 'Camille',
        roleId: UUID_ROLE,
      }),
    ).toEqual({
      email: 'utilisateur@exemple.fr',
      nom: 'Martin',
      prenom: 'Camille',
      roleId: UUID_ROLE,
      departementId: undefined,
      estActif: true,
    });
  });

  it.each([
    [{ email: 'invalide' }, 'Adresse e-mail invalide'],
    [{ nom: '' }, 'Le nom est requis'],
    [{ prenom: '' }, 'Le prénom est requis'],
  ])('refuse un utilisateur invalide : %s', (correction, message) => {
    const donnees = {
      email: 'utilisateur@exemple.fr',
      nom: 'Martin',
      prenom: 'Camille',
      roleId: UUID_ROLE,
      ...correction,
    };
    const resultat = zUser.safeParse(donnees);
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues.some((issue) => issue.message === message)).toBe(true);
    }
  });

  it('valide les filtres de liste des utilisateurs', () => {
    expect(
      zUserList.parse({ page: '2', role: 'rdep', departementId: UUID_DEPARTEMENT }),
    ).toEqual({ page: 2, pageSize: 20, role: 'rdep', departementId: UUID_DEPARTEMENT });
  });

  it('refuse un rôle inconnu', () => {
    expect(zUserList.safeParse({ role: 'inconnu' }).success).toBe(false);
  });

  it('valide les ressources de référentiel', () => {
    expect(zRole.parse({ id: UUID_ROLE, code: 'admin', libelle: 'Administrateur' }).code).toBe('admin');
    expect(
      zDepartement.parse({ id: UUID_DEPARTEMENT, code: 'INFO', libelle: 'Informatique' }).code,
    ).toBe('INFO');
  });
});
