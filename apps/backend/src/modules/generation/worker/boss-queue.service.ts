// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type GenerationJobData } from '../../common/di/boss.token';
import { GenerationWorkerService } from './generation-worker.service';

/** Nom de la file de jobs de génération. */
export const QUEUE_GENERATION = 'generation.run';

/** Nombre maximal de tentatives d'exécution d'un job (retry borné). */
export const JOB_RETRY_LIMIT = 2;

/**
 * Adaptateur de la file de jobs pg-boss pour les générations CP-SAT.
 *
 * pg-boss est un package ESM ; son instanciation se fait par import dynamique
 * afin de rester compatible avec le backend CommonJS (GG-02, stack autorisée).
 *
 * Ce service ne contient aucune logique métier : il expose uniquement
 * l'envoi de jobs et l'abonnement au traitement de la file.
 */
@Injectable()
export class BossQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BossQueueService.name);
  // any-justify: pg-boss est un module ESM chargé par import dynamique ;
  // le backend est CommonJS, pas de typage statique possible.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private boss: any = null;

  constructor(
    private readonly config: ConfigService,
    private readonly worker: GenerationWorkerService,
  ) {}

  async onModuleInit(): Promise<void> {
    // En environnement de test (génération OpenAPI, tests unitaires),
    // pg-boss n'est pas initialisé : pas de base de données disponible.
    if (process.env.NODE_ENV === 'test') {
      this.logger.log('pg-boss non initialisé en environnement de test');
      return;
    }

    try {
      const pgBossModule = await import('pg-boss');
      const PgBoss = pgBossModule.PgBoss;

      const databaseUrl =
        this.config.get<string>('PGBOSS_DATABASE_URL') ??
        this.config.get<string>('DATABASE_URL');

      if (!databaseUrl) {
        throw new Error(
          'PGBOSS_DATABASE_URL (ou DATABASE_URL) est requise pour pg-boss',
        );
      }

      this.boss = new PgBoss(databaseUrl);
      await this.boss.start();
      await this.boss.createQueue(QUEUE_GENERATION);

      // Démarre le consommateur de jobs de génération
      // any-justify: pg-boss est ESM, les types du job ne sont pas statiquement disponibles
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.boss.work(QUEUE_GENERATION, async (job: any) => {
        const donnees = job.data as GenerationJobData;
        await this.worker.executer(donnees.generationId, donnees.demandeurId);
        job.done();
      });

      this.logger.log(
        `File pg-boss '${QUEUE_GENERATION}' initialisée et consommateur démarré`,
      );
    } catch (err) {
      // En environnement de test (génération OpenAPI), pg-boss peut être
      // indisponible ; on dégrade sans échouer l'initialisation de l'app.
      this.logger.warn(
        `pg-boss non disponible (${err instanceof Error ? err.message : String(err)}), les jobs de génération ne pourront pas être envoyés`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.boss) {
      await this.boss.stop();
      this.boss = null;
      this.logger.log('Connexion pg-boss fermée');
    }
  }

  /** Envoie un job de génération dans la file. */
  async envoyerGenerationJob(donnees: GenerationJobData): Promise<string> {
    if (!this.boss) {
      throw new Error('pg-boss n’est pas initialisé');
    }
    // any-justify: pg-boss est ESM typé dynamiquement, le backend est CJS
    const id = await this.boss.send(QUEUE_GENERATION, donnees, {
      retryLimit: JOB_RETRY_LIMIT,
      retryBackoff: true,
      expireInSeconds: 3600,
    });
    this.logger.log(`Job de génération envoyé : ${id}`);
    return id as string;
  }

  get estPret(): boolean {
    return this.boss !== null;
  }
}
