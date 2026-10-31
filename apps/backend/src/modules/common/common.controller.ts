// ============================================================================
// TAKT — Contrôleur transverse (santé de l'API)
// Fichier : apps/backend/src/modules/common/common.controller.ts
// ============================================================================

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommonService, HealthStatus } from './common.service';

@ApiTags('health')
@Controller('health')
export class CommonController {
  constructor(private readonly commonService: CommonService) {}

  @Get()
  @ApiOperation({ summary: "État de santé de l'API" })
  getHealth(): HealthStatus {
    return this.commonService.getHealth();
  }
}
