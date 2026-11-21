// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import {
  zMotDePasseChange,
  zProfilUtilisateur,
  zProfilUpdate,
} from '../src/profil';

const UUID = '11111111-1111-4111-8111-111111111111';

const profilValide = {
  id: UUID,
  email: 'prenom.nom@academie.fr',
  nom: 'DUPONT',
  prenom: 'Marie',
  role: 'rdep',
  departementId: UUID,
  departementCode: 'DEP01',
  notificationsEmail: true,
  notificationsInApp: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

describe('contrats du profil utilisateur', () => {
  it('accepte un profil utilisateur complet et valide', () => {
    expect(zProfilUtilisateur.parse(profilValide)).toEqual(profilValide);
  });

  it('refuse un profil sans email', () => {
    expect(
      zProfilUtilisateur.safeParse({ ...profilValide, email: 'invalid' }).success,
    ).toBe(false);
  });

  it('refuse un profil avec un rôle inconnu', () => {
    expect(
      zProfilUtilisateur.safeParse({ ...profilValide, role: 'inconnu' }).success,
    ).toBe(false);
  });

  it('accepte un département nul dans un profil', () => {
    expect(
      zProfilUtilisateur.safeParse({ ...profilValide, departementId: null }).success,
    ).toBe(true);
  });

  it('accepte une mise à jour partielle (nom uniquement)', () => {
    expect(zProfilUpdate.parse({ nom: 'DURAND' })).toEqual({ nom: 'DURAND' });
  });

  it('refuse une mise à jour de profil avec un email invalide', () => {
    expect(zProfilUpdate.safeParse({ email: 'pas-un-email' }).success).toBe(false);
  });

  it('accepte une mise à jour de profil vide', () => {
    expect(zProfilUpdate.parse({})).toEqual({});
  });

  it('accepte un changement de mot de passe valide', () => {
    expect(
      zMotDePasseChange.parse({
        motDePasseActuel: 'Ancien1234',
        nouveauMotDePasse: 'Nouveau1234',
      }),
    ).toEqual({
      motDePasseActuel: 'Ancien1234',
      nouveauMotDePasse: 'Nouveau1234',
    });
  });

  it('refuse un mot de passe actuel vide', () => {
    expect(
      zMotDePasseChange.safeParse({
        motDePasseActuel: '',
        nouveauMotDePasse: 'Nouveau1234',
      }).success,
    ).toBe(false);
  });

  it('refuse un nouveau mot de passe trop court', () => {
    expect(
      zMotDePasseChange.safeParse({
        motDePasseActuel: 'Ancien1234',
        nouveauMotDePasse: 'court',
      }).success,
    ).toBe(false);
  });
});
