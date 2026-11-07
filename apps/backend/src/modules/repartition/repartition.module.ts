// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ReferentielsModule } from '../referentiels/referentiels.module';
import { VersionsModule } from '../versions/versions.module';
import { AuditModule } from '../audit/audit.module';
import { PlanEtudesController } from './plan-etudes/plan-etudes.controller';
import { PlanEtudesService } from './plan-etudes/plan-etudes.service';

/** Module de la répartition pédagogique et de la charge horaire. */
@Module({
  imports: [CommonModule, ReferentielsModule, VersionsModule, AuditModule],
  providers: [PlanEtudesService],
  controllers: [PlanEtudesController],
  exports: [PlanEtudesService],
})
export class RepartitionModule {}
