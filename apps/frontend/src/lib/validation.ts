// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z, type ZodTypeAny } from 'zod';
import {
  zEnvelope,
  zLogin,
  zPaginationMeta,
  zRefresh,
  type CodeErreurApi,
  type MetaApi,
} from '@takt/contracts';
import { ErreurHttp, type ErreurApi } from './errors';

/** Schéma de la réponse de connexion : { accessToken, utilisateur } dans `data`. */
export const zReponseLogin = zEnvelope(
  z.object({
    accessToken: z.string().min(1, 'Le jeton d’accès est manquant'),
    utilisateur: z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      nom: z.string().min(1),
      prenom: z.string().min(1),
      role: z.string().min(1),
    }),
  }),
);

/** Schéma de la réponse de rafraîchissement : { accessToken } dans `data`. */
export const zReponseRefresh = zEnvelope(
  z.object({
    accessToken: z.string().min(1, 'Le jeton d’accès est manquant'),
  }),
);

/** Schéma d’une liste paginée : `data` est un tableau d’items de type T. */
export function zReponseListe(items: ZodTypeAny) {
  return zEnvelope(z.array(items));
}

/** Réexport des schémas partagés pour usage dans les stores et composants. */
export { zLogin, zRefresh, zPaginationMeta };

export type ReponseLogin = z.infer<typeof zReponseLogin>;
export type ReponseRefresh = z.infer<typeof zReponseRefresh>;
export type ReponseListe = z.infer<ReturnType<typeof zReponseListe>>;

/**
 * Valide une réponse brute du serveur contre un schéma Zod et retourne les
 * données typées. Lève une ErreurApi VALIDATION_ERROR si le corps ne
 * correspond pas à l’enveloppe attendue (GG-05).
 */
export function validerReponseApi<T extends ZodTypeAny>(
  schema: T,
  donnees: unknown,
): z.infer<T> {
  const resultat = schema.safeParse(donnees);
  if (!resultat.success) {
    const details = resultat.error.issues.map((issue) => ({
      chemin: issue.path.join('.'),
      message: issue.message,
    }));
    throw new ErreurHttp(
      'VALIDATION_ERROR',
      400,
      'La réponse du serveur est invalide.',
      details,
    );
  }
  return resultat.data;
}

export type { CodeErreurApi, MetaApi, ErreurApi };
