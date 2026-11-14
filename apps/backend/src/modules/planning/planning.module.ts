// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ReferentielsModule } from '../referentiels/referentiels.module';
import { VersionsModule } from '../versions/versions.module';
import { SeancesModule } from './seances/seances.module';

/** Module des séances, contraintes, verrous et conflits de planning. */
@Module({
  imports: [CommonModule, ReferentielsModule, VersionsModule, SeancesModule],
})
export class PlanningModule {}
