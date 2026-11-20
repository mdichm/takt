// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import { EventsHubService } from '../../events/events-hub.service';
import { DerivedFileService } from '../derived-file/derived-file.service';
import { SOLVEUR, type ScenarioSolveur } from '../../common/di/solveur.token';

/** Nombre maximal de scénarios à persister par génération. */
export const MAX_SCENARIOS = 3;

/** Étapes de progression d'une génération, en pourcentage. */
const ETAPES = {
  validationPrerequis: 10,
  snapshot: 25,
  fichierDerive: 40,
  solveur: 70,
  persistence: 90,
  terminee: 100,
} as const;

/**
 * Processeur du job pg-boss `generation.run`.
 *
 * Orchestre l'exécution asynchrone d'une génération CP-SAT :
 * vérification des prérequis, création du snapshot, construction du fichier
 * dérivé, appel du solveur, persistance des scénarios, mise à jour de la
 * version et diffusion SSE.
 *
 * Ce service est appelé par le gestionnaire de file pg-boss. Il ne dépend
 * que de modules amont (versions, snapshot, derived-file, audit, events)
 * et du token SOLVEUR (remplaçable par un double en test).
 */
@Injectable()
export class GenerationWorkerService {
  private readonly logger = new Logger(GenerationWorkerService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(SOLVEUR) private readonly solveur: Solveur,
    private readonly derivedFileService: DerivedFileService,
    private readonly eventsHub: EventsHubService,
  ) {}

  /**
   * Traite un job de génération.
   *
   * @param generationId Identifiant de la génération à exécuter
   * @param utilisateurId Identifiant de l'utilisateur demandeur
   */
  async executer(generationId: string, utilisateurId: string): Promise<void> {
    const debut = Date.now();

    // Récupère la génération et sa version
    const generation = await this.prisma.generation.findUnique({
      where: { id: generationId },
      include: {
        version: {
          select: {
            id: true,
            etat: true,
            semestreId: true,
          },
        },
      },
    });
    if (!generation) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Génération introuvable',
      );
    }

    const { version } = generation;

    try {
      // --- Étape 1 : Vérification des prérequis ---
      await this.emettreProgression(
        utilisateurId,
        version.id,
        ETAPES.validationPrerequis,
        'Vérification des prérequis de génération',
      );

      // Vérifie que la version est dans un état autorisé
      if (version.etat !== 'brouillon') {
        throw new ApiError(
          CODES_ERREUR_API.CONFLICT,
          409,
          `La version doit être à l'état « brouillon » pour lancer une génération (état actuel : ${version.etat})`,
          { versionId: version.id, etat: version.etat },
        );
      }

      // Vérifie les prérequis métier (départements validés, couverture, verrous)
      await this.verifierPrerequisGeneration(version.id);

      // Marque la génération comme EN_COURS
      await this.prisma.generation.update({
        where: { id: generationId },
        data: { statut: 'EN_COURS' },
      });

      // --- Étape 2 : Création du snapshot ---
      await this.emettreProgression(
        utilisateurId,
        version.id,
        ETAPES.snapshot,
        'Création du snapshot de version',
      );

      const snapshot = await this.prisma.snapshot.create({
        data: {
          versionId: version.id,
          type: 'VERSION',
          revision: 1,
          estCourant: true,
          donnees: {},
          hash: '',
        },
      });

      await this.prisma.generation.update({
        where: { id: generationId },
        data: { snapshotId: snapshot.id },
      });

      // --- Étape 3 : Construction du fichier dérivé ---
      await this.emettreProgression(
        utilisateurId,
        version.id,
        ETAPES.fichierDerive,
        'Construction du fichier dérivé d’entrée du solveur',
      );

      const fichierDerive = await this.derivedFileService.construireEtEcrire(
        version.id,
        { generationId, createdAt: new Date().toISOString() },
      );

      // --- Étape 4 : Appel du solveur CP-SAT ---
      await this.emettreProgression(
        utilisateurId,
        version.id,
        ETAPES.solveur,
        'Appel du solveur CP-SAT',
      );

      const scenarios = await this.solveur.solve(fichierDerive as unknown);

      // --- Étape 5 : Persistance des scénarios (max 3) ---
      await this.emettreProgression(
        utilisateurId,
        version.id,
        ETAPES.persistence,
        `Persistance de ${Math.min(scenarios.length, MAX_SCENARIOS)} scénario(s)`,
      );

      const scenariosAA = scenarios.slice(0, MAX_SCENARIOS);

      const dureeMs = Date.now() - debut;

      // Crée les scénarios en base
      for (const scenario of scenariosAA) {
        await this.prisma.scenario.create({
          data: {
            generationId,
            scoreGlobal: scenario.score,
            sousScores: {},
            placements: {},
            selectionne: false,
          },
        });
      }

      // Met à jour la génération comme terminée
      await this.prisma.generation.update({
        where: { id: generationId },
        data: {
          statut: 'TERMINEE',
          dureeMs,
          nombreScenarios: scenariosAA.length,
          scores: {
            nombreScenarios: scenariosAA.length,
            dureeMs,
          },
        },
      });

      // Transition de version : generation → edition
      await this.prisma.version.update({
        where: { id: version.id },
        data: { etat: 'edition' },
      });

      // Audit de la génération réussie
      await this.auditService.record({
        action: 'CREATION',
        utilisateurId,
        entite: 'Generation',
        entiteId: generationId,
        metadonnees: {
          versionId: version.id,
          statut: 'TERMINEE',
          nombreScenarios: scenariosAA.length,
          dureeMs,
          transitionVersion: 'generation -> edition',
        },
      });

      // --- Étape 6 : Événement SSE de fin ---
      await this.emettreProgression(
        utilisateurId,
        version.id,
        ETAPES.terminee,
        'Génération terminée avec succès',
        { type: 'generation.done', versionId: version.id, generationId },
      );

      this.logger.log(
        `Génération ${generationId} terminée : ${scenariosAA.length} scénario(s) en ${dureeMs}ms`,
      );
    } catch (err) {
      const dureeMs = Date.now() - debut;

      // En cas d'échec, remet la version en brouillon et marque la génération ECHEC
      await this.prisma.$transaction([
        this.prisma.generation.update({
          where: { id: generationId },
          data: {
            statut: 'ECHEC',
            dureeMs,
            scores: {
              erreur: err instanceof Error ? err.message : String(err),
              dureeMs,
            },
          },
        }),
        this.prisma.version.update({
          where: { id: version.id },
          data: { etat: 'brouillon' },
        }),
      ]);

      // Audit de l'échec
      await this.auditService.record({
        action: 'CREATION',
        utilisateurId,
        entite: 'Generation',
        entiteId: generationId,
        metadonnees: {
          versionId: version.id,
          statut: 'ECHEC',
          erreur: err instanceof Error ? err.message : String(err),
          dureeMs,
        },
      });

      // Événement SSE d'échec
      await this.emettreProgression(
        utilisateurId,
        version.id,
        100,
        'Échec de la génération',
        {
          type: 'generation.failed',
          versionId: version.id,
          generationId,
          erreur:
            err instanceof Error
              ? err.message
              : 'Erreur inconnue lors de la génération',
        },
      );

      this.logger.error(
        `Génération ${generationId} échouée : ${err instanceof Error ? err.message : String(err)}`,
      );

      // Relance l'erreur pour que pg-boss puisse gérer le retry
      throw err;
    }
  }

  /**
   * Vérifie que la génération peut être lancée sur cette version.
   *
   * @throws ApiError 409 avec le nom du département manquant si un département n'est pas validé
   */
  private async verifierPrerequisGeneration(versionId: string): Promise<void> {
    // Récupère les validations de répartition par département
    const validations = await this.prisma.validationRepartition.findMany({
      where: { versionId },
      select: { departementId: true, etat: true },
    });

    if (validations.length === 0) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Aucun département n’a validé sa répartition pédagogique pour cette version',
        { versionId },
      );
    }

    const nonValides = validations.filter((v) => v.etat !== 'VALIDE');
    if (nonValides.length > 0) {
      const noms = nonValides.map((v) => v.departementId).join(', ');
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        `Département(s) non validé(s) : ${noms}`,
        { versionId, departementsNonValides: nonValides.map((v) => v.departementId) },
      );
    }

    // Vérifie l'absence de verrou bloquant (garde métier TAKT-L06-08)
    const verrousBloquants = await this.prisma.verrouSeance.findMany({
      where: { versionId },
      select: { id: true, type: true },
      take: 1,
    });
    if (verrousBloquants.length > 0) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'La génération est bloquée par un ou plusieurs verrous de séance',
        { versionId, verrousBloquants: verrousBloquants.length },
      );
    }

    // TODO TAKT-L07-07 : vérification de couverture pédagogique via GARDE_COUVERTURE
    // (garde-fous de lancement de génération, ticket séparé)
  }

  /**
   * Émet un événement de progression via le hub SSE.
   */
  private async emettreProgression(
    utilisateurId: string,
    versionId: string,
    progression: number,
    message: string,
    evenement?: Parameters<typeof EventsHubService.prototype.publier>[1],
  ): Promise<void> {
    const payload = evenement ?? {
      type: 'generation.progress',
      versionId,
      progression,
      message,
    };
    this.eventsHub.publier(utilisateurId, payload as never);
  }
}

interface Solveur {
  solve(fichierDerive: unknown): Promise<readonly ScenarioSolveur[]>;
}