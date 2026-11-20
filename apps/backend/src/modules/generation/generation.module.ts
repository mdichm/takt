// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CommonModule } from '../common/common.module';
import { EventsModule } from '../events/events.module';
import { PlanningModule } from '../planning/planning.module';
import { ReferentielsModule } from '../referentiels/referentiels.module';
import { VersionsModule } from '../versions/versions.module';
import { DerivedFileModule } from './derived-file/derived-file.module';
import { GenerationsController } from './generations.controller';
import { GenerationsService } from './generations.service';
import { BossQueueService } from './worker/boss-queue.service';
import { GenerationWorkerService } from './worker/generation-worker.service';
import { SOLVEUR, type ScenarioSolveur } from '../common/di/solveur.token';

/** Double du solveur CP-SAT pour les environnements où le solveur n'est pas encore connecté (TAKT-L07-02). */
class SolveurDouble {
  async solve(): Promise<readonly ScenarioSolveur[]> {
    return [];
  }
}

/** Module de préparation et d’exécution des générations de scénarios. */
@Module({
  imports: [CommonModule, ReferentielsModule, VersionsModule, PlanningModule, DerivedFileModule, EventsModule, AuditModule],
  providers: [
    BossQueueService,
    GenerationWorkerService,
    GenerationsService,
    { provide: SOLVEUR, useClass: SolveurDouble },
  ],
  controllers: [GenerationsController],
  exports: [GenerationsService],
})
export class GenerationModule {}

