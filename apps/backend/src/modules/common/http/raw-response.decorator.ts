// ============================================================================
// TAKT — Décorateur « réponse brute »
// Fichier : apps/backend/src/modules/common/http/raw-response.decorator.ts
// Ticket : TAKT-L01-03
//
// L'enveloppe `{ data, error, meta }` s'applique aux routes de l'API
// (`/api/v1/**`). Les endpoints opérationnels, comme `/health`, exposent un
// corps operational simple et ne sont donc pas enveloppés.
// ============================================================================

/** Clé de métadonnée utilisée pour marquer une route comme « réponse brute ». */
export const RAW_RESPONSE_KEY = 'takt:raw-response';

/**
 * Marque une route comme renvoyant une réponse brute, hors enveloppe API.
 *
 * @example
 * ```ts
 * @RawResponse()
 * @Get()
 * health(): HealthStatus { ... }
 * ```
 */
export function RawResponse(): MethodDecorator {
  return (cible: object, cle: string | symbol, descripteur: PropertyDescriptor) => {
    Reflect.defineMetadata(RAW_RESPONSE_KEY, true, descripteur.value);
    return descripteur;
  };
}

/** Indique si une route est marquée comme « réponse brute ». */
export function estReponseBrute(handler: unknown): boolean {
  return typeof handler === 'function' && Reflect.getMetadata(RAW_RESPONSE_KEY, handler) === true;
}
