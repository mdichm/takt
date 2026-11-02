// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';

/** Module d’écriture et de consultation du journal d’audit. */
@Module({
  imports: [CommonModule],
})
export class AuditModule {}
