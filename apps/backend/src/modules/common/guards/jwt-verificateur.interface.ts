// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { zAccessTokenClaims } from '@takt/contracts';

/**
 * Contrat d'un vérificateur de jeton d'accès JWT.
 * L'implémentation concrète est fournie par le module auth (qui possède
 * TokenService) afin de respecter la règle de dépendance : common ne doit pas
 * importer auth.
 */
export interface VerificateurJwt {
  /** Vérifie et retourne les claims d'un access token, ou lève une erreur. */
  verifier(token: string): ReturnType<typeof zAccessTokenClaims.parse>;
}

/**
 * Jeton d'injection pour le vérificateur JWT.
 * Fournit l'implémentation concrète depuis le module auth.
 */
export const VERIFICATEUR_JWT = 'VERIFICATEUR_JWT';

/**
 * Extrait le token Bearer depuis l'en-tête Authorization de la requête HTTP.
 * Retourne undefined si absent ou mal formé.
 */
export function extraireBearerToken(req: { headers?: { authorization?: string } }): string | undefined {
  const header = req.headers?.authorization;
  if (!header) {
    return undefined;
  }
  const correspondance = header.match(/^Bearer\s+(.+)$/i);
  return correspondance?.[1];
}
