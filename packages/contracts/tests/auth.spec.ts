// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { zLogin, zRefresh } from '../src/auth';

describe('contrats d’authentification', () => {
  it('accepte une charge utile de connexion valide', () => {
    expect(
      zLogin.parse({ email: 'utilisateur@exemple.fr', motDePasse: 'mot-de-passe' }),
    ).toEqual({ email: 'utilisateur@exemple.fr', motDePasse: 'mot-de-passe' });
  });

  it('refuse un e-mail invalide avec un message français', () => {
    const resultat = zLogin.safeParse({ email: 'invalide', motDePasse: 'secret' });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues[0]?.message).toBe('Adresse e-mail invalide');
    }
  });

  it('refuse un mot de passe vide', () => {
    expect(zLogin.safeParse({ email: 'utilisateur@exemple.fr', motDePasse: '' }).success).toBe(false);
  });

  it('exige un jeton de rafraîchissement non vide', () => {
    expect(zRefresh.safeParse({ refreshToken: 'jeton' }).success).toBe(true);
    expect(zRefresh.safeParse({ refreshToken: '' }).success).toBe(false);
  });
});
