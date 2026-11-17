// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  zSeanceParams,
  zSimulationRequete,
  type SimulationRequete,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { SimulationService } from './simulation.service';
import { JwtAuthGuard, UtilisateurConnecte } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

const ROLES_SIMULATION = ['admin', 'gest'] as const;

interface RequeteAvecUtilisateur {
  user?: UtilisateurConnecte;
}

@ApiTags('Simulation')
@ApiBearerAuth()
@Controller('seances')
export class SimulationController {
  constructor(
    @Inject(SimulationService)
    private readonly service: SimulationService,
  ) {}

  /**
   * Simule des alternatives de placement pour une séance (POST /api/v1/seances/:id/simuler).
   * Zéro écriture : lecture seule, aucun audit, aucune génération.
   */
  @Post(':id/simuler')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_SIMULATION)
  @HttpCode(200)
  @ZodValidation({ params: zSeanceParams, body: zSimulationRequete })
  @ApiOperation({ summary: 'Simule des alternatives de placement pour une séance' })
  @ApiResponse({ status: 200, description: 'Alternatives classées' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Séance introuvable' })
  @ApiResponse({ status: 409, description: 'Version non modifiable' })
  async simuler(
    @Param() params: { id: string },
    @Body() body: SimulationRequete,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<{ alternatives: unknown[] }> {
    const utilisateurId = req.user?.sub ?? 'inconnu';

    const alternatives = await this.service.simuler(params.id, body, utilisateurId);

    return { alternatives };
  }
}
