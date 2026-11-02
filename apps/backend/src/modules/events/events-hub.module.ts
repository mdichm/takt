// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { EventsHubService } from './events-hub.service';

/** Module fournissant le hub singleton de diffusion SSE. */
@Module({
  providers: [EventsHubService],
  exports: [EventsHubService],
})
export class EventsHubModule {}
