// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { zUuid } from './common';

/** Paramètres de route : identifiant d’une version (POST /versions/:id/bail). */
export const zBailVersionParams = z.object({
  id: zUuid,
});

/** Paramètres de route : identifiant d’un bail (DELETE /bails/:id). */
export const zBailIdParams = z.object({
  id: zUuid,
});

/** Représentation d’un bail d’édition (réponse GET/POST/DELETE /versions/:id/bail et DELETE /bails/:id). */
export const zBail = z.object({
  id: zUuid,
  versionId: zUuid,
  utilisateurId: zUuid,
  dateDebut: z.string().datetime(),
  dateFin: z.string().datetime(),
  derniereActivite: z.string().datetime(),
  /** Nom complet du détenteur du bail (exposé en cas de conflit 423). */
  detenteur: z.string(),
});

/** Types TypeScript inférés des schémas Zod (partagés frontend/backend). */
export type BailVersionParams = z.infer<typeof zBailVersionParams>;
export type BailIdParams = z.infer<typeof zBailIdParams>;
export type Bail = z.infer<typeof zBail>;
