// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from './prisma/prisma.module';
import { PRISMA } from './di/prisma.token';
import { PrismaService } from './prisma/prisma.service';

/** Module transverse exposant les endpoints opérationnels de l'API. */
@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    PrismaService,
    { provide: PRISMA, useExisting: PrismaService },
  ],
  exports: [PrismaModule, PRISMA],
})
export class CommonModule {}
