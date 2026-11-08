// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard, UtilisateurConnecte } from './jwt-auth.guard';
import { VerificateurJwt } from './jwt-verificateur.interface';

class ReflectorMock {
  private metadonnees: Record<string, unknown> = {};
  get<T = unknown>(key: string): T | undefined {
    return this.metadonnees[key] as T | undefined;
  }
  set(key: string, valeur: unknown): void {
    this.metadonnees[key] = valeur;
  }
}

function creerContexte(
  estPublique: boolean | undefined,
  token: string | undefined,
): ExecutionContext {
  const getHandler = () => ({});
  const headers: { authorization?: string } = {};
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  const requestObj: { headers: { authorization?: string }; user?: unknown } = {
    headers,
  };
  const switchToHttp = () => ({
    getRequest: () => requestObj,
  });
  return {
    getHandler,
    switchToHttp,
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('autorise l’accès si la route est marquée publique', () => {
    const verificateur = { verifier: vi.fn() } as unknown as VerificateurJwt;
    const reflector = new ReflectorMock();
    reflector.set('estPublique', true);
    const guard = new JwtAuthGuard(verificateur, reflector as unknown as Reflector);
    const contexte = creerContexte(true, undefined);
    expect(guard.canActivate(contexte)).toBe(true);
    expect(verificateur.verifier).not.toHaveBeenCalled();
  });

  it('refuse (401) si aucun token Bearer n’est présent', () => {
    const verificateur = { verifier: vi.fn() } as unknown as VerificateurJwt;
    const reflector = new ReflectorMock();
    reflector.set('estPublique', undefined);
    const guard = new JwtAuthGuard(verificateur, reflector as unknown as Reflector);
    const contexte = creerContexte(undefined, undefined);
    expect(() => guard.canActivate(contexte)).toThrow(HttpException);
  });

  it('refuse (401) si le token est invalide', () => {
    const verificateur = {
      verifier: vi.fn().mockImplementation(() => {
        throw new Error('token invalide');
      }),
    } as unknown as VerificateurJwt;
    const reflector = new ReflectorMock();
    reflector.set('estPublique', undefined);
    const guard = new JwtAuthGuard(verificateur, reflector as unknown as Reflector);
    const contexte = creerContexte(undefined, 'faux.token');
    expect(() => guard.canActivate(contexte)).toThrow(HttpException);
  });

  it('attache l’identité utilisateur à la requête si le token est valide', () => {
    const claims: UtilisateurConnecte = {
      sub: 'u1',
      role: 'gest',
      departementIds: ['d1'],
    };
    const verificateur = {
      verifier: vi.fn().mockReturnValue(claims),
    } as unknown as VerificateurJwt;
    const reflector = new ReflectorMock();
    reflector.set('estPublique', undefined);
    const guard = new JwtAuthGuard(verificateur, reflector as unknown as Reflector);
    const contexte = creerContexte(undefined, 'valide.token');
    const resultat = guard.canActivate(contexte);
    expect(resultat).toBe(true);
    const request = (
      contexte as { switchToHttp: () => { getRequest: () => { user?: UtilisateurConnecte } } }
    )
      .switchToHttp()
      .getRequest();
    expect(request.user).toEqual(claims);
  });
});
