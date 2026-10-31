// ============================================================================
// TAKT — Types HTTP minimaux
// Fichier : apps/backend/src/modules/common/http/http-types.ts
// Ticket : TAKT-L01-03
//
// Le squelette ne dépend pas des types `express` : seuls les members
// réellement utilisés par l'API sont décrits ici (aucun `any` — GG-04).
// ============================================================================

import { randomUUID } from 'node:crypto';

/** En-tête de corrélation transporté par la requête et la réponse. */
export const EN_TETE_REQUEST_ID = 'x-request-id';

/** Requête HTTP, vue par les composants transverses du module `common`. */
export interface RequeteHttp {
  /** En-têtes de la requête. */
  headers: Record<string, string | string[] | undefined>;
  /** Identifiant de corrélation posé par le middleware. */
  requestId?: string;
  /** Chemin demandé (préfixe `/api/v1` inclus). */
  originalUrl?: string;
}

/** Réponse HTTP, vue par les composants transverses du module `common`. */
export interface ReponseHttp {
  /** Règle le code de statut HTTP. */
  status(code: number): ReponseHttp;
  /** Sérialise le corps de la réponse. */
  json(corps: unknown): void;
  /** Pose un en-tête de réponse (facultatif selon l'adaptateur). */
  setHeader?(nom: string, valeur: string): void;
}

/**
 * Détermine l'identifiant de corrélation d'une requête.
 * L'identifiant client (`x-request-id`) est prioritaire ; à défaut, un UUID
 * est généré afin que chaque requête soit traçable.
 */
export function resoudreRequestId(requete: RequeteHttp): string {
  if (requete.requestId) {
    return requete.requestId;
  }

  const fourni = requete.headers?.[EN_TETE_REQUEST_ID];
  if (typeof fourni === 'string' && fourni.length > 0) {
    return fourni;
  }

  return randomUUID();
}
