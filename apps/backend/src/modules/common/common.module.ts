// ============================================================================
// TAKT — Module transverse « common »
// Fichier : apps/backend/src/modules/common/common.module.ts
// ============================================================================

import { Module } from '@nestjs/common';
import { CommonController } from './common.controller';
import { CommonService } from './common.service';

@Module({
  controllers: [CommonController],
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
