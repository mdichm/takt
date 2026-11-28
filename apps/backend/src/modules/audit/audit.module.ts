// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AuditService } from './audit.service';
import { AuditReadService } from './read/audit-read.service';
import { AuditReadController } from './read/audit-read.controller';

/** Module d'ecriture et de consultation du journal d'audit. */
@Module({
  imports: [CommonModule],
  providers: [AuditService, AuditReadService],
  exports: [AuditService, AuditReadService],
  controllers: [AuditReadController],
})
export class AuditModule {}
