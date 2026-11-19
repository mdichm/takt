// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { VersionsModule } from '../../versions/versions.module';
import { DerivedFileService } from './derived-file.service';

/**
 * Module de construction du fichier dérivé d'entrée du solveur (TAKT-L07-01).
 *
 * Dépendances : common + versions (amont, pas de cycle).
 * Le worker et le client solveur (TAKT-L07-02) restent hors périmètre.
 */
@Module({
  imports: [CommonModule, VersionsModule],
  providers: [DerivedFileService],
  exports: [DerivedFileService],
})
export class DerivedFileModule {}
