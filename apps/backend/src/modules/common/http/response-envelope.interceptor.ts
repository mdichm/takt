// ============================================================================
// TAKT — Intercepteur d'enveloppe de réponse
// Fichier : apps/backend/src/modules/common/http/response-envelope.interceptor.ts
// Ticket : TAKT-L01-03 — ST_TAKT §3.3, GG-06
//
// Rôle : toute réponse applicative est renvoyée sous la forme
// `{ data, error: null, meta }`. Les routes opérationnelles décorées avec
// `@RawResponse()` (comme `/health`) en sont exemptées.
// ============================================================================

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { EnveloppeApi, estDonneesPaginees, horodatageIso } from './api-envelope';
import { RequeteHttp, resoudreRequestId } from './http-types';
import { estReponseBrute } from './raw-response.decorator';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();

    if (estReponseBrute(handler)) {
      return next.handle();
    }

    const requete = context.switchToHttp().getRequest<RequeteHttp>();
    const requestId = resoudreRequestId(requete);

    return next.handle().pipe(
      map((donnees: unknown): EnveloppeApi => {
        if (estDonneesPaginees(donnees)) {
          return {
            data: donnees.data,
            error: null,
            meta: {
              requestId,
              timestamp: horodatageIso(),
              ...donnees.meta,
            },
          };
        }

        return {
          data: donnees ?? null,
          error: null,
          meta: {
            requestId,
            timestamp: horodatageIso(),
          },
        };
      }),
    );
  }
}
