// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zCodeErreurApi, zEnvelope, zErreurApi, zMetaApi, zPaginationMeta, zPaginationQuery } from '../src/common';

describe('contrats communs', () => {
  it('applique les valeurs de pagination par défaut', () => {
    expect(zPaginationQuery.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('coerce les paramètres de pagination textuels', () => {
    expect(zPaginationQuery.parse({ page: '2', pageSize: '50' })).toEqual({
      page: 2,
      pageSize: 50,
    });
  });

  it.each([
    [{ page: 0 }, 'La page doit être supérieure à 0'],
    [{ pageSize: 201 }, 'La taille de page ne peut pas dépasser 200'],
  ])('refuse une pagination invalide : %s', (valeur, message) => {
    const resultat = zPaginationQuery.safeParse(valeur);
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues[0]?.message).toBe(message);
    }
  });

  it('valide les métadonnées paginées', () => {
    expect(
      zPaginationMeta.parse({ page: 1, pageSize: 20, total: 150 }),
    ).toEqual({ page: 1, pageSize: 20, total: 150 });
  });

  it.each([
    'VALIDATION_ERROR',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'WORKFLOW_INVALID_TRANSITION',
    'SEANCE_LOCKED',
    'RATE_LIMITED',
    'INTERNAL_ERROR',
  ])('accepte le code d’erreur %s', (code) => {
    expect(zCodeErreurApi.parse(code)).toBe(code);
  });

  it('refuse un code d’erreur hors catalogue', () => {
    expect(zCodeErreurApi.safeParse('CODE_INCONNU').success).toBe(false);
  });

  it('valide un corps d’erreur métier', () => {
    expect(
      zErreurApi.parse({ code: 'UNAUTHORIZED', message: 'session expirée' }),
    ).toEqual({ code: 'UNAUTHORIZED', message: 'session expirée' });
    expect(zErreurApi.parse({ code: 'INTERNAL_ERROR' })).toEqual({
      code: 'INTERNAL_ERROR',
    });
    expect(zErreurApi.safeParse({ code: 'CODE_INCONNU' }).success).toBe(false);
  });

  it('valide les métadonnées de réponse', () => {
    expect(
      zMetaApi.parse({
        requestId: 'req-1',
        timestamp: '2026-11-06T00:00:00Z',
      }),
    ).toEqual({
      requestId: 'req-1',
      timestamp: '2026-11-06T00:00:00Z',
    });
    expect(
      zMetaApi.parse({
        requestId: 'req-2',
        timestamp: '2026-11-06T00:00:00Z',
        page: 1,
        pageSize: 20,
        total: 150,
      }),
    ).toEqual({
      requestId: 'req-2',
      timestamp: '2026-11-06T00:00:00Z',
      page: 1,
      pageSize: 20,
      total: 150,
    });
    expect(
      zMetaApi.safeParse({ timestamp: '2026-11-06T00:00:00Z' }).success,
    ).toBe(false); // requestId requis
  });

  it('construit une enveloppe de succès avec data', () => {
    const schema = zEnvelope(z.string());
    const donnees = schema.parse({
      data: 'payload',
      error: null,
      meta: { requestId: 'req-1', timestamp: '2026-11-06T00:00:00Z' },
    });
    expect(donnees.data).toBe('payload');
    expect(donnees.error).toBeNull();
  });

  it('construit une enveloppe d’erreur sans data', () => {
    const schema = zEnvelope(z.string());
    const donnees = schema.parse({
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'session expirée' },
      meta: { requestId: 'req-2', timestamp: '2026-11-06T00:00:00Z' },
    });
    expect(donnees.data).toBeNull();
    expect(donnees.error?.code).toBe('UNAUTHORIZED');
    expect(donnees.error?.message).toBe('session expirée');
  });

  it('refuse une enveloppe avec un code d’erreur invalide', () => {
    const schema = zEnvelope(z.string());
    expect(
      schema.safeParse({
        data: null,
        error: { code: 'CODE_INCONNU' },
        meta: { requestId: 'req-3', timestamp: '2026-11-06T00:00:00Z' },
      }).success,
    ).toBe(false);
  });
});
