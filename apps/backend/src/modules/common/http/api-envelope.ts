// ============================================================================
// TAKT — Enveloppe de réponse API
// Fichier : apps/backend/src/modules/common/http/api-envelope.ts
// Ticket : TAKT-L01-03 — ST_TAKT §3.3, GG-06
// ============================================================================

import type { CodeErreurApi } from './api-error';

/** Métadonnées communes à toutes les réponses (ST_TAKT §3.3). */
export interface MetaApi {
  /** Identifiant de corrélation de la requête. */
  requestId: string;
  /** Horodatage ISO 8601 de la réponse. */
  timestamp: string;
  /** Page courante (listes paginées uniquement). */
  page?: number;
  /** Taille de page (listes paginées uniquement). */
  pageSize?: number;
  /** Nombre total d'éléments (listes paginées uniquement). */
  total?: number;
}

/** Corps de l'erreur, conformément au catalogue ST_TAKT §3.4. */
export interface ErreurApi {
  /** Code métier parmi les 8 codes du catalogue. */
  code: CodeErreurApi;
  /** Message destiné au client (jamais de détail technique interne). */
  message?: string;
  /** Détails structurés (erreurs de validation, par exemple). */
  details?: unknown;
}

/** Enveloppe unique de l'API : `{ data, error, meta }`. */
export interface EnveloppeApi<T = unknown> {
  /** Données métier ; `null` en cas d'erreur. */
  data: T | null;
  /** Erreur ; `null` en cas de succès. */
  error: ErreurApi | null;
  /** Métadonnées de la réponse. */
  meta: MetaApi;
}

/** Construit l'horodatage ISO 8601 des métadonnées de réponse. */
export function horodatageIso(): string {
  return new Date().toISOString();
}
