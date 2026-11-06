// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { zEmail, zRoleCode, zUuid } from './common';

/** Charge utile de connexion. */
export const zLogin = z.object({
  email: zEmail,
  motDePasse: z.string().min(1, 'Le mot de passe est requis'),
});

/** Charge utile de renouvellement du jeton d’accès. */
export const zRefresh = z.object({
  refreshToken: z.string().min(1, 'Le jeton de rafraîchissement est requis'),
});

/** Charge utile de renouvellement par cookie HttpOnly (refresh token transmis uniquement dans l’en-tête Cookie). */
export const zRefreshCookie = z.object({
  refreshToken: z.string().min(1, 'Le jeton de rafraîchissement est requis').optional(),
});

export type LoginInput = z.infer<typeof zLogin>;
export type RefreshInput = z.infer<typeof zRefresh>;
export type RefreshCookieInput = z.infer<typeof zRefreshCookie>;

/** Claims communs aux jetons TAKT. */
const zClaimsJwtBase = z.object({
  sub: zUuid,
  jti: z.string().uuid('Identifiant de jeton invalide'),
  iat: z.number().int().nonnegative(),
  nbf: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
  iss: z.string().min(1),
  aud: z.string().min(1),
});

/** Claims d'un jeton d'accès applicatif. */
export const zAccessTokenClaims = zClaimsJwtBase.extend({
  typ: z.literal('access'),
  role: zRoleCode,
  departementIds: z.array(zUuid),
});

/** Claims d'un jeton de rafraîchissement rotatif. */
export const zRefreshTokenClaims = zClaimsJwtBase.extend({
  typ: z.literal('refresh'),
  familyId: z.string().uuid('Famille de jetons invalide'),
});

export type AccessTokenClaims = z.infer<typeof zAccessTokenClaims>;
export type RefreshTokenClaims = z.infer<typeof zRefreshTokenClaims>;
