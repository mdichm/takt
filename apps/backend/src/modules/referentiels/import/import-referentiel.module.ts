// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { AuditModule } from '../../audit/audit.module';
import { CommonModule } from '../../common/common.module';
import { ImportReferentielController } from './import-referentiel.controller';
import { ImportReferentielService } from './import-referentiel.service';

@Module({
  imports: [CommonModule, AuditModule],
  controllers: [ImportReferentielController],
  providers: [ImportReferentielService],
  exports: [ImportReferentielService],
})
export class ImportReferentielModule {}
