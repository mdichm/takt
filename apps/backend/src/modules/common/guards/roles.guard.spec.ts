// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { RolesGuard } from './roles.guard';
import { UtilisateurConnecte } from './jwt-auth.guard';

/** Reflector mock qui retourne des métadonnées configurées. */
class ReflectorMock {
  private metadonnees: Record<string, unknown> = {};
  get<T = unknown>(key: string): T | undefined {
    return this.metadonnees[key] as T | undefined;
  }
  set(key: string, valeur: unknown): void {
    this.metadonnees[key] = valeur;
  }
}

/** Crée un mock d'ExecutionContext avec les métadonnées et la requête données. */
function creerContexte(utilisateur: UtilisateurConnecte | undefined): ExecutionContext {
  const getHandler = () => ({});
  const getClass = () => ({});
  const switchToHttp = () => ({
    getRequest: () => ({ user: utilisateur }),
  });
  return {
    getHandler,
    getClass,
    switchToHttp,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('autorise l’accès si aucun rôle n’est requis (pas de métadonnées @Roles)', () => {
    const reflector = new ReflectorMock();
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const contexte = creerContexte(undefined);
    expect(guard.canActivate(contexte)).toBe(true);
  });

  it('autorise l’accès si la liste de rôles autorisés est vide', () => {
    const reflector = new ReflectorMock();
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const contexte = creerContexte({ sub: 'u1', role: 'rdep', departementIds: [] });
    expect(guard.canActivate(contexte)).toBe(true);
  });

  it('autorise l’accès si le rôle de l’utilisateur figure dans la liste autorisée', () => {
    const reflector = new ReflectorMock();
    reflector.set('roles', ['admin', 'gest']);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const contexte = creerContexte({
      sub: 'u1',
      role: 'gest',
      departementIds: ['d1'],
    });
    expect(guard.canActivate(contexte)).toBe(true);
  });

  it('refuse l’accès (403) si le rôle de l’utilisateur n’est pas dans la liste autorisée', () => {
    const reflector = new ReflectorMock();
    reflector.set('roles', ['admin']);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const contexte = creerContexte({
      sub: 'u1',
      role: 'rdep',
      departementIds: [],
    });
    expect(() => guard.canActivate(contexte)).toThrow(HttpException);
  });

  it('refuse l’accès (403) si aucun utilisateur n’est connecté sur une route protégée', () => {
    const reflector = new ReflectorMock();
    reflector.set('roles', ['admin']);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const contexte = creerContexte(undefined);
    expect(() => guard.canActivate(contexte)).toThrow(HttpException);
  });
});
