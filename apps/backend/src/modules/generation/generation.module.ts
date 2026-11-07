// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PlanningModule } from '../planning/planning.module';
import { ReferentielsModule } from '../referentiels/referentiels.module';
import { VersionsModule } from '../versions/versions.module';

/** Module de préparation et d’exécution des générations de scénarios. */
@Module({
  imports: [CommonModule, ReferentielsModule, VersionsModule, PlanningModule],
})
export class GenerationModule {}
