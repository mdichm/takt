// ============================================================================
// TAKT — Filtre d'exceptions global
// Fichier : apps/backend/src/modules/common/http/all-exceptions.filter.ts
// Ticket : TAKT-L01-03 — ST_TAKT §3.3, §3.4, TE-API-06, GG-06
//
// Rôle : convertir toute exception en réponse normalisée
// `{ data: null, error, meta }` limitée aux 8 codes du catalogue, sans
// jamais exposer de stack trace ni de détail technique interne.
// ============================================================================

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { codeErreurPourStatut, estCodeErreurApi } from './api-error';
import { EnveloppeApi, ErreurApi, horodatageIso } from './api-envelope';
import { RequeteHttp, ReponseHttp, resoudreRequestId } from './http-types';

/** Corps d'erreur éventuellement fourni par l'exception applicative. */
interface CorpsErreurApplication {
  code?: unknown;
  message?: unknown;
  details?: unknown;
}

/**
 * Extrait le code métier, le message et les détails d'une `HttpException`.
 * Le code est retenu uniquement s'il appartient au catalogue (GG-06).
 */
function extraireCorpsErreur(exception: HttpException): CorpsErreurApplication {
  const reponse = exception.getResponse();

  if (typeof reponse === 'string') {
    return { message: reponse };
  }

  if (typeof reponse === 'object' && reponse !== null) {
    return reponse as CorpsErreurApplication;
  }

  return {};
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const contexte = host.switchToHttp();
    const reponse = contexte.getResponse<ReponseHttp>();
    const requete = contexte.getRequest<RequeteHttp>();

    const statut =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const code = codeErreurPourStatut(statut);

    let message: string | undefined;
    let details: unknown;

    if (exception instanceof HttpException) {
      const corps = extraireCorpsErreur(exception);
      details = corps.details;
      // Le message applicatif n'est exposé que pour les erreurs 4xx :
      // une erreur 5xx peut contenir une information technique interne.
      if (statut < 500 && typeof corps.message === 'string') {
        message = corps.message;
      }
      if (typeof corps.code === 'string' && estCodeErreurApi(corps.code)) {
        this.logger.warn(`Erreur applicative ${corps.code} (HTTP ${statut})`);
      }
    } else {
      this.logger.error(
        `Erreur non interceptée : ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const erreur: ErreurApi = { code };
    if (message !== undefined) {
      erreur.message = message;
    }
    if (details !== undefined) {
      erreur.details = details;
    }

    const enveloppe: EnveloppeApi = {
      data: null,
      error: erreur,
      meta: {
        requestId: resoudreRequestId(requete),
        timestamp: horodatageIso(),
      },
    };

    reponse.status(statut).json(enveloppe);
  }
}
