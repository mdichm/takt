// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ReferentielsModule } from '../referentiels/referentiels.module';

/** Module du cycle de vie des versions de planning. */
@Module({
  imports: [CommonModule, ReferentielsModule],
})
export class VersionsModule {}
