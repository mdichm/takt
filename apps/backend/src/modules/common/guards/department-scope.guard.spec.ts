// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { DepartmentScopeGuard } from './department-scope.guard';
import { UtilisateurConnecte } from './jwt-auth.guard';

class ReflectorMock {
  private metadonnees: Record<string, unknown> = {};
  get<T = unknown>(key: string): T | undefined {
    return this.metadonnees[key] as T | undefined;
  }
  set(key: string, valeur: unknown): void {
    this.metadonnees[key] = valeur;
  }
}

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

describe('DepartmentScopeGuard', () => {
  it('autorise l’accès si le scope département n’est pas requis', () => {
    const reflector = new ReflectorMock();
    const guard = new DepartmentScopeGuard(reflector as unknown as Reflector);
    const contexte = creerContexte({ sub: 'u1', role: 'rdep', departementIds: [] });
    expect(guard.canActivate(contexte)).toBe(true);
  });

  it('autorise l’accès pour un admin sans département (tableau vide = tous)', () => {
    const reflector = new ReflectorMock();
    reflector.set('departmentScope', true);
    const guard = new DepartmentScopeGuard(reflector as unknown as Reflector);
    const contexte = creerContexte({
      sub: 'u1',
      role: 'admin',
      departementIds: [],
    });
    expect(guard.canActivate(contexte)).toBe(true);
  });

  it('autorise l’accès pour un dir sans département (tableau vide = tous)', () => {
    const reflector = new ReflectorMock();
    reflector.set('departmentScope', true);
    const guard = new DepartmentScopeGuard(reflector as unknown as Reflector);
    const contexte = creerContexte({
      sub: 'u1',
      role: 'dir',
      departementIds: [],
    });
    expect(guard.canActivate(contexte)).toBe(true);
  });

  it('autorise l’accès pour un rdep ayant un département', () => {
    const reflector = new ReflectorMock();
    reflector.set('departmentScope', true);
    const guard = new DepartmentScopeGuard(reflector as unknown as Reflector);
    const contexte = creerContexte({
      sub: 'u1',
      role: 'rdep',
      departementIds: ['d1'],
    });
    expect(guard.canActivate(contexte)).toBe(true);
  });

  it('refuse l’accès (403) pour un rdep sans département sur une route avec scope', () => {
    const reflector = new ReflectorMock();
    reflector.set('departmentScope', true);
    const guard = new DepartmentScopeGuard(reflector as unknown as Reflector);
    const contexte = creerContexte({
      sub: 'u1',
      role: 'rdep',
      departementIds: [],
    });
    expect(() => guard.canActivate(contexte)).toThrow(HttpException);
  });

  it('refuse l’accès (403) si aucun utilisateur n’est connecté sur une route avec scope', () => {
    const reflector = new ReflectorMock();
    reflector.set('departmentScope', true);
    const guard = new DepartmentScopeGuard(reflector as unknown as Reflector);
    const contexte = creerContexte(undefined);
    expect(() => guard.canActivate(contexte)).toThrow(HttpException);
  });
});
