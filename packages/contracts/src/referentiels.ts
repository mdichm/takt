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
  etablissementId: zUuid,
});

/** Données de création d’un département. */
export const zDepartementCreate = z.object({
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  etablissementId: zUuid,
});

/** Données de modification d’un département. */
export const zDepartementUpdate = z.object({
  code: z.string().trim().min(1, 'Le code est requis').optional(),
  libelle: z.string().trim().min(1, 'Le libellé est requis').optional(),
  etablissementId: zUuid.optional(),
});

/** Identifiant de département en paramètre de route. */
export const zDepartementParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des départements. */
export const zDepartementList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['code', 'libelle', 'createdAt']).shape)
  .extend({
    etablissementId: zUuid.optional(),
  });

export type Departement = z.infer<typeof zDepartement>;
export type DepartementCreate = z.infer<typeof zDepartementCreate>;
export type DepartementUpdate = z.infer<typeof zDepartementUpdate>;
export type DepartementParams = z.infer<typeof zDepartementParams>;
export type DepartementListFilters = z.infer<typeof zDepartementList>;

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

export type UserCreate = z.infer<typeof zUserCreate>;
export type UserUpdate = z.infer<typeof zUserUpdate>;

/** Identifiant d’utilisateur en paramètre de route. */
export const zUserParams = z.object({
  id: zUuid,
});

export type UserParams = z.infer<typeof zUserParams>;
export type UserListFilters = z.infer<typeof zUserList>;

// ============================================================================
// Établissement
// ============================================================================

/** Établissement (ex: Université de Takt). */
export const zEtablissement = z.object({
  id: zUuid,
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
});

/** Données de création d’un établissement. */
export const zEtablissementCreate = z.object({
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
});

/** Données de modification d’un établissement. */
export const zEtablissementUpdate = z.object({
  code: z.string().trim().min(1, 'Le code est requis').optional(),
  libelle: z.string().trim().min(1, 'Le libellé est requis').optional(),
});

/** Identifiant d’établissement en paramètre de route. */
export const zEtablissementParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des établissements. */
export const zEtablissementList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['code', 'libelle', 'createdAt']).shape);

export type Etablissement = z.infer<typeof zEtablissement>;
export type EtablissementCreate = z.infer<typeof zEtablissementCreate>;
export type EtablissementUpdate = z.infer<typeof zEtablissementUpdate>;
export type EtablissementParams = z.infer<typeof zEtablissementParams>;
export type EtablissementListFilters = z.infer<typeof zEtablissementList>;

// ============================================================================
// Parcours
// ============================================================================

/** Parcours de formation (ex: Licence Informatique). */
export const zParcours = z.object({
  id: zUuid,
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  departementId: zUuid,
});

/** Données de création d’un parcours. */
export const zParcoursCreate = z.object({
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  departementId: zUuid,
});

/** Données de modification d’un parcours. */
export const zParcoursUpdate = z.object({
  code: z.string().trim().min(1, 'Le code est requis').optional(),
  libelle: z.string().trim().min(1, 'Le libellé est requis').optional(),
  departementId: zUuid.optional(),
});

/** Identifiant de parcours en paramètre de route. */
export const zParcoursParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des parcours. */
export const zParcoursList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['code', 'libelle', 'createdAt']).shape)
  .extend({
    departementId: zUuid.optional(),
  });

export type Parcours = z.infer<typeof zParcours>;
export type ParcoursCreate = z.infer<typeof zParcoursCreate>;
export type ParcoursUpdate = z.infer<typeof zParcoursUpdate>;
export type ParcoursParams = z.infer<typeof zParcoursParams>;
export type ParcoursListFilters = z.infer<typeof zParcoursList>;

// ============================================================================
// Niveau
// ============================================================================

/** Niveau (ex: L1, M2). */
export const zNiveau = z.object({
  id: zUuid,
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  parcoursId: zUuid,
});

/** Données de création d’un niveau. */
export const zNiveauCreate = z.object({
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  parcoursId: zUuid,
});

/** Données de modification d’un niveau. */
export const zNiveauUpdate = z.object({
  code: z.string().trim().min(1, 'Le code est requis').optional(),
  libelle: z.string().trim().min(1, 'Le libellé est requis').optional(),
  parcoursId: zUuid.optional(),
});

/** Identifiant de niveau en paramètre de route. */
export const zNiveauParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des niveaux. */
export const zNiveauList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['code', 'libelle', 'createdAt']).shape)
  .extend({
    parcoursId: zUuid.optional(),
  });

export type Niveau = z.infer<typeof zNiveau>;
export type NiveauCreate = z.infer<typeof zNiveauCreate>;
export type NiveauUpdate = z.infer<typeof zNiveauUpdate>;
export type NiveauParams = z.infer<typeof zNiveauParams>;
export type NiveauListFilters = z.infer<typeof zNiveauList>;

// ============================================================================
// Groupe
// ============================================================================

/** Groupe d’étudiants (ex: TD1, TP-A). */
export const zGroupe = z.object({
  id: zUuid,
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  niveauId: zUuid,
});

/** Données de création d’un groupe. */
export const zGroupeCreate = z.object({
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  niveauId: zUuid,
});

/** Données de modification d’un groupe. */
export const zGroupeUpdate = z.object({
  code: z.string().trim().min(1, 'Le code est requis').optional(),
  libelle: z.string().trim().min(1, 'Le libellé est requis').optional(),
  niveauId: zUuid.optional(),
});

/** Identifiant de groupe en paramètre de route. */
export const zGroupeParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des groupes. */
export const zGroupeList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['code', 'libelle', 'createdAt']).shape)
  .extend({
    niveauId: zUuid.optional(),
  });

export type Groupe = z.infer<typeof zGroupe>;
export type GroupeCreate = z.infer<typeof zGroupeCreate>;
export type GroupeUpdate = z.infer<typeof zGroupeUpdate>;
export type GroupeParams = z.infer<typeof zGroupeParams>;
export type GroupeListFilters = z.infer<typeof zGroupeList>;
