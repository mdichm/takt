// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';

import { zDateIso, zEmail, zRoleCode, zUuid } from './common';

/**
 * Schéma d’un profil utilisateur complet (lecture).
 * Ticket : TAKT-L09-03 — ST_TAKT §3.1, §3.2 et TE-API-02.
 */
export const zProfilUtilisateur = z.object({
  id: zUuid,
  email: zEmail,
  nom: z.string().min(1, 'Le nom est obligatoire'),
  prenom: z.string().min(1, 'Le prénom est obligatoire'),
  role: zRoleCode,
  departementId: zUuid.nullable(),
  departementCode: z.string().min(1, 'Le code département est obligatoire').nullable(),
  notificationsEmail: z.boolean(),
  notificationsInApp: z.boolean(),
  createdAt: zDateIso,
  updatedAt: zDateIso,
});

/**
 * Schéma d’une mise à jour de profil par l’utilisateur lui-même.
 * Les champs sensibles (role, mot de passe, estActif) sont volontairement exclus
 * pour empêcher l’auto-élévation de privilèges.
 */
export const zProfilUpdate = z.object({
  nom: z.string().min(1, 'Le nom est obligatoire').optional(),
  prenom: z.string().min(1, 'Le prénom est obligatoire').optional(),
  email: zEmail.optional(),
  departementId: zUuid.nullable().optional(),
  notificationsEmail: z.boolean().optional(),
  notificationsInApp: z.boolean().optional(),
});

/**
 * Schéma d’un changement de mot de passe par l’utilisateur lui-même.
 */
export const zMotDePasseChange = z.object({
  motDePasseActuel: z.string().min(1, 'Le mot de passe actuel est obligatoire'),
  nouveauMotDePasse: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
});

export type ProfilUtilisateur = z.infer<typeof zProfilUtilisateur>;
export type ProfilUpdate = z.infer<typeof zProfilUpdate>;
export type MotDePasseChange = z.infer<typeof zMotDePasseChange>;
