// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Global, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CommonModule } from '../common/common.module';
import { EventsModule } from '../events/events.module';
import { NOTIFICATION_INITIALISATION } from '../common/di/notification-initialisation.token';
import { NotificationsService } from './notifications.service';
import { UsersModule } from '../users/users.module';

/**
 * Module des notifications in-app et des e-mails institutionnels.
 *
 * Déclaré `@Global()` afin que le jeton `NOTIFICATION_INITIALISATION` (lié
 * à `NotificationsService`) soit injectable par le module `versions` sans
 * que ce dernier n’ait à importer `notifications` (respect de la matrice de
 * dépendances, pas de cycle).
 *
 * Dépend uniquement de `common`, `audit`, `events`, `users`.
 */
@Global()
@Module({
  imports: [CommonModule, AuditModule, EventsModule, UsersModule],
  providers: [
    NotificationsService,
    {
      provide: NOTIFICATION_INITIALISATION,
      useExisting: NotificationsService,
    },
  ],
  exports: [NotificationsService, NOTIFICATION_INITIALISATION],
})
export class NotificationsModule {}
