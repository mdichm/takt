// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/** Module transverse exposant les endpoints opérationnels de l'API. */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class CommonModule {}
