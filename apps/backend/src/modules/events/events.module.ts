// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { EventsController } from './events.controller';
import { EventsGuard } from './events.guard';
import { EventsHubModule } from './events-hub.module';

/** Module de diffusion des événements temps réel. */
@Module({
  imports: [CommonModule, AuthModule, EventsHubModule],
  controllers: [EventsController],
  providers: [EventsGuard],
  exports: [EventsHubModule],
})
export class EventsModule {}
