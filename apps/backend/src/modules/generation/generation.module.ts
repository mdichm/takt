// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PlanningModule } from '../planning/planning.module';
import { ReferentielsModule } from '../referentiels/referentiels.module';
import { VersionsModule } from '../versions/versions.module';
import { EventsModule } from '../events/events.module';
import { DerivedFileModule } from './derived-file/derived-file.module';
import { GenerationsController } from './generations.controller';
import { GenerationsService } from './generations.service';
import { BossQueueService } from './worker/boss-queue.service';
import { GenerationWorkerService } from './worker/generation-worker.service';

/** Module de préparation et d’exécution des générations de scénarios. */
@Module({
  imports: [CommonModule, ReferentielsModule, VersionsModule, PlanningModule, DerivedFileModule, EventsModule],
  providers: [
    BossQueueService,
    GenerationWorkerService,
    GenerationsService,
  ],
  controllers: [GenerationsController],
  exports: [GenerationsService],
})
export class GenerationModule {}

