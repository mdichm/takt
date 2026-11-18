// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { ConflictService } from './conflict.service';
import { ConflictController } from './conflict.controller';

/**
 * Détection des conflits de planning sur une version.
 * Dépend uniquement de `common` (Prisma) — pas de cycle avec `versions` ni `seances`.
 */
@Module({
  imports: [CommonModule],
  controllers: [ConflictController],
  providers: [ConflictService],
  exports: [ConflictService],
})
export class ConflictModule {}
