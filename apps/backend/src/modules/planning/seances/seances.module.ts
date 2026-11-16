// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { ConflictModule } from '../conflict/conflict.module';
import { SeancesController } from './seances.controller';
import { SeancesService } from './seances.service';

@Module({
  imports: [CommonModule, ConflictModule],
  controllers: [SeancesController],
  providers: [SeancesService],
  exports: [SeancesService],
})
export class SeancesModule {}