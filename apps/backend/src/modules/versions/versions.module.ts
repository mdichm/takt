// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CommonModule } from '../common/common.module';
import { ReferentielsModule } from '../referentiels/referentiels.module';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';

/** Module du cycle de vie des versions de planning. */
@Module({
  imports: [CommonModule, ReferentielsModule, AuditModule],
  controllers: [VersionsController],
  providers: [VersionsService],
  exports: [VersionsService],
})
export class VersionsModule {}
