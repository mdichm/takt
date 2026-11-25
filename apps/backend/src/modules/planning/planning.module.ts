// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ReferentielsModule } from '../referentiels/referentiels.module';
import { VersionsModule } from '../versions/versions.module';
import { SeancesModule } from './seances/seances.module';
import { ConflictModule } from './conflict/conflict.module';
import { BailModule } from './bail/bail.module';
import { VerrousModule } from './verrous/verrous.module';
import { CouvertureModule } from './couverture/couverture.module';
import { ContraintesModule } from './contraintes/contraintes.module';


/** Module des séances, contraintes, verrous, baux d'édition, conflits et couverture de planning. */
@Module({
  imports: [
    CommonModule,
    ReferentielsModule,
    VersionsModule,
    SeancesModule,
    ConflictModule,
    BailModule,
    VerrousModule,
    CouvertureModule,
    ContraintesModule,
  ],
  exports: [],
})
export class PlanningModule {}
