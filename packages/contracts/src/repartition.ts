// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { creerSchemaTri, zPaginationQuery, zSearchFilter, zUuid } from './common';

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
