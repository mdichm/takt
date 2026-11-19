// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from './prisma/prisma.module';
import { PRISMA } from './di/prisma.token';
import { PrismaService } from './prisma/prisma.service';
import { RbacModule } from './rbac/rbac.module';

import { Reflector } from '@nestjs/core';
import { StockageFichiersLocal } from './storage/stockage-fichiers.local';
import { STOCKAGE_FICHIERS } from './di/stockage-fichiers.token';

/** Module transverse exposant les endpoints opérationnels de l'API. */
@Module({
  imports: [PrismaModule, RbacModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    PrismaService,
    Reflector,
    { provide: PRISMA, useFactory: (prisma: PrismaService) => prisma.client, inject: [PrismaService] },
    { provide: STOCKAGE_FICHIERS, useClass: StockageFichiersLocal },
  ],
  exports: [PrismaModule, PRISMA, RbacModule, Reflector, STOCKAGE_FICHIERS],
})
export class CommonModule {}
