// ============================================================================
// TAKT — Service « common » transverse (santé de l'API)
// Fichier : apps/backend/src/modules/common/common.service.ts
// ============================================================================

import { Injectable } from '@nestjs/common';

/** Instantané de l'état de l'API. */
export interface HealthStatus {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

@Injectable()
export class CommonService {
  /**
   * Retourne l'état de santé de l'API.
   * Le contrôle de la base de données sera ajouté au ticket TAKT-L01-03.
   */
  getHealth(): HealthStatus {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
