// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import {
  zPlacementPersistee,
  type PlacementPersistee,
  type ScenarioSelectReponse,
} from '@takt/contracts';

@Injectable()
export class SelectionService {
  private readonly logger = new Logger(SelectionService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async selectionnerScenario(
    generationId: string,
    scenarioId: string,
    utilisateurId: string,
  ): Promise<ScenarioSelectReponse> {
    const generation = await this.prisma.generation.findUnique({
      where: { id: generationId },
      select: {
        id: true,
        statut: true,
        versionId: true,
        version: { select: { id: true, etat: true } },
      },
    });
    if (!generation) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Génération introuvable',
        { generationId },
      );
    }

    const scenarios = await this.prisma.scenario.findMany({
      where: { generationId },
      select: {
        id: true,
        selectionne: true,
        scoreGlobal: true,
        placements: true,
        sousScores: true,
      },
    });
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Scénario introuvable pour cette génération',
        { generationId, scenarioId },
      );
    }

    if (generation.statut !== 'TERMINEE') {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        `La génération doit être terminée pour sélectionner un scénario (statut : ${generation.statut})`,
        { generationId, statut: generation.statut },
      );
    }

    if (scenario.selectionne) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Ce scénario a déjà été adopté',
        { generationId, scenarioId },
      );
    }

    if (generation.version.etat !== 'generation') {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        `La version doit être à l'état « génération » pour adopter un scénario (état actuel : ${generation.version.etat})`,
        { versionId: generation.versionId, etat: generation.version.etat },
      );
    }

    let placementsValides: PlacementPersistee[];
    try {
      placementsValides = zPlacementPersistee
        .array()
        .parse(scenario.placements as unknown[]);
    } catch (err) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Placements du scénario invalides',
        {
          generationId,
          scenarioId,
          detail: err instanceof Error ? err.message : String(err),
        },
      );
    }

    const seancesCrees: Array<{ id: string }> = await this.prisma.$transaction(
      async (tx) => {
        const crees: Array<{ id: string }> = [];

        for (const placement of placementsValides) {
          const affectation = await tx.affectationPedagogique.findUnique({
            where: { id: placement.activityId },
          });
          if (!affectation) {
            throw new ApiError(
              CODES_ERREUR_API.BAD_REQUEST,
              400,
              `Affectation pédagogique introuvable : ${placement.activityId}`,
              { champ: 'activityId' },
            );
          }
          if (affectation.versionId !== generation.versionId) {
            throw new ApiError(
              CODES_ERREUR_API.BAD_REQUEST,
              400,
              "L'affectation pédagogique n'appartient pas à cette version",
              { champ: 'activityId', versionId: generation.versionId },
            );
          }

          const jour = placement.day + 1;
          const creneauDebut = await tx.creneau.findFirst({
            where: { jour, ordre: placement.slot + 1 },
          });
          if (!creneauDebut) {
            throw new ApiError(
              CODES_ERREUR_API.BAD_REQUEST,
              400,
              `Aucun créneau d'ordre ${placement.slot + 1} pour le jour ${jour}`,
              { champ: 'creneauDebutId', jour },
            );
          }

          const dureeCreneauMinutes = creneauDebut.heureFin
            ? Math.round(
                (creneauDebut.heureFin.getTime() - creneauDebut.heureDebut.getTime()) /
                  (1000 * 60),
              )
            : 30;
          const nbCreneaux = Math.ceil(
            (affectation.dureeCreneaux ?? 30) / dureeCreneauMinutes,
          );

          for (let i = 0; i < nbCreneaux; i++) {
            const creneauConsecutif = await tx.creneau.findFirst({
              where: { jour, ordre: creneauDebut.ordre + i },
            });
            if (!creneauConsecutif) {
              throw new ApiError(
                CODES_ERREUR_API.BAD_REQUEST,
                400,
                `Le créneau d'ordre ${creneauDebut.ordre + i} n'existe pas pour le jour ${jour}`,
                { champ: 'creneauDebutId', nbCreneaux },
              );
            }
          }

          const dureeSeanceMinutes = nbCreneaux * dureeCreneauMinutes;
          const volumeMinutes = affectation.volumeHebdo * 60;
          if (dureeSeanceMinutes > volumeMinutes) {
            throw new ApiError(
              CODES_ERREUR_API.BAD_REQUEST,
              400,
              'La durée de la séance dépasse le volume horaire de l’affectation',
              {
                champ: 'nbCreneaux',
                dureeSeanceMinutes,
                volumeHebdo: affectation.volumeHebdo,
                volumeMinutes,
              },
            );
          }

          const seance = await tx.seance.create({
            data: {
              versionId: generation.versionId,
              jour,
              creneauDebutId: creneauDebut.id,
              nbCreneaux,
              salleId: placement.roomId ?? null,
              enseignantId: placement.teacherId ?? null,
              groupeId: affectation.groupeId,
              matiereId: affectation.matiereId,
              typeEnseignementId: affectation.typeEnseignementId,
              affectationId: affectation.id,
              estVerrouillee: false,
            },
            select: { id: true },
          });

          crees.push(seance);
        }


        await tx.scenario.update({
          where: { id: scenarioId },
          data: { selectionne: true },
        });

        await tx.version.update({
          where: { id: generation.versionId },
          data: { etat: 'edition' },
        });

        return crees;
      },
    );

    // Couverture depuis les sous-scores du scénario
    const sousScores = (scenario.sousScores as Record<string, unknown> | null) ?? {};
    const couverture =
      typeof sousScores.coverage === 'number' ? sousScores.coverage : 0;
    // `unplacedActivities` n'est pas une colonne DB dédiée (stocké dans
    // `sousScores` ou déduit par le solveur). Valeur par défaut 0.
    const nbActivitesNonPlacees = 0;

    // Audit GG-07 : ADOPTION_SCENARIO
    await this.auditService.record({
      action: 'ADOPTION_SCENARIO',
      utilisateurId,
      entite: 'Scenario',
      entiteId: scenarioId,
      metadonnees: {
        generationId,
        versionId: generation.versionId,
        versionCible: 'edition',
        score: scenario.scoreGlobal,
        nbSeances: seancesCrees.length,
        nbActivitesNonPlacees,
        couverture,
        utilisateurId,
      },
    });

    this.logger.log(
      `Scénario ${scenarioId} adopté pour la génération ${generationId} : ${seancesCrees.length} séance(s), version ${generation.versionId} → édition`,
    );

    return {
      versionId: generation.versionId,
      scenarioId,
      nbSeances: seancesCrees.length,
      nbActivitesNonPlacees,
      couverture: couverture as number,
      conflitsResiduels: [],
      avertissements: [],
    };
  }
}