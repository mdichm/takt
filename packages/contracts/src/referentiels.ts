// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import {
  creerSchemaTri,
  zBooleanQuery,
  zEmail,
  zPaginationQuery,
  zRoleCode,
  zSearchFilter,
  zUuid,
} from './common';

/** Rôle applicatif durable. */
export const zRole = z.object({
  id: zUuid,
  code: zRoleCode,
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
});

/** Département de rattachement. */
export const zDepartement = z.object({
  id: zUuid,
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
});

/** Données de création ou de modification d’un utilisateur. */
export const zUser = z.object({
  email: zEmail,
  nom: z.string().trim().min(1, 'Le nom est requis'),
  prenom: z.string().trim().min(1, 'Le prénom est requis'),
  roleId: zUuid,
  departementId: zUuid.nullish(),
  estActif: z.boolean().default(true),
});

/** Filtres de la liste des utilisateurs. */
export const zUserList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['nom', 'prenom', 'email', 'createdAt']).shape)
  .extend({
    role: zRoleCode.optional(),
    departementId: zUuid.optional(),
    estActif: zBooleanQuery.optional(),
  });

/** Données de création d’un utilisateur (mot de passe requis, hash côté service). */
export const zUserCreate = z.object({
  email: zEmail,
  nom: z.string().trim().min(1, 'Le nom est requis'),
  prenom: z.string().trim().min(1, 'Le prénom est requis'),
  roleId: zUuid,
  departementId: zUuid.nullish(),
  motDePasse: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  estActif: z.boolean().default(true),
});

/** Données de modification d’un utilisateur. */
export const zUserUpdate = z.object({
  nom: z.string().trim().min(1, 'Le nom est requis').optional(),
  prenom: z.string().trim().min(1, 'Le prénom est requis').optional(),
  roleId: zUuid.optional(),
  departementId: zUuid.nullish().optional(),
  estActif: z.boolean().optional(),
});

/** Identifiant d’utilisateur en paramètre de route. */
export const zUserParams = z.object({
  id: zUuid,
});

export type Role = z.infer<typeof zRole>;
export type Departement = z.infer<typeof zDepartement>;
export type UserInput = z.infer<typeof zUser>;
export type UserCreate = z.infer<typeof zUserCreate>;
export type UserUpdate = z.infer<typeof zUserUpdate>;
export type UserParams = z.infer<typeof zUserParams>;
export type UserListFilters = z.infer<typeof zUserList>;
