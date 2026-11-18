// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { VerrousController } from './verrous.controller';
import { VerrouService } from './verrous.service';

/**
 * Module des verrous de séance (TAKT-L06-08).
 *
 * Dépendance : uniquement `CommonModule` (pas de cycle vers `audit` —
 * l'écriture du `JournalAudit` est faite directement via Prisma dans `VerrouService`).
 */
@Module({
  imports: [CommonModule],
  controllers: [VerrousController],
  providers: [VerrouService],
  exports: [VerrouService],
})
export class VerrousModule {}
