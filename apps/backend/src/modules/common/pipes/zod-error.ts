// ============================================================================
// TAKT — Formatage des erreurs de validation Zod
// Fichier : apps/backend/src/modules/common/pipes/zod-error.ts
// Ticket : TAKT-L01-03 — GG-05, ST_TAKT §3.4
// ============================================================================

import { ZodError } from 'zod';

/** Détail d'une erreur de validation, conforme au catalogue ST_TAKT §3.4. */
export interface ValidationErrorDetail {
  /** Chemin du champ fautif ; `corps` pour une erreur à la racine. */
  champ: string;
  /** Message d'erreur en français. */
  message: string;
}

/** Convertit une `ZodError` en détails lisibles (champ + message). */
export function formaterErreursZod(erreur: ZodError): ValidationErrorDetail[] {
  return erreur.issues.map((issue) => ({
    champ: issue.path.join('.') || 'corps',
    message: issue.message,
  }));
}
