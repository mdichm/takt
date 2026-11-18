// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { AuditModule } from '../../audit/audit.module';
import { CommonModule } from '../../common/common.module';
import { SnapshotService } from './snapshot.service';

/**
 * Module de création de snapshots de version (TAKT-L06-10).
 *
 * Dépendances : common + audit uniquement (règle d'architecture : pas de cycles).
 */
@Module({
  imports: [CommonModule, AuditModule],
  providers: [SnapshotService],
  exports: [SnapshotService],
})
export class SnapshotModule {}
