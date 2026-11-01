// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { zEmail } from './common';

/** Charge utile de connexion. */
export const zLogin = z.object({
  email: zEmail,
  motDePasse: z.string().min(1, 'Le mot de passe est requis'),
});

/** Charge utile de renouvellement du jeton d’accès. */
export const zRefresh = z.object({
  refreshToken: z.string().min(1, 'Le jeton de rafraîchissement est requis'),
});

export type LoginInput = z.infer<typeof zLogin>;
export type RefreshInput = z.infer<typeof zRefresh>;
