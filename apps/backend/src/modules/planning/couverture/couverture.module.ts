// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Global, Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { GARDE_COUVERTURE } from '../../common/di/garde-couverture.token';
import { CouvertureController } from './couverture.controller';
import { CouvertureService } from './couverture.service';

/**
 * Module de couverture pédagogique (TAKT-L06-09).
 *
 * Déclaré `@Global()` afin que le jeton `GARDE_COUVERTURE` (lié à
 * `CouvertureService`) soit injectable par le module `versions` sans que ce
 * dernier n'ait à importer `planning` (respect de la matrice de dépendances,
 * pas de cycle).
 *
 * Dépend uniquement de `common`.
 */
@Global()
@Module({
  imports: [CommonModule],
  controllers: [CouvertureController],
  providers: [
    CouvertureService,
    {
      provide: GARDE_COUVERTURE,
      useExisting: CouvertureService,
    },
  ],
  exports: [CouvertureService, GARDE_COUVERTURE],
})
export class CouvertureModule {}