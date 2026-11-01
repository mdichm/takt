// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { zEmail, zPaginationQuery, zRoleCode, zSearchFilter, zUuid } from './common';

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
  .extend({
    role: zRoleCode.optional(),
    departementId: zUuid.optional(),
    estActif: z.boolean().optional(),
  });

export type Role = z.infer<typeof zRole>;
export type Departement = z.infer<typeof zDepartement>;
export type UserInput = z.infer<typeof zUser>;
export type UserListFilters = z.infer<typeof zUserList>;
