// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CommonModule } from '../common/common.module';
import { EventsModule } from '../events/events.module';
import { NotificationsService } from './notifications.service';
import { UsersModule } from '../users/users.module';

/** Module des notifications in-app et des e-mails institutionnels. */
@Module({
  imports: [CommonModule, AuditModule, EventsModule, UsersModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
