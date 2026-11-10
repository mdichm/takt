// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { creerSchemaTri, zDateIso, zPaginationQuery, zSearchFilter, zUuid } from './common';

/** Plan d'études d'un niveau pour une année universitaire et un semestre. */
export const zPlanEtudes = z.object({
  id: zUuid,
  parcoursId: zUuid,
  niveauId: zUuid,
  anneeUniversitaireId: zUuid,
  semestreId: zUuid,
  departementId: zUuid,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/** Données de création d'un plan d'études. */
export const zPlanEtudesCreate = z.object({
  parcoursId: zUuid,
  niveauId: zUuid,
  anneeUniversitaireId: zUuid,
  semestreId: zUuid,
  departementId: zUuid,
});

/** Données de modification d'un plan d'études. */
export const zPlanEtudesUpdate = z.object({
  parcoursId: zUuid.optional(),
  niveauId: zUuid.optional(),
  anneeUniversitaireId: zUuid.optional(),
  semestreId: zUuid.optional(),
  departementId: zUuid.optional(),
});

/** Identifiant de plan d'études en paramètre de route. */
export const zPlanEtudesParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des plans d'études. */
export const zPlanEtudesList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['code', 'libelle', 'createdAt']).shape)
  .extend({
    parcoursId: zUuid.optional(),
    niveauId: zUuid.optional(),
    anneeUniversitaireId: zUuid.optional(),
    semestreId: zUuid.optional(),
    departementId: zUuid.optional(),
  });

export type PlanEtudes = z.infer<typeof zPlanEtudes>;
export type PlanEtudesCreate = z.infer<typeof zPlanEtudesCreate>;
export type PlanEtudesUpdate = z.infer<typeof zPlanEtudesUpdate>;
export type PlanEtudesParams = z.infer<typeof zPlanEtudesParams>;
export type PlanEtudesListFilters = z.infer<typeof zPlanEtudesList>;

/** Matière d'un plan d'études avec volume horaire hebdomadaire. */
export const zPlanEtudesMatiere = z.object({
  id: zUuid,
  planEtudesId: zUuid,
  matiereId: zUuid,
  typeEnseignementId: zUuid,
  volumeHoraire: z.number().int().positive('Le volume horaire doit être strictement positif'),
  dureeCreneaux: z.number().int().positive('La durée de créneau doit être strictement positive'),
  coefficient: z.number().int().positive('Le coefficient doit être strictement positif'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/** Données de création d'une matière de plan d'études. */
export const zPlanEtudesMatiereCreate = z.object({
  matiereId: zUuid,
  typeEnseignementId: zUuid,
  volumeHoraire: z.number().int().positive('Le volume horaire doit être strictement positif'),
  dureeCreneaux: z.number().int().positive('La durée de créneau doit être strictement positive'),
  coefficient: z.number().int().positive('Le coefficient doit être strictement positif'),
});

/** Données de modification d'une matière de plan d'études. */
export const zPlanEtudesMatiereUpdate = z.object({
  matiereId: zUuid.optional(),
  typeEnseignementId: zUuid.optional(),
  volumeHoraire: z
    .number()
    .int()
    .positive('Le volume horaire doit être strictement positif')
    .optional(),
  dureeCreneaux: z
    .number()
    .int()
    .positive('La durée de créneau doit être strictement positive')
    .optional(),
  coefficient: z.number().int().positive('Le coefficient doit être strictement positif').optional(),
});

/** Identifiant de matière de plan d'études en paramètre de route. */
export const zPlanEtudesMatiereParams = z.object({
  planEtudesId: zUuid,
  id: zUuid,
});

/** Filtres de la liste des matières d'un plan d'études. */
export const zPlanEtudesMatiereList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['code', 'libelle', 'volumeHoraire', 'createdAt']).shape)
  .extend({
    matiereId: zUuid.optional(),
    typeEnseignementId: zUuid.optional(),
  });

export type PlanEtudesMatiere = z.infer<typeof zPlanEtudesMatiere>;
export type PlanEtudesMatiereCreate = z.infer<typeof zPlanEtudesMatiereCreate>;
export type PlanEtudesMatiereUpdate = z.infer<typeof zPlanEtudesMatiereUpdate>;
export type PlanEtudesMatiereParams = z.infer<typeof zPlanEtudesMatiereParams>;
export type PlanEtudesMatiereListFilters = z.infer<typeof zPlanEtudesMatiereList>;

/** Groupe héritant d'un plan d'études via son niveau. */
export const zPlanEtudesGroupeHérité = z.object({
  id: zUuid,
  code: z.string().trim().min(1, 'Le code du groupe est requis'),
  libelle: z.string().trim().min(1, 'Le libellé du groupe est requis'),
  niveauId: zUuid,
  estHéritier: z.boolean().default(true),
});

export type PlanEtudesGroupeHérité = z.infer<typeof zPlanEtudesGroupeHérité>;

/** Agrégat « volume total d'un plan d'études ». */
export const zPlanEtudesVolumeTotal = z.object({
  planEtudesId: zUuid,
  volumeTotalHebdomadaire: z.number().int().nonnegative(),
  nombreMatieres: z.number().int().nonnegative(),
});

export type PlanEtudesVolumeTotal = z.infer<typeof zPlanEtudesVolumeTotal>;

/** Données de validation de la répartition pédagogique d'un département (TAKT-L05-04). */
export const zRepartitionValider = z.object({
  versionId: zUuid,
  departementId: zUuid.optional(),
});

export type RepartitionValiderInput = z.infer<typeof zRepartitionValider>;

/** Données d'annulation de la répartition pédagogique d'un département (TAKT-L05-04). */
export const zRepartitionAnnuler = z.object({
  versionId: zUuid,
  departementId: zUuid.optional(),
});

export type RepartitionAnnulerInput = z.infer<typeof zRepartitionAnnuler>;

/** Données de lecture d'un snapshot de répartition (TAKT-L05-04). */
export const zRepartitionSnapshot = z.object({
  id: zUuid,
  versionId: zUuid,
  departementId: zUuid.nullable(),
  type: z.string(),
  hash: z.string(),
  createdAt: z.string().datetime(),
});

export type RepartitionSnapshot = z.infer<typeof zRepartitionSnapshot>;

/** États possibles de la validation de répartition d’un département (TAKT-L05-05). */
export const zEtatValidationRepartition = z.enum([
  'EN_COURS',
  'VALIDE',
  'REVALIDATION_REQUISE',
  'REJETE',
]);

export type EtatValidationRepartition = z.infer<typeof zEtatValidationRepartition>;

/** Détection des départements impactés d’une version (POST /repartition/revalidation/detecter). */
export const zRevalidationDetecter = z.object({
  versionId: zUuid,
});

export type RevalidationDetecterInput = z.infer<typeof zRevalidationDetecter>;

/** Filtres de lecture des états de validation (GET /repartition/revalidation/statuts). */
export const zRevalidationStatutsQuery = z.object({
  versionId: zUuid,
});

export type RevalidationStatutsQuery = z.infer<typeof zRevalidationStatutsQuery>;

/** Revalidation d’un département (POST /repartition/revalidation/valider). */
export const zRevalidationValider = z.object({
  versionId: zUuid,
  departementId: zUuid.optional(),
});

export type RevalidationValiderInput = z.infer<typeof zRevalidationValider>;

/** État de validation d’un département pour une version. */
export const zStatutValidationRepartition = z.object({
  departementId: zUuid,
  etat: zEtatValidationRepartition,
  revision: z.number().int().positive(),
  hashAffectations: z.string().nullable().optional(),
  motif: z.string().nullable().optional(),
  revalidationDemandeeLe: zDateIso.nullable().optional(),
  revalidationDemandeePar: zUuid.nullable().optional(),
  valideLe: zDateIso.nullable().optional(),
  validePar: zUuid.nullable().optional(),
  snapshotCourantId: zUuid.nullable().optional(),
  snapshotPrecedentId: zUuid.nullable().optional(),
});

export type StatutValidationRepartition = z.infer<typeof zStatutValidationRepartition>;

/** Réponse de détection des impacts (POST /repartition/revalidation/detecter). */
export const zRevalidationDetecterReponse = z.object({
  versionId: zUuid,
  departementsImpactes: z.array(zStatutValidationRepartition),
  notificationsCrees: z.number().int().nonnegative(),
});

export type RevalidationDetecterReponse = z.infer<typeof zRevalidationDetecterReponse>;

/** Réponse de revalidation d’un département (POST /repartition/revalidation/valider). */
export const zRevalidationValiderReponse = z.object({
  departementId: zUuid,
  etat: zEtatValidationRepartition,
  revision: z.number().int().positive(),
  snapshotId: zUuid,
  snapshotPrecedentId: zUuid.nullable(),
  tousDepartementsValides: z.boolean(),
});

export type RevalidationValiderReponse = z.infer<typeof zRevalidationValiderReponse>;

/** Notification in-app émise à un utilisateur (TAKT-L05-05). */
export const zNotification = z.object({
  id: zUuid,
  utilisateurId: zUuid,
  type: z.string().min(1),
  titre: z.string().min(1),
  message: z.string().min(1),
  lue: z.boolean(),
  createdAt: zDateIso,
});

export type Notification = z.infer<typeof zNotification>;
