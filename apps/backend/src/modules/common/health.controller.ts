// ============================================================================
// TAKT — Contrôleur de santé de l'API
// Fichier : apps/backend/src/modules/common/health.controller.ts
// Ticket : TAKT-L01-03
//
// La route `/health` est un endpoint opérationnel : elle reste hors du
// préfixe `/api/v1` et renvoie un corps simple, non enveloppé.
// ============================================================================

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthStatusDto } from './health-status.dto';
import { RawResponse } from './http/raw-response.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @RawResponse()
  @ApiOperation({ summary: "État de santé de l'API" })
  @ApiResponse({ status: 200, description: "L'API est opérationnelle", type: HealthStatusDto })
  getHealth(): HealthStatusDto {
    return this.healthService.getHealth();
  }
}
