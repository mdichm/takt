// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../common/http/api-error';
import { AuditService } from '../audit/audit.service';
import { BossQueueService } from './worker/boss-queue.service';
import { PreconditionsService } from './preconditions/preconditions.service';
import { EventsHubService } from '../events/events-hub.service';
import { type GenerationJobData } from '../common/di/boss.token';
import type { ResultatPreconditions } from '@takt/contracts';

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
    private readonly preconditionsService: PreconditionsService,
    private readonly eventsHub: EventsHubService,
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

    // Contrôle des préconditions avant création du job pg-boss (TAKT-L07-07)
    const preconditions: ResultatPreconditions =
      await this.preconditionsService.checkGenerationPreconditions(versionId);
    if (!preconditions.satisfaites) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Préconditions de génération non satisfaites',
        {
          versionId,
          violations: preconditions.violations,
          avertissements: preconditions.avertissements,
        },
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
   * Annule une génération en cours (retour de la version à « brouillon »).
   *
   * Garde : la génération doit être à l'état `EN_COURS` et aucun scénario
   * ne doit avoir été adopté (sinon 409). Écrit le journal d'audit et
   * diffuse un événement SSE `generation.cancelled`.
   *
   * @param generationId Identifiant de la génération à annuler
   * @param utilisateurId Identifiant de l'utilisateur demandeur
   * @returns `{ id, statut }` de l'annulation
   *
   * @throws ApiError 404 si la génération n'existe pas
   * @throws ApiError 409 si la génération n'est pas annulable
   */
  async annulerGeneration(generationId: string, utilisateurId: string) {
    // 1. Récupère la génération et sa version
    const generation = await this.prisma.generation.findUnique({
      where: { id: generationId },
      select: { id: true, versionId: true, statut: true },
    });
    if (!generation) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Génération introuvable');
    }

    // 2. Garde : statut EN_COURS uniquement
    if (generation.statut !== 'EN_COURS') {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        `La génération ne peut pas être annulée (statut actuel : ${generation.statut})`,
        { generationId, statut: generation.statut },
      );
    }

    // 3. Garde : aucun scénario adopté (selectionne = true)
    const scenarioAdopte = await this.prisma.scenario.findFirst({
      where: { generationId, selectionne: true },
      select: { id: true },
    });
    if (scenarioAdopte) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Une génération ayant un scénario adopté ne peut pas être annulée',
        { generationId, scenarioId: scenarioAdopte.id },
      );
    }

    // 4. Marque la génération comme annulée
    await this.prisma.generation.update({
      where: { id: generationId },
      data: { statut: 'ANNULEE' },
    });

    // 5. Remet la version à brouillon (transition generation → brouillon)
    await this.prisma.version.update({
      where: { id: generation.versionId },
      data: { etat: 'brouillon' },
    });

    // 6. Audit de la transition d'état (GG-07)
    await this.auditService.record({
      action: 'TRANSITION_ETAT',
      utilisateurId,
      entite: 'Generation',
      entiteId: generationId,
      metadonnees: {
        versionId: generation.versionId,
        statutAvant: 'EN_COURS',
        statutApres: 'ANNULEE',
      },
    });

    // 7. Événement SSE d'annulation
    await this.eventsHub.publier(utilisateurId, {
      type: 'generation.cancelled',
      versionId: generation.versionId,
      generationId,
    });

    return { id: generationId, statut: 'ANNULEE' };
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

}