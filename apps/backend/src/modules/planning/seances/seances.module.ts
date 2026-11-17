// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { ConflictModule } from '../conflict/conflict.module';
import { BailModule } from '../bail/bail.module';
import { SeancesController } from './seances.controller';
import { SeancesService } from './seances.service';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';

@Module({
  imports: [CommonModule, ConflictModule, BailModule],
  controllers: [SeancesController, SimulationController],
  providers: [SeancesService, SimulationService],
  exports: [SeancesService, SimulationService],
})
export class SeancesModule {}