// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { zUuid, zEmail, zDateIso } from './common';
import { zRole, zConfigSystemeUpdate, type Role, type ConfigSystemeUpdate } from './referentiels';

/** Utilisateur vu depuis l’administration (lecture). */
export const zUtilisateurAdmin = z.object({
  id: zUuid,
  email: zEmail,
  nom: z.string().trim().min(1),
  prenom: z.string().trim().min(1),
  roleId: zUuid,
  departementId: zUuid.nullable(),
  estActif: z.boolean(),
});

export type UtilisateurAdmin = z.infer<typeof zUtilisateurAdmin>;

/** Données de création d’un utilisateur par un admin. */
export const zUtilisateurAdminCreate = z.object({
  email: zEmail,
  nom: z.string().trim().min(1),
  prenom: z.string().trim().min(1),
  roleId: zUuid,
  departementId: zUuid.nullable(),
  motDePasse: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

export type UtilisateurAdminCreate = z.infer<typeof zUtilisateurAdminCreate>;

/** Données de mise à jour d’un utilisateur par un admin. */
export const zUtilisateurAdminUpdate = z.object({
  email: zEmail.optional(),
  nom: z.string().trim().min(1).optional(),
  prenom: z.string().trim().min(1).optional(),
  roleId: zUuid.optional(),
  departementId: zUuid.nullable().optional(),
  estActif: z.boolean().optional(),
});

export type UtilisateurAdminUpdate = z.infer<typeof zUtilisateurAdminUpdate>;

/** Règle de charge (ChargeRuleSet) : coefficients de pondération par type d’enseignement. */
export const zChargeRuleSet = z.object({
  id: zUuid,
  code: z.string().trim().min(1),
  libelle: z.string().trim().min(1),
  version: z.number().int().positive(),
  estActive: z.boolean(),
  seuilAlerte: z.number().int().positive(),
  plafondHebdomadaire: z.number().int().positive(),
  arrondi: z.string(),
  dureeJournee: z.number().finite(),
  dureeDemiJournee: z.number().finite(),
  coefficientsParType: z.record(z.number().finite()),
  cibleHebdomadaireParGrade: z.record(z.number().finite()),
  toleranceEquilibrage: z.number().finite(),
  createdAt: zDateIso,
  updatedAt: zDateIso,
});

export type ChargeRuleSet = z.infer<typeof zChargeRuleSet>;

/** Données de création d’un ChargeRuleSet. */
export const zChargeRuleSetCreate = z.object({
  code: z.string().trim().min(1),
  libelle: z.string().trim().min(1),
  seuilAlerte: z.number().int().positive().default(90),
  plafondHebdomadaire: z.number().int().positive().default(20),
  arrondi: z.enum(['UNITAIRE', 'DEMI_JOURNEE', 'JOURNEE']).default('UNITAIRE'),
  dureeJournee: z.number().finite().default(7),
  dureeDemiJournee: z.number().finite().default(3.5),
  coefficientsParType: z.record(z.number().finite()),
  cibleHebdomadaireParGrade: z.record(z.number().finite()).optional(),
  toleranceEquilibrage: z.number().finite().default(5),
  estActive: z.boolean().default(false),
});

export type ChargeRuleSetCreate = z.infer<typeof zChargeRuleSetCreate>;

/** Données de mise à jour d’un ChargeRuleSet. */
export const zChargeRuleSetUpdate = z.object({
  libelle: z.string().trim().min(1).optional(),
  seuilAlerte: z.number().int().positive().optional(),
  plafondHebdomadaire: z.number().int().positive().optional(),
  arrondi: z.enum(['UNITAIRE', 'DEMI_JOURNEE', 'JOURNEE']).optional(),
  dureeJournee: z.number().finite().optional(),
  dureeDemiJournee: z.number().finite().optional(),
  coefficientsParType: z.record(z.number().finite()).optional(),
  cibleHebdomadaireParGrade: z.record(z.number().finite()).optional(),
  toleranceEquilibrage: z.number().finite().optional(),
  estActive: z.boolean().optional(),
});

export type ChargeRuleSetUpdate = z.infer<typeof zChargeRuleSetUpdate>;

/** Configuration système : lecture (défini dans referentiels.ts, inclut bailEditionDureeMinutes). */
export type { ConfigSysteme } from './referentiels';

// Ré-export des schémas partagés déjà définis dans referentiels.ts
export { zRole, zConfigSystemeUpdate };
export type { Role, ConfigSystemeUpdate };