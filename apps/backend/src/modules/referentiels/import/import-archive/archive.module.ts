// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { AuditModule } from '../../../audit/audit.module';
import { CommonModule } from '../../../common/common.module';
import { ArchiveImportController } from './archive.controller';
import { ArchiveImportService } from './archive.service';

@Module({
  imports: [CommonModule, AuditModule],
  controllers: [ArchiveImportController],
  providers: [ArchiveImportService],
  exports: [ArchiveImportService],
})
export class ArchiveImportModule {}
