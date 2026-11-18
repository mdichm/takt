// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { zUuid } from './common';

/** Statut de couverture d'une affectation pédagogique (TAKT-L06-09). */
export const zStatutCouverture = z.enum([
  'CONFORME',
  'SOUS_PLANIFICATION',
  'SUR_PLANIFICATION',
]);

/** Résultat de couverture pour une affectation pédagogique. */
export const zCouvertureAffectation = z.object({
  affectationId: zUuid,
  departementId: zUuid,
  volumeDeclareMinutes: z.number().int().nonnegative(),
  volumePlanifieMinutes: z.number().int().nonnegative(),
  taux: z.number().min(0),
  statut: zStatutCouverture,
});

/** Résultat de couverture agrégé par département. */
export const zCouvertureDepartement = z.object({
  departementId: zUuid,
  volumeDeclareMinutes: z.number().int().nonnegative(),
  volumePlanifieMinutes: z.number().int().nonnegative(),
  taux: z.number().min(0),
});

/** Résultat global du calcul de couverture pédagogique. */
export const zCouverture = z.object({
  parAffectation: z.array(zCouvertureAffectation),
  parDepartement: z.array(zCouvertureDepartement),
  tauxGlobal: z.number().min(0),
  estConforme: z.boolean(),
  seancesOrphelines: z.array(zUuid),
});

/** Identifiant de version dans l’URL pour l’endpoint de couverture. */
export const zCouvertureParams = z.object({
  id: zUuid,
});

export type StatutCouverture = z.infer<typeof zStatutCouverture>;
export type CouvertureAffectation = z.infer<typeof zCouvertureAffectation>;
export type CouvertureDepartement = z.infer<typeof zCouvertureDepartement>;
export type Couverture = z.infer<typeof zCouverture>;
export type CouvertureParams = z.infer<typeof zCouvertureParams>;