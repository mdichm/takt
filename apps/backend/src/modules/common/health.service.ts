// ============================================================================
// TAKT — Service de santé de l'API
// Fichier : apps/backend/src/modules/common/health.service.ts
// Ticket : TAKT-L01-03
// ============================================================================

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthStatusDto } from './health-status.dto';

@Injectable()
export class HealthService {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  /**
   * Retourne l'état de santé de l'API.
   * Le contrôle de la base de données sera ajouté au ticket TAKT-L01-04.
   */
  getHealth(): HealthStatusDto {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      version: this.configService.get<string>('APP_VERSION') ?? '1.0.0',
    };
  }
}
