// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { BailController } from './bail.controller';
import { BailForceController } from './bail-force.controller';
import { BailService } from './bail.service';

/**
 * Module du bail d'édition exclusif (TAKT-L06-07).
 *
 * Dépendance : uniquement `CommonModule` (pas de cycle vers `audit` —
 * l'écriture du `JournalAudit` est faite directement via Prisma dans `BailService`).
 */
@Module({
  imports: [CommonModule],
  controllers: [BailController, BailForceController],
  providers: [BailService],
  exports: [BailService],
})
export class BailModule {}
