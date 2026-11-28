// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import {
  creerSchemaTri,
  zDateIso,
  zEtatVersion,
  zPaginationQuery,
  zSearchFilter,
  zUuid,
} from './common';
import { zPlacementPersistee } from './generation';

/** Données de création d’une version de planning. */
export const zVersion = z.object({
  semestreId: zUuid,
  anneeId: zUuid.optional(),
  etat: zEtatVersion.default('initial'),
  snapshotId: zUuid.nullish(),
  sourceVersionId: zUuid.optional(),
});

/** Identifiant de version dans l’URL. */
export const zVersionParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des versions. */
export const zVersionList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['etat', 'createdAt', 'updatedAt']).shape)
  .extend({
    etat: zEtatVersion.optional(),
    semestreId: zUuid.optional(),
    /** Filtre par périmètre départemental (RB-UI-01 : rdep voit son département). */
    departementId: zUuid.optional(),
  });

/**
 * Item de version en lecture seule (miroir du select Prisma de l'endpoint liste et de la transition).
 *
 * TAKT-L06-11 : ce contrat exige exactement 9 champs, tous retournés par le backend :
 *   1. id            (UUID, obligatoire)
 *   2. semestreId    (UUID, obligatoire)
 *   3. anneeId       (UUID, obligatoire — manquait dans la réponse de `update`)
 *   4. etat          (EtatVersion, obligatoire)
 *   5. snapshotId    (UUID | null, nullish)
 *   6. datePublication (DateISO | null, nullish)
 *   7. publiePar     (UUID | null, nullish)
 *   8. createdAt     (DateISO, obligatoire — manquait dans la réponse de `update`)
 *   9. updatedAt     (DateISO, obligatoire)
 *
 * Le select Prisma de `workflow.service.ts` (transition `update`) doit inclure ces 9 champs.
 * Aucun fallback `?? ''` n'est autorisé côté frontend (cf. direction.api.ts).
 */
export const zVersionItem = z.object({
  id: zUuid,
  semestreId: zUuid,
  anneeId: zUuid,
  etat: zEtatVersion,
  snapshotId: zUuid.nullish(),
  datePublication: zDateIso.nullish(),
  publiePar: zUuid.nullish(),
  createdAt: zDateIso,
  updatedAt: zDateIso,
});

/** Réponse paginée de l'endpoint liste (contenu de `data` dans l'enveloppe API). */
export const zVersionListe = z.object({
  items: z.array(zVersionItem),
  meta: z.object({ page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative() }),
});

/** Action de transition autorisée par la matrice workflow (18 transitions arbitrées). */
export const zActionTransition = z.enum([
  'creerRepartition',
  'annulerRepartition',
  'validerRepartition',
  'lancerGeneration',
  'editer',
  'selectionnerScenario',
  'annulerGeneration',
  'soumettreValidation',
  'regenerer',
  'transmettreDirection',
  'rejeterPedagogique',
  'validerDefinitivement',
  'rejeterDirectionPedagogique',
  'rejeterDirectionPlanning',
  'publier',
  'archiverSansPublier',
  'archiver',
  'nouvelleVersionArchive',
]);

export type ActionTransition = z.infer<typeof zActionTransition>;

/** Type de motif de rejet, obligatoire pour les actions de rejet. */
export const zTypeMotif = z.enum(['pedagogique', 'planning', 'autre']);

export type TypeMotif = z.infer<typeof zTypeMotif>;

/** Transition d’état demandée. */
export const zTransition = z
  .object({
    action: zActionTransition,
    motif: z.string().trim().optional(),
    typeMotif: zTypeMotif.optional(),
  })
  .refine(
    (valeurs) => {
      const estRejet =
        valeurs.action === 'rejeterPedagogique' ||
        valeurs.action === 'rejeterDirectionPedagogique' ||
        valeurs.action === 'rejeterDirectionPlanning';
      return !estRejet || (valeurs.motif && valeurs.motif.length > 0);
    },
    {
      message: 'Un motif est obligatoire pour une action de rejet',
      path: ['motif'],
    },
  )
  .refine(
    (valeurs) => {
      const estRejet =
        valeurs.action === 'rejeterPedagogique' ||
        valeurs.action === 'rejeterDirectionPedagogique' ||
        valeurs.action === 'rejeterDirectionPlanning';
      return !estRejet || valeurs.typeMotif !== undefined;
    },
    {
      message: 'Un type de motif est obligatoire pour une action de rejet',
      path: ['typeMotif'],
    },
  );

export type TransitionInput = z.infer<typeof zTransition>;

/** Lancement d’une génération CP-SAT. */
export const zGeneration = z.object({
  versionId: zUuid,
});

/** Scénario produit par le solveur. */
export const zScenario = z.object({
  id: zUuid,
  generationId: zUuid,
  scoreGlobal: z.number().int().min(0).max(100),
  sousScores: z.record(z.number().finite()),
  selectionne: z.boolean(),
  /** Placements des séances (salle / enseignant / jour / créneau) exposés par le solveur. */
  placements: z.array(zPlacementPersistee).default([]),
  createdAt: zDateIso,
});

/** Sélection d’un scénario. */
export const zScenarioSelect = z.object({
  scenarioId: zUuid,
});

/** Lancement d’un export. */
export const zExport = z.object({
  versionId: zUuid,
  format: z.enum(['xlsx', 'pdf', 'ics']),
});

/** Filtres du journal d’audit. */
export const zAudit = z
  .object({
    page: z.coerce.number().int().positive('La page doit être supérieure à 0').default(1),
    pageSize: z.coerce
      .number()
      .int()
      .positive('La taille de page doit être supérieure à 0')
      .max(200, 'La taille de page ne peut pas dépasser 200')
      .default(20),
    action: z.string().trim().min(1).optional(),
    entite: z.string().trim().min(1).optional(),
    entiteId: z.string().trim().min(1).optional(),
    utilisateurId: zUuid.optional(),
    dateDebut: zDateIso.optional(),
    dateFin: zDateIso.optional(),
    search: z.string().trim().min(1).optional(),
  })
  .refine(
    (valeurs) =>
      valeurs.dateDebut === undefined ||
      valeurs.dateFin === undefined ||
      new Date(valeurs.dateDebut) <= new Date(valeurs.dateFin),
    {
      message: 'La date de début doit être antérieure ou égale à la date de fin',
      path: ['dateFin'],
    },
  );

export type VersionInput = z.infer<typeof zVersion>;
export type VersionParams = z.infer<typeof zVersionParams>;
export type VersionListFilters = z.infer<typeof zVersionList>;
export type VersionItem = z.infer<typeof zVersionItem>;
export type VersionListe = z.infer<typeof zVersionListe>;
export type GenerationInput = z.infer<typeof zGeneration>;
export type Scenario = z.infer<typeof zScenario>;
export type ScenarioSelectInput = z.infer<typeof zScenarioSelect>;
export type ExportInput = z.infer<typeof zExport>;
export type AuditFilters = z.infer<typeof zAudit>;

/** Données d’initialisation d’un nouveau semestre (année + semestre + version initiale). */
export const zInitialisationInput = z.object({
  libelleAnnee: z.string().trim().min(1, 'Le libellé de l’année universitaire est obligatoire'),
  numeroSemestre: z.number().int().min(1, 'Le numéro de semestre doit être 1 ou 2').max(2, 'Le numéro de semestre doit être 1 ou 2'),
  dateDebutAnnee: zDateIso,
  dateFinAnnee: zDateIso,
  dateDebutSemestre: zDateIso,
  dateFinSemestre: zDateIso,
});

export type InitialisationInput = z.infer<typeof zInitialisationInput>;

/** Résultat de l’initialisation (version créée en état `initial`). */
export const zInitialisationOutput = z.object({
  id: zUuid,
  semestreId: zUuid,
  anneeId: zUuid,
  etat: zEtatVersion.default('initial'),
  createdAt: zDateIso,
});

export type InitialisationOutput = z.infer<typeof zInitialisationOutput>;

/** Item d’année universitaire avec ses semestres et l’état de la version associée. */
export const zSemestreUniversitaireItem = z.object({
  id: zUuid,
  numero: z.number().int(),
  dateDebut: zDateIso,
  dateFin: zDateIso,
  versionId: zUuid.nullish(),
  etatVersion: zEtatVersion.nullish(),
});

export const zAnneeUniversitaireItem = z.object({
  id: zUuid,
  libelle: z.string(),
  dateDebut: zDateIso,
  dateFin: zDateIso,
  semestres: z.array(zSemestreUniversitaireItem),
});

/** Réponse paginée de l’endpoint liste des années universitaires. */
export const zAnneesUniversitairesListe = z.object({
  items: z.array(zAnneeUniversitaireItem),
  meta: z.object({ page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative() }),
});

export type SemestreUniversitaireItem = z.infer<typeof zSemestreUniversitaireItem>;
export type AnneeUniversitaireItem = z.infer<typeof zAnneeUniversitaireItem>;
export type AnneesUniversitairesListe = z.infer<typeof zAnneesUniversitairesListe>;
