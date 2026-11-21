// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { ReferentielsModule } from '../../referentiels/referentiels.module';
import { PreconditionsController } from './preconditions.controller';
import { PreconditionsService } from './preconditions.service';

/**
 * Module des préconditions de génération (TAKT-L07-07).
 *
 * Dépend de `common` (Prisma) et `referentiels` (ConfigSysteme) uniquement.
 * Le jeton `GARDE_COUVERTURE` est fourni globalement par `CouvertureModule`
 * (@Global), déjà importé dans l'arbre via `PlanningModule` → aucun cycle
 * generation → planning.
 */
@Module({
  imports: [CommonModule, ReferentielsModule],
  providers: [PreconditionsService],
  controllers: [PreconditionsController],
  exports: [PreconditionsService],
})
export class PreconditionsModule {}
