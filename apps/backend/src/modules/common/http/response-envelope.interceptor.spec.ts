// ============================================================================
// TAKT — Tests unitaires de l'intercepteur d'enveloppe de réponse
// Fichier : apps/backend/src/modules/common/http/response-envelope.interceptor.spec.ts
// Ticket : TAKT-L01-03 — ST_TAKT §3.3, GG-06
// ============================================================================

import { describe, it, expect } from 'vitest';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';
import { RawResponse } from './raw-response.decorator';
import { EnveloppeApi } from './api-envelope';

function creerContexte(handler: (...args: unknown[]) => unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: {}, requestId: 'req-abc' }),
      getResponse: () => ({}),
    }),
    getHandler: () => handler,
  } as unknown as ExecutionContext;
}

function creerNext(valeur: unknown): CallHandler {
  return { handle: () => of(valeur) };
}

describe('ResponseEnvelopeInterceptor', () => {
  const interceptor = new ResponseEnvelopeInterceptor();

  it('enveloppe une réponse réussie dans { data, error, meta }', async () => {
    const resultat = (await firstValueFrom(
      interceptor.intercept(
        creerContexte(() => undefined),
        creerNext({ id: 42 }),
      ),
    )) as EnveloppeApi;

    expect(resultat.data).toEqual({ id: 42 });
    expect(resultat.error).toBeNull();
    expect(resultat.meta.requestId).toBe('req-abc');
    expect(resultat.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('normalise une réponse vide en data null', async () => {
    const resultat = (await firstValueFrom(
      interceptor.intercept(
        creerContexte(() => undefined),
        creerNext(undefined),
      ),
    )) as EnveloppeApi;

    expect(resultat.data).toBeNull();
    expect(resultat.error).toBeNull();
  });

  it('ne touche pas aux routes décorées avec @RawResponse()', async () => {
    class Controleur {
      @RawResponse()
      health(): { status: string } {
        return { status: 'ok' };
      }
    }

    const resultat = await firstValueFrom(
      interceptor.intercept(
        creerContexte(Controleur.prototype.health),
        creerNext({ status: 'ok' }),
      ),
    );

    expect(resultat).toEqual({ status: 'ok' });
  });
});
