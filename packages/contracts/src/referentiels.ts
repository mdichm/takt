// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import {
  creerSchemaTri,
  zBooleanQuery,
  zDateIso,
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

// ============================================================================
// TypeEnseignement
// ============================================================================

/** Type d'enseignement (ex: CM, TD, TP, PROJET). */
export const zTypeEnseignement = z.object({
  id: zUuid,
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  couleur: z.string().trim().min(1, 'La couleur est requise'),
});

/** Données de création d’un type d’enseignement. */
export const zTypeEnseignementCreate = z.object({
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  couleur: z.string().trim().min(1, 'La couleur est requise'),
});

/** Données de modification d’un type d’enseignement. */
export const zTypeEnseignementUpdate = z.object({
  code: z.string().trim().min(1, 'Le code est requis').optional(),
  libelle: z.string().trim().min(1, 'Le libellé est requis').optional(),
  couleur: z.string().trim().min(1, 'La couleur est requise').optional(),
});

/** Identifiant de type d’enseignement en paramètre de route. */
export const zTypeEnseignementParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des types d’enseignement. */
export const zTypeEnseignementList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['code', 'libelle', 'createdAt']).shape);

export type TypeEnseignement = z.infer<typeof zTypeEnseignement>;
export type TypeEnseignementCreate = z.infer<typeof zTypeEnseignementCreate>;
export type TypeEnseignementUpdate = z.infer<typeof zTypeEnseignementUpdate>;
export type TypeEnseignementParams = z.infer<typeof zTypeEnseignementParams>;
export type TypeEnseignementListFilters = z.infer<typeof zTypeEnseignementList>;

// ============================================================================
// Grade
// ============================================================================

/** Grade académique (ex: L1, L2, L3, M1, M2). */
export const zGrade = z.object({
  id: zUuid,
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
});

/** Données de création d’un grade. */
export const zGradeCreate = z.object({
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
});

/** Données de modification d’un grade. */
export const zGradeUpdate = z.object({
  code: z.string().trim().min(1, 'Le code est requis').optional(),
  libelle: z.string().trim().min(1, 'Le libellé est requis').optional(),
});

/** Identifiant de grade en paramètre de route. */
export const zGradeParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des grades. */
export const zGradeList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['code', 'libelle', 'createdAt']).shape);

export type Grade = z.infer<typeof zGrade>;
export type GradeCreate = z.infer<typeof zGradeCreate>;
export type GradeUpdate = z.infer<typeof zGradeUpdate>;
export type GradeParams = z.infer<typeof zGradeParams>;
export type GradeListFilters = z.infer<typeof zGradeList>;

// ============================================================================
// Module
// ============================================================================

/** Module pédagogique (lié à un type d’enseignement et un grade). */
export const zModule = z.object({
  id: zUuid,
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  typeEnseignementId: zUuid,
  gradeId: zUuid,
});

/** Données de création d’un module. */
export const zModuleCreate = z.object({
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  typeEnseignementId: zUuid,
  gradeId: zUuid,
});

/** Données de modification d’un module. */
export const zModuleUpdate = z.object({
  code: z.string().trim().min(1, 'Le code est requis').optional(),
  libelle: z.string().trim().min(1, 'Le libellé est requis').optional(),
  typeEnseignementId: zUuid.optional(),
  gradeId: zUuid.optional(),
});

/** Identifiant de module en paramètre de route. */
export const zModuleParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des modules. */
export const zModuleList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['code', 'libelle', 'createdAt']).shape)
  .extend({
    typeEnseignementId: zUuid.optional(),
    gradeId: zUuid.optional(),
  });

export type Module = z.infer<typeof zModule>;
export type ModuleCreate = z.infer<typeof zModuleCreate>;
export type ModuleUpdate = z.infer<typeof zModuleUpdate>;
export type ModuleParams = z.infer<typeof zModuleParams>;
export type ModuleListFilters = z.infer<typeof zModuleList>;

// ============================================================================
// Matiere
// ============================================================================

/** Matière (liée à un module). */
export const zMatiere = z.object({
  id: zUuid,
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  moduleId: zUuid,
});

/** Données de création d’une matière. */
export const zMatiereCreate = z.object({
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  moduleId: zUuid,
});

/** Données de modification d’une matière. */
export const zMatiereUpdate = z.object({
  code: z.string().trim().min(1, 'Le code est requis').optional(),
  libelle: z.string().trim().min(1, 'Le libellé est requis').optional(),
  moduleId: zUuid.optional(),
});

/** Identifiant de matière en paramètre de route. */
export const zMatiereParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des matières. */
export const zMatiereList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['code', 'libelle', 'createdAt']).shape)
  .extend({
    moduleId: zUuid.optional(),
  });

export type Matiere = z.infer<typeof zMatiere>;
export type MatiereCreate = z.infer<typeof zMatiereCreate>;
export type MatiereUpdate = z.infer<typeof zMatiereUpdate>;
export type MatiereParams = z.infer<typeof zMatiereParams>;
export type MatiereListFilters = z.infer<typeof zMatiereList>;

// ============================================================================
// GradeTypeEnseignement — Matrice type × grade
// ============================================================================

/** Couple (grade, type d’enseignement) autorisé dans la matrice. */
export const zGradeTypeEnseignement = z.object({
  id: zUuid,
  gradeId: zUuid,
  typeEnseignementId: zUuid,
});

/** Données de création d’un couple matrice. */
export const zGradeTypeEnseignementCreate = z.object({
  gradeId: zUuid,
  typeEnseignementId: zUuid,
});

/** Identifiant de couple matrice en paramètre de route. */
export const zGradeTypeEnseignementParams = z.object({
  id: zUuid,
});

export type GradeTypeEnseignement = z.infer<typeof zGradeTypeEnseignement>;
export type GradeTypeEnseignementCreate = z.infer<
  typeof zGradeTypeEnseignementCreate
>;
export type GradeTypeEnseignementParams = z.infer<
  typeof zGradeTypeEnseignementParams
>;

// ============================================================================
// Enseignant
// ============================================================================

/** Enseignant (référentiel métier, FK vers Grade). */
export const zEnseignant = z.object({
  id: zUuid,
  matricule: z.string().trim().min(1, 'Le matricule est requis'),
  nom: z.string().trim().min(1, 'Le nom est requis'),
  prenom: z.string().trim().min(1, 'Le prénom est requis'),
  email: zEmail,
  gradeId: zUuid.nullable(),
  estActif: z.boolean(),
  createdAt: zDateIso,
  updatedAt: zDateIso,
});

/** Données de création d’un enseignant. */
export const zEnseignantCreate = z.object({
  matricule: z.string().trim().min(1, 'Le matricule est requis'),
  nom: z.string().trim().min(1, 'Le nom est requis'),
  prenom: z.string().trim().min(1, 'Le prénom est requis'),
  email: zEmail,
  gradeId: zUuid.optional(),
  estActif: z.boolean().default(true),
  departementIds: z.array(zUuid).optional(),
});

/** Données de modification d’un enseignant. */
export const zEnseignantUpdate = z.object({
  matricule: z.string().trim().min(1, 'Le matricule est requis').optional(),
  nom: z.string().trim().min(1, 'Le nom est requis').optional(),
  prenom: z.string().trim().min(1, 'Le prénom est requis').optional(),
  email: zEmail.optional(),
  gradeId: zUuid.nullish().optional(),
  estActif: z.boolean().optional(),
  departementIds: z.array(zUuid).optional(),
});

/** Identifiant d’enseignant en paramètre de route. */
export const zEnseignantParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des enseignants. */
export const zEnseignantList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['matricule', 'nom', 'prenom', 'email', 'createdAt']).shape)
  .extend({
    gradeId: zUuid.optional(),
    estActif: zBooleanQuery.optional(),
    departementId: zUuid.optional(),
  });

export type Enseignant = z.infer<typeof zEnseignant>;
export type EnseignantCreate = z.infer<typeof zEnseignantCreate>;
export type EnseignantUpdate = z.infer<typeof zEnseignantUpdate>;
export type EnseignantParams = z.infer<typeof zEnseignantParams>;
export type EnseignantListFilters = z.infer<typeof zEnseignantList>;

// ============================================================================
// Site
// ============================================================================

/** Site physique hébergeant des salles. */
export const zSite = z.object({
  id: zUuid,
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  createdAt: zDateIso,
  updatedAt: zDateIso,
});

/** Données de création d'un site. */
export const zSiteCreate = z.object({
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
});

/** Données de modification d'un site. */
export const zSiteUpdate = z.object({
  code: z.string().trim().min(1, 'Le code est requis').optional(),
  libelle: z.string().trim().min(1, 'Le libellé est requis').optional(),
});

/** Identifiant de site en paramètre de route. */
export const zSiteParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des sites. */
export const zSiteList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['code', 'libelle', 'createdAt']).shape);

export type Site = z.infer<typeof zSite>;
export type SiteCreate = z.infer<typeof zSiteCreate>;
export type SiteUpdate = z.infer<typeof zSiteUpdate>;
export type SiteParams = z.infer<typeof zSiteParams>;
export type SiteListFilters = z.infer<typeof zSiteList>;

// ============================================================================
// TypeSalle
// ============================================================================

/** Type de salle (amphithéâtre, cours, TP, informatique…). */
export const zTypeSalle = z.object({
  id: zUuid,
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  createdAt: zDateIso,
  updatedAt: zDateIso,
});

/** Données de création d'un type de salle. */
export const zTypeSalleCreate = z.object({
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
});

/** Données de modification d'un type de salle. */
export const zTypeSalleUpdate = z.object({
  code: z.string().trim().min(1, 'Le code est requis').optional(),
  libelle: z.string().trim().min(1, 'Le libellé est requis').optional(),
});

/** Identifiant de type de salle en paramètre de route. */
export const zTypeSalleParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des types de salle. */
export const zTypeSalleList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['code', 'libelle', 'createdAt']).shape);

export type TypeSalle = z.infer<typeof zTypeSalle>;
export type TypeSalleCreate = z.infer<typeof zTypeSalleCreate>;
export type TypeSalleUpdate = z.infer<typeof zTypeSalleUpdate>;
export type TypeSalleParams = z.infer<typeof zTypeSalleParams>;
export type TypeSalleListFilters = z.infer<typeof zTypeSalleList>;

// ============================================================================
// Equipement
// ============================================================================

/** Équipement installable dans une salle. */
export const zEquipement = z.object({
  id: zUuid,
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  createdAt: zDateIso,
  updatedAt: zDateIso,
});

/** Données de création d'un équipement. */
export const zEquipementCreate = z.object({
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
});

/** Données de modification d'un équipement. */
export const zEquipementUpdate = z.object({
  code: z.string().trim().min(1, 'Le code est requis').optional(),
  libelle: z.string().trim().min(1, 'Le libellé est requis').optional(),
});

/** Identifiant d'équipement en paramètre de route. */
export const zEquipementParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des équipements. */
export const zEquipementList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['code', 'libelle', 'createdAt']).shape);

export type Equipement = z.infer<typeof zEquipement>;
export type EquipementCreate = z.infer<typeof zEquipementCreate>;
export type EquipementUpdate = z.infer<typeof zEquipementUpdate>;
export type EquipementParams = z.infer<typeof zEquipementParams>;
export type EquipementListFilters = z.infer<typeof zEquipementList>;

// ============================================================================
// Salle
// ============================================================================

/** Salle transverse (aucun departementId, EX-REF-03). */
export const zSalle = z.object({
  id: zUuid,
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  typeSalleId: zUuid,
  capacite: z.number().int().positive('La capacité doit être supérieure à 0'),
  siteId: zUuid,
  createdAt: zDateIso,
  updatedAt: zDateIso,
});

/** Données de création d'une salle. */
export const zSalleCreate = z.object({
  code: z.string().trim().min(1, 'Le code est requis'),
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  typeSalleId: zUuid,
  siteId: zUuid,
  capacite: z.number().int().positive('La capacité doit être supérieure à 0'),
  equipements: z
    .array(
      z.object({
        equipementId: zUuid,
        quantite: z.number().int().nonnegative().default(1),
      })
    )
    .optional(),
});

/** Données de modification d'une salle. */
export const zSalleUpdate = z.object({
  code: z.string().trim().min(1, 'Le code est requis').optional(),
  libelle: z.string().trim().min(1, 'Le libellé est requis').optional(),
  typeSalleId: zUuid.optional(),
  siteId: zUuid.optional(),
  capacite: z
    .number()
    .int()
    .positive('La capacité doit être supérieure à 0')
    .optional(),
  equipements: z
    .array(
      z.object({
        equipementId: zUuid,
        quantite: z.number().int().nonnegative().default(1),
      })
    )
    .optional(),
});

/** Identifiant de salle en paramètre de route. */
export const zSalleParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des salles. */
export const zSalleList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['code', 'libelle', 'capacite', 'createdAt']).shape)
  .extend({
    typeSalleId: zUuid.optional(),
    siteId: zUuid.optional(),
    capaciteMin: z.coerce.number().int().nonnegative().optional(),
    capaciteMax: z.coerce.number().int().nonnegative().optional(),
    equipement: z.string().trim().optional(),
  });

export type Salle = z.infer<typeof zSalle>;
export type SalleCreate = z.infer<typeof zSalleCreate>;
export type SalleUpdate = z.infer<typeof zSalleUpdate>;
export type SalleParams = z.infer<typeof zSalleParams>;
export type SalleListFilters = z.infer<typeof zSalleList>;
