// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlanningModule } from '../planning/planning.module';
import { VersionsModule } from '../versions/versions.module';

/** Module de génération asynchrone des exports institutionnels. */
@Module({
  imports: [CommonModule, VersionsModule, PlanningModule, NotificationsModule],
})
export class ExportsModule {}
