// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** Module transverse fournissant l'accès à PostgreSQL. */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
