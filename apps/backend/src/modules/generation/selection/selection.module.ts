// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { AuditModule } from '../../audit/audit.module';
import { SelectionService } from './selection.service';
import { SelectionController } from './selection.controller';

/** Module de sélection manuelle de scénario (TAKT-L07-06). */
@Module({
  imports: [CommonModule, AuditModule],
  providers: [SelectionService],
  controllers: [SelectionController],
  exports: [SelectionService],
})
export class SelectionModule {}