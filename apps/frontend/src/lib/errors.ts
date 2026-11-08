// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { zCodeErreurApi, type CodeErreurApi } from '@takt/contracts';

/** Erreur métier normalisée depuis une réponse HTTP de l'API. */
export interface ErreurApi {
  code: CodeErreurApi;
  statut: number;
  message: string;
  details?: unknown;
  requestId?: string;
}

/** Erreur HTTP levée par le client sur toute réponse en échec (4xx / 5xx). */
export class ErreurHttp extends Error {
  readonly code: CodeErreurApi;
  readonly statut: number;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(
    code: CodeErreurApi,
    statut: number,
    message: string,
    details?: unknown,
    requestId?: string,
  ) {
    super(message);
    this.name = 'ErreurHttp';
    this.code = code;
    this.statut = statut;
    this.details = details;
    if (requestId !== undefined) {
      this.requestId = requestId;
    }
  }
}

/** Messages utilisateur en français, par code d’erreur du catalogue (ST_TAKT §3.4). */
export const MESSAGES_ERREUR_FR: Record<CodeErreurApi, string> = {
  VALIDATION_ERROR: 'Les informations saisies sont invalides. Vérifiez les champs indiqués.',
  UNAUTHORIZED: 'Votre session a expiré. Reconnectez-vous pour continuer.',
  FORBIDDEN:
    "Vous n'avez pas les droits nécessaires pour cette action. Contactez un administrateur.",
  NOT_FOUND: 'La ressource demandée est introuvable ou a été supprimée.',
  WORKFLOW_INVALID_TRANSITION:
    'Cette action n’est pas autorisée dans l’état actuel de la ressource.',
  SEANCE_LOCKED:
    'Cette séance est verrouillée par un autre utilisateur. Déverrouillez-la ou contactez-la.',
  RATE_LIMITED: 'Trop de tentatives. Patientez quelques instants avant de réessayer.',
  INTERNAL_ERROR: 'Une erreur interne est survenue. Réessayez plus tard ou contactez le support.',
};

/** Vérifie si une erreur normale relate d’une perte d’authentification. */
export function estErreurAuth(erreur: ErreurApi): boolean {
  return erreur.code === 'UNAUTHORIZED';
}

/** Retourne le message à afficher à l’utilisateur.
 *
 * Le message fourni par le serveur l’emporte systématiquement (il est déjà
 * rédigé pour l’utilisateur, notamment sur les 4xx métier comme 409).
 * Sinon, le message générique du catalogue est utilisé.
 */
export function versMessageActionnable(erreur: ErreurApi): string {
  if (erreur.message) {
    return erreur.message;
  }
  const catalogue = MESSAGES_ERREUR_FR[erreur.code];
  return catalogue ?? MESSAGES_ERREUR_FR.INTERNAL_ERROR;
}

/** Déduit le code d’erreur depuis un statut HTTP quand le corps est silencieux. */
function codeDepuisStatut(statut: number): CodeErreurApi {
  switch (statut) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'WORKFLOW_INVALID_TRANSITION';
    case 423:
      return 'SEANCE_LOCKED';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL_ERROR';
  }
}

/** Mappe une réponse HTTP échouée vers une ErreurApi normalisée.
 *
 * Le corps de l’enveloppe { data, error, meta } est inspecté quand présent :
 * son code (s’il appartient au catalogue) et son message sont privilégiés.
 * Sinon, le code est déduit du statut HTTP. Aucun détail technique ni pile
 * d’appel n’est exposé à l’utilisateur (GG-06).
 */
export function mapHttpError(
  reponse: Response,
  corps?: {
    code?: string;
    message?: string;
    details?: unknown;
    requestId?: string;
  },
): ErreurApi {
  let code: CodeErreurApi;
  const codeParsed = zCodeErreurApi.safeParse(corps?.code ?? '');
  if (codeParsed.success) {
    code = codeParsed.data;
  } else {
    code = codeDepuisStatut(reponse.status);
  }
  const statut = reponse.status;
  const message = corps?.message ?? MESSAGES_ERREUR_FR[code] ?? MESSAGES_ERREUR_FR.INTERNAL_ERROR;
  return new ErreurHttp(code, statut, message, corps?.details, corps?.requestId);
}
