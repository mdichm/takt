// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { ExecutionContext, HttpException } from '@nestjs/common';
import { EtatVersion } from '@takt/contracts';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { VersionStateGuard } from './version-state.guard';

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
  etatCourant: EtatVersion | undefined,
): ExecutionContext {
  const getHandler = () => ({});
  const getClass = () => ({});
  const switchToHttp = () => ({
    getRequest: () => ({ etatVersionCourant: etatCourant }),
  });
  return {
    getHandler,
    getClass,
    switchToHttp,
  } as unknown as ExecutionContext;
}

describe('VersionStateGuard', () => {
  it('autorise l’accès si aucun état n’est requis (pas de métadonnées)', () => {
    const reflector = new ReflectorMock();
    const guard = new VersionStateGuard(reflector as unknown as Reflector);
    const contexte = creerContexte('edition');
    expect(guard.canActivate(contexte)).toBe(true);
  });

  it('autorise l’accès si l’état courant figure dans la liste autorisée', () => {
    const reflector = new ReflectorMock();
    reflector.set('versionStates', ['edition', 'valid_pedag']);
    const guard = new VersionStateGuard(reflector as unknown as Reflector);
    const contexte = creerContexte('edition');
    expect(guard.canActivate(contexte)).toBe(true);
  });

  it('refuse l’accès (403) si l’état courant n’est pas autorisé', () => {
    const reflector = new ReflectorMock();
    reflector.set('versionStates', ['publie']);
    const guard = new VersionStateGuard(reflector as unknown as Reflector);
    const contexte = creerContexte('edition');
    expect(() => guard.canActivate(contexte)).toThrow(HttpException);
  });

  it('refuse l’accès (403) si aucun état de version n’est déterminé', () => {
    const reflector = new ReflectorMock();
    reflector.set('versionStates', ['edition']);
    const contexte = creerContexte(undefined);
    const guard = new VersionStateGuard(reflector as unknown as Reflector);
    expect(() => guard.canActivate(contexte)).toThrow(HttpException);
  });
});
