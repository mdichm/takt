// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ReferentielsModule } from '../referentiels/referentiels.module';
import { VersionsModule } from '../versions/versions.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlanEtudesController } from './plan-etudes/plan-etudes.controller';
import { PlanEtudesService } from './plan-etudes/plan-etudes.service';
import { AffectationPedagogiqueController } from './affectation/affectation.controller';
import { AffectationPedagogiqueService } from './affectation/affectation.service';
import { RepartitionController } from './repartition/repartition.controller';
import { RepartitionService } from './repartition/repartition.service';
import { RevalidationController } from './revalidation/revalidation.controller';
import { RevalidationService } from './revalidation/revalidation.service';

/** Module de la répartition pédagogique et de la charge horaire. */
@Module({
  imports: [CommonModule, ReferentielsModule, VersionsModule, AuditModule, NotificationsModule],
  providers: [
    PlanEtudesService,
    AffectationPedagogiqueService,
    RepartitionService,
    RevalidationService,
  ],
  controllers: [
    PlanEtudesController,
    AffectationPedagogiqueController,
    RepartitionController,
    RevalidationController,
  ],
  exports: [
    PlanEtudesService,
    AffectationPedagogiqueService,
    RepartitionService,
    RevalidationService,
  ],
})
export class RepartitionModule {}
