// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import {
  zAccessTokenClaims,
  zLogin,
  zRefresh,
  zRefreshCookie,
  zRefreshTokenClaims,
} from '../src/auth';

describe('contrats d’authentification', () => {
  it('accepte une charge utile de connexion valide', () => {
    expect(zLogin.parse({ email: 'utilisateur@exemple.fr', motDePasse: 'mot-de-passe' })).toEqual({
      email: 'utilisateur@exemple.fr',
      motDePasse: 'mot-de-passe',
    });
  });

  it('refuse un e-mail invalide avec un message français', () => {
    const resultat = zLogin.safeParse({ email: 'invalide', motDePasse: 'secret' });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues[0]?.message).toBe('Adresse e-mail invalide');
    }
  });

  it('refuse un mot de passe vide', () => {
    expect(zLogin.safeParse({ email: 'utilisateur@exemple.fr', motDePasse: '' }).success).toBe(
      false,
    );
  });

  it('valide les claims d’un access token', () => {
    const claims = {
      typ: 'access',
      sub: '11111111-1111-4111-8111-111111111111',
      role: 'gest',
      departementIds: [],
      jti: '22222222-2222-4222-8222-222222222222',
      iat: 1,
      nbf: 1,
      exp: 2,
      iss: 'takt',
      aud: 'takt-api',
    };

    expect(zAccessTokenClaims.parse(claims)).toEqual(claims);
    expect(zAccessTokenClaims.safeParse({ ...claims, role: 'inconnu' }).success).toBe(false);
  });

  it('valide les claims d’un refresh token', () => {
    const claims = {
      typ: 'refresh',
      sub: '11111111-1111-4111-8111-111111111111',
      familyId: '33333333-3333-4333-8333-333333333333',
      jti: '22222222-2222-4222-8222-222222222222',
      iat: 1,
      nbf: 1,
      exp: 2,
      iss: 'takt',
      aud: 'takt-api',
    };

    expect(zRefreshTokenClaims.parse(claims)).toEqual(claims);
    expect(zRefreshTokenClaims.safeParse({ ...claims, typ: 'access' }).success).toBe(false);
  });

  it('exige un jeton de rafraîchissement non vide', () => {
    expect(zRefresh.safeParse({ refreshToken: 'jeton' }).success).toBe(true);
    expect(zRefresh.safeParse({ refreshToken: '' }).success).toBe(false);
  });

  it('accepte le renouvellement par cookie sans corps explicite', () => {
    expect(zRefreshCookie.safeParse({}).success).toBe(true);
    expect(zRefreshCookie.safeParse({ refreshToken: undefined }).success).toBe(true);
    expect(zRefreshCookie.safeParse({ refreshToken: 'jeton' }).success).toBe(true);
    expect(zRefreshCookie.safeParse({ refreshToken: '' }).success).toBe(false);
  });
});
