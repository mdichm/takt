// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventsGuard } from './events.guard';
import { TokenService } from '../auth/token.service';

const CLAIMS = {
  sub: '11111111-1111-4111-8111-111111111111',
  role: 'admin',
  departementIds: [],
} as const;

function creerContexte(authorization?: string, accessToken?: string): {
  contexte: ExecutionContext;
  requete: { headers: { authorization?: string }; query: { access_token?: string }; utilisateur?: unknown };
} {
  const requete = {
    headers: authorization === undefined ? {} : { authorization },
    query: accessToken === undefined ? {} : { access_token: accessToken },
  };
  const contexte = {
    switchToHttp: () => ({ getRequest: () => requete }),
  } as unknown as ExecutionContext;
  return { contexte, requete };
}

describe('EventsGuard', () => {
  it('accepte un access token Bearer', () => {
    const verifier = vi.fn().mockReturnValue(CLAIMS);
    const guard = new EventsGuard({ verifyAccessToken: verifier } as unknown as TokenService);
    const { contexte, requete } = creerContexte('Bearer access-valide');

    expect(guard.canActivate(contexte)).toBe(true);
    expect(requete.utilisateur).toBe(CLAIMS);
  });

  it('accepte un access token en query param EventSource', () => {
    const guard = new EventsGuard({
      verifyAccessToken: vi.fn().mockReturnValue(CLAIMS),
    } as unknown as TokenService);
    const { contexte } = creerContexte(undefined, 'access-valide');

    expect(guard.canActivate(contexte)).toBe(true);
  });

  it('refuse une requête sans jeton', () => {
    const guard = new EventsGuard({ verifyAccessToken: vi.fn() } as unknown as TokenService);
    const { contexte } = creerContexte();

    expect(() => guard.canActivate(contexte)).toThrowError('Jeton d’accès requis');
  });

  it('refuse un refresh token', () => {
    const guard = new EventsGuard({
      verifyAccessToken: vi.fn().mockImplementation(() => {
        throw new Error('Claims JWT invalides');
      }),
    } as unknown as TokenService);
    const { contexte } = creerContexte('Bearer refresh-invalide');

    expect(() => guard.canActivate(contexte)).toThrowError('Jeton d’accès invalide');
  });
});
