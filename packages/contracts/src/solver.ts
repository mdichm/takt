// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { zUuid, zDateIso } from './common';

/** Créneaux d'indisponibilité d'un enseignant. */
export const zUnavailableSlot = z.object({
  day: z.number().int().min(0).max(6),
  slots: z.array(z.number().int().min(0)).min(1),
  allDay: z.boolean().optional(),
});

/** Métadonnées du fichier dérivé d'entrée du solveur. */
export const zDerivedMetadata = z.object({
  generationId: zUuid,
  versionId: zUuid,
  semestre: z.string().trim().min(1),
  createdAt: zDateIso,
  timeSlotMinutes: z.number().int().refine((v) => v === 30),
  days: z.number().int().refine((v) => v === 6),
  slotsPerDay: z.number().int().refine((v) => v === 24),
});

/** Grille temporelle du fichier dérivé. */
export const zTimeGrid = z.object({
  totalSlots: z.number().int().positive(),
  slotDurationMinutes: z.number().int().refine((v) => v === 30),
  dayLabels: z.array(z.string()).min(6).max(6),
  slotLabels: z.array(z.string()),
});

/** Salle du référentiel transmise au solveur. */
export const zDerivedRoom = z.object({
  id: zUuid,
  code: z.string().trim().min(1),
  type: z.enum(['AMPHI', 'TD', 'TP', 'INFO']),
  capacity: z.number().int().min(1),
  building: z.string().trim().min(1),
  equipment: z.array(z.string()).optional(),
});

/** Enseignant du référentiel transmis au solveur. */
export const zDerivedTeacher = z.object({
  id: zUuid,
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  departmentId: zUuid,
  maxHoursPerWeek: z.number().int().nonnegative(),
  unavailableSlots: z.array(zUnavailableSlot),
});

/** Groupe d'étudiants transmis au solveur. */
export const zDerivedGroup = z.object({
  id: zUuid,
  code: z.string().trim().min(1),
  size: z.number().int().min(1),
  departmentId: zUuid,
});

/** Matière transmise au solveur. */
export const zDerivedSubject = z.object({
  id: zUuid,
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  departmentId: zUuid,
  teachingType: z.enum(['CM', 'TD', 'TP', 'PROJET']),
  chargeCoefficient: z.number().min(0.1),
});

/** Activité à placer transmise au solveur. */
export const zDerivedActivity = z.object({
  id: zUuid,
  subjectId: zUuid,
  teacherIds: z.array(zUuid),
  groupIds: z.array(zUuid),
  roomType: z.enum(['AMPHI', 'TD', 'TP', 'INFO', 'ANY']),
  durationSlots: z.number().int().min(1),
  weeklyVolume: z.number().int().min(1),
  teachingType: z.enum(['CM', 'TD', 'TP', 'PROJET']),
});

/** Contrainte (dure ou souple) du fichier dérivé. */
export const zDerivedConstraint = z.object({
  id: zUuid,
  type: z.enum([
    'UNAVAILABILITY',
    'ROOM_REQUIREMENT',
    'TEACHER_PREFERENCE',
    'CONSECUTIVE_SLOTS',
    'MAX_HOURS_PER_DAY',
    'MAX_HOURS_PER_WEEK',
    'WINDOW_CONSTRAINT',
    'NO_GAPS',
    'COMPACT_DAYS',
    'LOAD_BALANCE',
    'SUBJECT_GROUPING',
    'CM_BEFORE_TD',
    'SPREAD',
    'AVOID_LAST_SLOT',
    'SAME_ROOM',
    'ROOM_PROXIMITY',
    'PREFERRED_BUILDING',
  ]),
  category: z.enum(['HARD', 'SOFT']),
  scope: z.enum(['GLOBAL', 'TEACHER', 'GROUP', 'ROOM', 'ACTIVITY', 'DEPARTMENT']),
  targetId: zUuid.nullable(),
  value: z.string(),
  weight: z.number().int().min(1).max(100),
  isActive: z.boolean(),
  source: z.enum(['AUTO', 'MANUAL', 'CONFIG']),
  createdBy: zUuid,
  createdAt: zDateIso,
});

/** Verrou de séance du fichier dérivé. */
export const zDerivedLock = z.object({
  id: zUuid,
  activityId: zUuid,
  lockType: z.enum(['TIMESLOT', 'ROOM', 'TEACHER', 'ACTIVITY']),
  value: z.string(),
  poids: z.number().int().min(1).max(100),
});

/** Fichier dérivé d'entrée du solveur CP-SAT (schéma complet). */
export const zDerivedFile = z.object({
  metadata: zDerivedMetadata,
  timeGrid: zTimeGrid,
  rooms: z.array(zDerivedRoom),
  teachers: z.array(zDerivedTeacher),
  groups: z.array(zDerivedGroup),
  subjects: z.array(zDerivedSubject),
  activities: z.array(zDerivedActivity),
  constraints: z.array(zDerivedConstraint),
  locks: z.array(zDerivedLock),
});

export type DerivedFile = z.infer<typeof zDerivedFile>;
export type DerivedMetadata = z.infer<typeof zDerivedMetadata>;
export type TimeGrid = z.infer<typeof zTimeGrid>;
export type DerivedRoom = z.infer<typeof zDerivedRoom>;
export type DerivedTeacher = z.infer<typeof zDerivedTeacher>;
export type DerivedGroup = z.infer<typeof zDerivedGroup>;
export type DerivedSubject = z.infer<typeof zDerivedSubject>;
export type DerivedActivity = z.infer<typeof zDerivedActivity>;
export type DerivedConstraint = z.infer<typeof zDerivedConstraint>;
export type DerivedLock = z.infer<typeof zDerivedLock>;
