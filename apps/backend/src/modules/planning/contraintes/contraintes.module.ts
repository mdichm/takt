// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { ContraintesController } from './contraintes.controller';
import { ContraintesService } from './contraintes.service';

/**
 * Module des contraintes de génération (TAKT-L09-06).
 *
 * Dépend uniquement de `CommonModule` (Prisma) — pas d'import du module
 * `audit` (règle de dépendance ST_TAKT §1.2, pas de cycle).
 * L'écriture du `JournalAudit` est faite directement via Prisma dans
 * `ContraintesService`, à l'identique de `BailService`.
 */
@Module({
  imports: [CommonModule],
  controllers: [ContraintesController],
  providers: [ContraintesService],
  exports: [ContraintesService],
})
export class ContraintesModule {}
