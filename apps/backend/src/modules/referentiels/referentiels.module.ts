// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';

/** Module des données de référence de l’établissement. */
@Module({
  imports: [CommonModule],
})
export class ReferentielsModule {}
