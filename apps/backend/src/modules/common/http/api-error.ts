// ============================================================================
// TAKT — Catalogue d'erreurs HTTP
// Fichier : apps/backend/src/modules/common/http/api-error.ts
// Ticket : TAKT-L01-03 — ST_TAKT §3.4, GG-06
//
// Règle : les réponses d'erreur sont limitées à ces 8 codes. Toute autre
// situation est ramenée à INTERNAL_ERROR.
// ============================================================================

/** Catalogue officiel des codes d'erreur de l'API (ST_TAKT §3.4). */
export const CODES_ERREUR_API = {
  BAD_REQUEST: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'WORKFLOW_INVALID_TRANSITION',
  LOCKED: 'SEANCE_LOCKED',
  TOO_MANY_REQUESTS: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL_ERROR',
} as const;

/** Code d'erreur métier exposé dans l'enveloppe `{ data, error, meta }`. */
export type CodeErreurApi = (typeof CODES_ERREUR_API)[keyof typeof CODES_ERREUR_API];

/** Correspondance entre code HTTP et code métier du catalogue. */
const CORRESPONDANCE_STATUT: Readonly<Record<number, CodeErreurApi>> = {
  400: CODES_ERREUR_API.BAD_REQUEST,
  401: CODES_ERREUR_API.UNAUTHORIZED,
  403: CODES_ERREUR_API.FORBIDDEN,
  404: CODES_ERREUR_API.NOT_FOUND,
  409: CODES_ERREUR_API.CONFLICT,
  423: CODES_ERREUR_API.LOCKED,
  429: CODES_ERREUR_API.TOO_MANY_REQUESTS,
  500: CODES_ERREUR_API.INTERNAL,
};

/**
 * Traduit un code HTTP en code métier du catalogue.
 * Les statuts absents du catalogue (502, 503, 504…) sont ramenés à
 * `INTERNAL_ERROR` afin de ne jamais exposer un code hors specification.
 */
export function codeErreurPourStatut(statut: number): CodeErreurApi {
  return CORRESPONDANCE_STATUT[statut] ?? CODES_ERREUR_API.INTERNAL;
}

/** Vérifie qu'une valeur appartient bien au catalogue des 8 codes d'erreur. */
export function estCodeErreurApi(valeur: unknown): valeur is CodeErreurApi {
  return (
    typeof valeur === 'string' && Object.values(CODES_ERREUR_API).includes(valeur as CodeErreurApi)
  );
}
