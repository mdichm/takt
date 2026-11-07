// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { zUuid } from './common';

/** Types d'événements applicatifs diffusés par le canal SSE. */
export const TYPES_EVENEMENT = [
  'generation.progress',
  'generation.done',
  'export.ready',
  'notification',
] as const;

/** Type d'un événement applicatif diffusé par SSE. */
export const zTypeEvenement = z.enum(TYPES_EVENEMENT);

/** Charge utile d'un événement de génération. */
export const zEvenementGeneration = z.object({
  type: z.enum(['generation.progress', 'generation.done']),
  versionId: zUuid,
  progression: z.number().int().min(0).max(100).optional(),
  message: z.string().min(1).optional(),
});

/** Charge utile d'un événement d'export. */
export const zEvenementExport = z.object({
  type: z.literal('export.ready'),
  exportId: zUuid,
  format: z.enum(['xlsx', 'csv', 'pdf']),
  url: z.string().min(1),
});

/** Charge utile d'un événement de notification. */
export const zEvenementNotification = z.object({
  type: z.literal('notification'),
  notificationId: zUuid,
  titre: z.string().min(1),
  message: z.string().min(1),
});

/** Union discriminée de tous les événements applicatifs. */
export const zEvenementApplicatif = z.discriminatedUnion('type', [
  zEvenementGeneration,
  zEvenementExport,
  zEvenementNotification,
]);

export type TypeEvenement = z.infer<typeof zTypeEvenement>;
export type EvenementApplicatif = z.infer<typeof zEvenementApplicatif>;
