// ============================================================================
// TAKT — Tests unitaires du filtre d'exceptions global
// Fichier : apps/backend/src/modules/common/http/all-exceptions.filter.spec.ts
// Ticket : TAKT-L01-03 — ST_TAKT §3.3, §3.4, TE-API-06
// ============================================================================

import { describe, it, expect, vi } from 'vitest';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ApiError } from './api-error';

interface HoteSimule {
  host: ArgumentsHost;
  json: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
}

function creerHote(exception: unknown, requestId = 'req-123'): HoteSimule {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status, json }),
      getRequest: () => ({ headers: {}, requestId }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('renvoie l’enveloppe normalisée pour une route inexistante (404)', () => {
    const { host, json, status } = creerHote(new HttpException('Not Found', HttpStatus.NOT_FOUND));

    filter.catch(new HttpException('Not Found', HttpStatus.NOT_FOUND), host);

    expect(status).toHaveBeenCalledWith(404);
    const corps = json.mock.calls[0]![0] as {
      data: unknown;
      error: { code: string; message?: string };
      meta: { requestId: string; timestamp: string };
    };
    expect(corps.data).toBeNull();
    expect(corps.error.code).toBe('NOT_FOUND');
    expect(corps.meta.requestId).toBe('req-123');
    expect(corps.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('mapping une erreur de validation sur le code VALIDATION_ERROR', () => {
    const { host, json } = creerHote(null);
    const exception = new HttpException(
      { code: 'VALIDATION_ERROR', details: [{ champ: 'email', message: 'Email invalide' }] },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, host);

    const corps = json.mock.calls[0]![0] as { error: { code: string; details: unknown } };
    expect(corps.error.code).toBe('VALIDATION_ERROR');
    expect(corps.error.details).toEqual([{ champ: 'email', message: 'Email invalide' }]);
  });

  it('conserve le code métier explicite d’une ApiError', () => {
    const { host, json } = creerHote(null);
    const exception = new ApiError('WORKFLOW_INVALID_TRANSITION', HttpStatus.CONFLICT);

    filter.catch(exception, host);

    const corps = json.mock.calls[0]![0] as { error: { code: string } };
    expect(corps.error.code).toBe('WORKFLOW_INVALID_TRANSITION');
  });

  it('ne divulgue jamais de stack trace (TE-API-06)', () => {
    const { host, json } = creerHote(null);

    filter.catch(new Error('boom interne secret'), host);

    const corps = json.mock.calls[0]![0] as Record<string, unknown>;
    expect(JSON.stringify(corps)).not.toContain('boom interne secret');
    expect(JSON.stringify(corps)).not.toContain('stack');
    expect(corps.error).toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it('masque le message interne d’une erreur 500 en production', () => {
    const { host, json } = creerHote(null);

    filter.catch(new Error('detail interne'), host);

    const corps = json.mock.calls[0]![0] as { error: { message?: string } };
    expect(corps.error.message).toBeUndefined();
  });

  it('conserve le message d’une erreur applicative (4xx)', () => {
    const { host, json } = creerHote(null);

    // 423 « Locked » n'existe pas dans l'enum `HttpStatus` de Nest : on
    // utilise le code HTTP littéral du catalogue ST_TAKT §3.4.
    filter.catch(new HttpException('Séance verrouillée', 423), host);

    const corps = json.mock.calls[0]![0] as { error: { code: string; message?: string } };
    expect(corps.error.code).toBe('SEANCE_LOCKED');
    expect(corps.error.message).toBe('Séance verrouillée');
  });

  it('renvoie 500 pour une erreur non_HTTP', () => {
    const { host, json, status } = creerHote(null);

    filter.catch(new TypeError('oups'), host);

    expect(status).toHaveBeenCalledWith(500);
    const corps = json.mock.calls[0]![0] as { error: { code: string } };
    expect(corps.error.code).toBe('INTERNAL_ERROR');
  });
});
