// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import {
  creerSchemaTri,
  zBooleanQuery,
  zPaginationMeta,
  zPaginationQuery,
  zUuid,
} from './common';
import { zAffectationPedagogique } from './affectations';
import { zCreneau, zSalle, zEnseignant, zGroupe, zMatiere, zTypeEnseignement } from './referentiels';
import { zLock } from './locks';

/** Identifiant UUID avec un message d’erreur personnalisé. */
function zUuidPersonnalise(message: string) {
  return z.string().uuid(message);
}

/** Données de création d’une séance (POST /api/v1/seances). */
export const zSeanceCreate = z.object({
  versionId: zUuid,
  jour: z
    .number()
    .int()
    .min(1, 'Le jour doit être compris entre 1 et 6')
    .max(6, 'Le jour doit être compris entre 1 et 6'),
  creneauDebutId: zUuidPersonnalise("L'identifiant du créneau de début est requis"),
  nbCreneaux: z.number().int().positive('Le nombre de créneaux doit être supérieur à 0'),
  salleId: zUuid.nullish(),
  enseignantId: zUuid.nullish(),
  groupeId: zUuid.nullish(),
  matiereId: zUuid.nullish(),
  typeEnseignementId: zUuid.nullish(),
  affectationId: zUuidPersonnalise("L'identifiant de l'affectation pédagogique est requis"),
});

/** Données de modification partielle d’une séance (PATCH /api/v1/seances/:id). */
export const zSeanceUpdate = z.object({
  versionId: zUuid.optional(),
  jour: z
    .number()
    .int()
    .min(1, 'Le jour doit être compris entre 1 et 6')
    .max(6, 'Le jour doit être compris entre 1 et 6')
    .optional(),
  creneauDebutId: zUuidPersonnalise("L'identifiant du créneau de début est requis").optional(),
  nbCreneaux: z
    .number()
    .int()
    .positive('Le nombre de créneaux doit être supérieur à 0')
    .optional(),
  salleId: zUuid.nullish().optional(),
  enseignantId: zUuid.nullish().optional(),
  groupeId: zUuid.nullish().optional(),
  matiereId: zUuid.nullish().optional(),
  typeEnseignementId: zUuid.nullish().optional(),
  affectationId: zUuidPersonnalise("L'identifiant de l'affectation pédagogique est requis").optional(),
});

/** Données de remplacement complet d’une séance (PUT /api/v1/seances/:id). */
export const zSeanceReplace = zSeanceCreate;

/** Identifiant d’une séance en paramètre de route. */
export const zSeanceParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des séances. */
export const zSeanceList = zPaginationQuery
  .extend(creerSchemaTri(['jour', 'createdAt']).shape)
  .extend({
    versionId: zUuid.optional(),
    jour: z.coerce.number().int().min(1).max(6).optional(),
    salleId: zUuid.optional(),
    enseignantId: zUuid.optional(),
    groupeId: zUuid.optional(),
    matiereId: zUuid.optional(),
    typeEnseignementId: zUuid.optional(),
    affectationId: zUuid.optional(),
    estVerrouillee: zBooleanQuery.optional(),
  });

/** Lot de séances soumis à la règle d’unicité d’une salle. */
export const zSeancesBatch = z
  .object({ seances: z.array(zSeanceCreate) })
  .superRefine((lot, contexte) => {
    const couples = new Set<string>();
    for (const seance of lot.seances) {
      if (seance.salleId === undefined || seance.salleId === null) {
        continue;
      }
      const couple = `${seance.jour}:${seance.creneauDebutId}:${seance.salleId}`;
      if (couples.has(couple)) {
        contexte.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Deux séances ne peuvent pas partager le même jour, le même créneau et la même salle',
          path: ['seances'],
        });
        return;
      }
      couples.add(couple);
    }
  });

/** Représentation complète d'une séance avec ses relations (GET /seances, GET /seances/:id). */
export const zSeance = z.object({
  id: zUuid,
  versionId: zUuid,
  jour: z.number().int().min(1, 'Le jour doit être compris entre 1 et 6').max(6, 'Le jour doit être compris entre 1 et 6'),
  creneauDebutId: zUuid,
  nbCreneaux: z.number().int().positive('Le nombre de créneaux doit être supérieur à 0'),
  salleId: zUuid.nullable(),
  enseignantId: zUuid.nullable(),
  groupeId: zUuid.nullable(),
  matiereId: zUuid.nullable(),
  typeEnseignementId: zUuid.nullable(),
  affectationId: zUuid,
  estVerrouillee: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  creneauDebut: zCreneau,
  salle: zSalle.nullable(),
  enseignant: zEnseignant.nullable(),
  groupe: zGroupe.nullable(),
  matiere: zMatiere.nullable(),
  typeEnseignement: zTypeEnseignement.nullable(),
  affectation: zAffectationPedagogique,
  verrous: z.array(zLock),
});

/** Réponse paginée de la liste des séances (GET /seances). */
export const zSeanceListe = z.object({
  items: z.array(zSeance),
  meta: zPaginationMeta,
});

export type Seance = z.infer<typeof zSeance>;
export type SeanceListe = z.infer<typeof zSeanceListe>;
export type SeanceCreateInput = z.infer<typeof zSeanceCreate>;
export type SeanceUpdateInput = z.infer<typeof zSeanceUpdate>;
export type SeanceReplaceInput = z.infer<typeof zSeanceReplace>;
export type SeanceParams = z.infer<typeof zSeanceParams>;
export type SeanceListFilters = z.infer<typeof zSeanceList>;
export type SeancesBatch = z.infer<typeof zSeancesBatch>;

/** Type de conflit détecté par le moteur de conflits (13 codes). */
export const zTypeConflit = z.enum([
  'ENSEIGNANT',
  'GROUPE',
  'SALLE',
  'CAPACITE',
  'EQUIPEMENT',
  'COMPATIBILITE',
  'INDISPONIBILITE',
  'PAUSE',
  'REGLE_PEDAGOGIQUE',
  'VERROU',
  'COVOITURAGE',
  'VOEU',
  'DONNEE_MANQUANTE',
]);

/** Sévérité d'un conflit. */
export const zSeveriteConflit = z.enum(['BLOQUANT', 'AVERTISSEMENT', 'INFORMATION']);

/** Un conflit détecté (contrat partagé avec le moteur @takt/conflict-engine). */
export const zConflit = z.object({
  type: zTypeConflit,
  severite: zSeveriteConflit,
  message: z.string(),
  details: z.record(z.string(), z.unknown()),
});

/** Liste de conflits retournée par l'endpoint de lecture. */
export const zConflitsListe = z.object({
  conflits: z.array(zConflit),
  bloquant: z.boolean(),
});

export type TypeConflit = z.infer<typeof zTypeConflit>;
export type SeveriteConflit = z.infer<typeof zSeveriteConflit>;
export type Conflit = z.infer<typeof zConflit>;
export type ConflitsListe = z.infer<typeof zConflitsListe>;

/**
 * Contrats de simulation d'alternatives de placement — TAKT-L06-06
 * ST_TAKT §3.5 (endpoint POST /api/v1/seances/:id/simuler)
 */

/**
 * Requête de simulation d'alternatives (corps de POST /simuler).
 */
export const zSimulationRequete = z.object({
  /** Nombre de créneaux consécutifs à simuler (défaut 1). */
  nbCreneaux: z.number().int().positive().default(1),
  /** Créneau de début visé (optionnel, filtre les candidats). */
  cibleCreneauDebutId: zUuid.nullish().optional(),
  /** Salle visée (optionnel, filtre les candidats). */
  cibleSalleId: zUuid.nullish().optional(),
  /** Nombre maximal d'alternatives retournées (défaut 20, max 20). */
  nbAlternativesMax: z.number().int().positive().max(20).default(20),
});

/**
 * Sous-scores de qualité d'une alternative (0-100 chacun).
 * Aligné sur le modèle de sous-scores du solveur CP-SAT.
 */
export const zSousScoresSimulation = z.object({
  continuite: z.number().min(0).max(100),
  heuresTardives: z.number().min(0).max(100),
  preferences: z.number().min(0).max(100),
});

/**
 * Une alternative de placement simulée et évaluée.
 */
export const zAlternativePlacement = z.object({
  candidat: z.object({
    jour: z.number().int().positive(),
    creneauDebutId: zUuid,
    nbCreneaux: z.number().int().positive(),
    salleId: zUuid,
    enseignantId: zUuid.nullish(),
  }),
  score: z.number().min(0).max(100),
  sousScores: zSousScoresSimulation,
  conflitsResiduels: z.array(zConflit),
});

/**
 * Réponse de simulation (liste d'alternatives classées).
 */
export const zSimulationReponse = z.object({
  alternatives: z.array(zAlternativePlacement),
  message: z.string().optional(),
});

export type SimulationRequete = z.infer<typeof zSimulationRequete>;
export type SousScoresSimulation = z.infer<typeof zSousScoresSimulation>;
export type AlternativePlacement = z.infer<typeof zAlternativePlacement>;
export type SimulationReponse = z.infer<typeof zSimulationReponse>;
