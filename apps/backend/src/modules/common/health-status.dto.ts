// ============================================================================
// TAKT — DTO de l'état de santé de l'API
// Fichier : apps/backend/src/modules/common/health-status.dto.ts
// Ticket : TAKT-L01-03
// ============================================================================

import { ApiProperty } from '@nestjs/swagger';

/** Corps de la réponse `GET /health` (ST_TAKT §3.1). */
export class HealthStatusDto {
  @ApiProperty({ description: "État de l'API", example: 'ok' })
  status!: 'ok';

  @ApiProperty({ description: 'Durée de fonctionnement en secondes', example: 1234 })
  uptime!: number;

  @ApiProperty({ description: 'Version de l’API', example: '1.0.0' })
  version!: string;
}
