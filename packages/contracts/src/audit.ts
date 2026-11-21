// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { zUuid, zDateIso, zPaginationQuery, zSearchFilter, zCodeErreurApi, zErreurApi, zMetaApi, zEnvelope } from './common';

/**
 * Contrats Zod pour la consultation et l'export du journal d'audit (TAKT-L11-01).
 * Conforme ST_TAKT §3.3 (enveloppe { data, error, meta }) et §3.4 (catalogue d'erreurs).
 * Accès réservé au rôle 'admin' (EX-DAT-05, TE-SEC-05).
 */

/** Entrée d'audit retournée par l'API de consultation. */
export const zAuditEntree = z.object({
  id: zUuid,
  action: z.string().trim().min(1),
  horodatage: zDateIso,
  utilisateurId: zUuid.nullable(),
  utilisateurEmail: z.string().email().nullable(),
  entite: z.string().trim().min(1),
  entiteId: z.string().trim().min(1).nullable(),
  metadonnees: z.unknown().nullable(),
});

export type AuditEntree = z.infer<typeof zAuditEntree>;

/** Filtres de consultation du journal d'audit (étend zAudit de versions.ts). */
export const zAuditFiltres = zPaginationQuery
  .merge(zSearchFilter)
  .merge(
    z.object({
      action: z.string().trim().min(1).optional(),
      entite: z.string().trim().min(1).optional(),
      entiteId: z.string().trim().min(1).optional(),
      utilisateurId: zUuid.optional(),
      dateFrom: zDateIso.optional(),
      dateTo: zDateIso.optional(),
    })
  )
  .refine(
    (v) => v.dateFrom === undefined || v.dateTo === undefined || new Date(v.dateFrom) <= new Date(v.dateTo),
    { message: 'La date de début doit être antérieure ou égale à la date de fin', path: ['dateTo'] },
  );

export type AuditFiltres = z.infer<typeof zAuditFiltres>;

/** Événement de sécurité retourné par l'API /security. */
export const zSecurityEventEntree = z.object({
  id: zUuid,
  type: z.string().trim().min(1),
  createdAt: zDateIso,
  utilisateurId: zUuid.nullable(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  details: z.unknown().nullable(),
});

export type SecurityEventEntree = z.infer<typeof zSecurityEventEntree>;

/** Filtres pour les événements de sécurité. */
export const zSecurityEventFiltres = zPaginationQuery
  .merge(zSearchFilter)
  .merge(
    z.object({
      type: z.string().trim().min(1).optional(),
      utilisateurId: zUuid.optional(),
      dateFrom: zDateIso.optional(),
      dateTo: zDateIso.optional(),
    })
  )
  .refine(
    (v) => v.dateFrom === undefined || v.dateTo === undefined || new Date(v.dateFrom) <= new Date(v.dateTo),
    { message: 'La date de début doit être antérieure ou égale à la date de fin', path: ['dateTo'] },
  );

export type SecurityEventFiltres = z.infer<typeof zSecurityEventFiltres>;

/** Réponse d'export CSV : métadonnées du fichier généré. */
export const zAuditExport = z.object({
  nbLignes: z.number().int().nonnegative(),
  periodeFrom: zDateIso.nullable(),
  periodeTo: zDateIso.nullable(),
});

export type AuditExport = z.infer<typeof zAuditExport>;