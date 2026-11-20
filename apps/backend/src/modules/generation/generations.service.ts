// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../common/http/api-error';
import { AuditService } from '../audit/audit.service';
import { BossQueueService } from './worker/boss-queue.service';
import { type GenerationJobData } from '../common/di/boss.token';

/**
 * Service métier des générations CP-SAT.
 *
 * Gère la création des jobs de génération, leur consultation, leur annulation
 * et la récupération des scénarios produits.
 *
 * Dépend uniquement de modules amont (`common`, `versions`) et du token
 * `PGBOSS` (remplaçable par un double en test).
 */
@Injectable()
export class GenerationsService {
  private readonly logger = new Logger(GenerationsService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
    private readonly bossQueue: BossQueueService,
  ) {}

  /**
   * Crée une demande de génération et publie un job pg-boss.
   *
   * @param versionId Identifiant de la version à générer
   * @param utilisateurId Identifiant de l'utilisateur demandeur
   * @returns La génération créée (statut `EN_COURS`)
   *
   * @throws ApiError 404 si la version n'existe pas
   * @throws ApiError 409 si les prérequis ne sont pas remplis
   */
  async creerGeneration(versionId: string, utilisateurId: string) {
    // Vérifie l'existence de la version
    const version = await this.prisma.version.findUnique({
      where: { id: versionId },
      select: { id: true, etat: true },
    });
    if (!version) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Version introuvable');
    }

    if (version.etat !== 'brouillon') {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        `La version doit être à l'état « brouillon » pour lancer une génération (état actuel : ${version.etat})`,
        { versionId, etat: version.etat },
      );
    }

    // Crée la ligne de génération en statut EN_COURS
    const generation = await this.prisma.generation.create({
      data: {
        versionId,
        statut: 'EN_COURS',
        nombreScenarios: 0,
        scores: {},
      },
    });

    // Publie le job pg-boss
    const donneesJob: GenerationJobData = {
      generationId: generation.id,
      versionId,
      demandeurId: utilisateurId,
    };

    const jobId = await this.bossQueue.envoyerGenerationJob(donneesJob);

    this.logger.log(
      `Génération ${generation.id} créée, job pg-boss ${jobId}`,
    );

    // Audit de la création de génération
    await this.auditService.record({
      action: 'CREATION',
      utilisateurId,
      entite: 'Generation',
      entiteId: generation.id,
      metadonnees: {
        versionId,
        statut: 'EN_COURS',
        jobId,
      },
    });

    return generation;
  }

  /**
   * Liste des générations (conforme à docs/openapi.yaml GET /generations).
   * `versionId` est requis.
   */
  async listerGenerations(filtres: {
    versionId: string;
    statut?: string;
  }) {
    const where: Record<string, unknown> = { versionId: filtres.versionId };
    if (filtres.statut) where.statut = filtres.statut;

    const items = await this.prisma.generation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        versionId: true,
        statut: true,
        fichierDerivesId: true,
        scores: true,
        dureeMs: true,
        nombreScenarios: true,
        createdAt: true,
      },
    });

    return {
      items,
      meta: { page: 1, pageSize: items.length, total: items.length },
    };
  }

  /**
   * Récupère une génération par son ID.
   */
  async obtenirGeneration(id: string) {
    const generation = await this.prisma.generation.findUnique({
      where: { id },
      select: {
        id: true,
        versionId: true,
        statut: true,
        snapshotId: true,
        fichierDerivesId: true,
        scores: true,
        dureeMs: true,
        nombreScenarios: true,
        createdAt: true,
      },
    });
    if (!generation) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Génération introuvable');
    }
    return generation;
  }

  /**
   * Récupère les scénarios d'une génération.
   */
  async listerScenarios(generationId: string) {
    const generation = await this.prisma.generation.findUnique({
      where: { id: generationId },
      select: { id: true },
    });
    if (!generation) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Génération introuvable');
    }

    return this.prisma.scenario.findMany({
      where: { generationId },
      orderBy: { scoreGlobal: 'desc' },
      select: {
        id: true,
        generationId: true,
        scoreGlobal: true,
        sousScores: true,
        placements: true,
        selectionne: true,
        createdAt: true,
      },
    });
  }

  /**
   * Sélectionne un scénario produit par le solver (conforme à docs/openapi.yaml POST /generations/:id/select).
   * Marque le scénario sélectionné et passe la version en état `edition`.
   *
   * @throws ApiError 404 si la génération ou le scénario est introuvable
   * @throws ApiError 409 si le scénario n'appartient pas à la génération
   */
  async selectionnerScenario(
    generationId: string,
    scenarioId: string,
    utilisateurId: string,
  ) {
    const generation = await this.prisma.generation.findUnique({
      where: { id: generationId },
      include: {
        scenarios: { select: { id: true } },
        version: { select: { id: true, etat: true } },
      },
    });
    if (!generation) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Génération introuvable');
    }

    const scenarioExiste = generation.scenarios.some((s) => s.id === scenarioId);
    if (!scenarioExiste) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Scénario introuvable pour cette génération',
        { generationId, scenarioId },
      );
    }

    // Désélectionne tous les scénarios puis sélectionne celui demandé
    await this.prisma.$transaction([
      this.prisma.scenario.updateMany({
        where: { generationId },
        data: { selectionne: false },
      }),
      this.prisma.scenario.update({
        where: { id: scenarioId },
        data: { selectionne: true },
      }),
      this.prisma.version.update({
        where: { id: generation.versionId },
        data: { etat: 'edition' },
      }),
    ]);

    // Audit de la sélection
    await this.auditService.record({
      action: 'CREATION',
      utilisateurId,
      entite: 'Generation',
      entiteId: generationId,
      metadonnees: {
        versionId: generation.versionId,
        action: 'SELECTION_SCENARIO',
        scenarioId,
      },
    });

    this.logger.log(
      `Scénario ${scenarioId} sélectionné pour la génération ${generationId}`,
    );
  }
}