// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard, UtilisateurConnecte } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import {
  zScenarioSelectRequest,
  type ScenarioSelectReponse,
} from '@takt/contracts';
import { SelectionService } from './selection.service';

interface RequeteAvecUtilisateur {
  user?: UtilisateurConnecte;
}

/**
 * Contrôleur de sélection de scénario (TAKT-L07-06).
 *
 * Endpoint : `POST /api/v1/generations/:id/select`
 * — Adopte un scénario, crée les séances, passe la version en `edition`,
 *   écrit l'audit `ADOPTION_SCENARIO`.
 *
 * Toutes les réponses suivent l'enveloppe `{ data, error, meta }` appliquée
 * par l'intercepteur global (ST_TAKT §3.3).
 */
@ApiTags('sélection')
@Controller('generations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SelectionController {
  constructor(private readonly selectionService: SelectionService) {}

  /**
   * Sélectionne un scénario (POST /api/v1/generations/:id/select).
   */
  @Post(':id/select')
  @Roles('gest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adopte un scénario et passe la version en édition' })
  @ApiResponse({ status: 200, description: 'Scénario adopté' })
  @ApiResponse({ status: 400, description: 'Placements invalides' })
  @ApiResponse({ status: 404, description: 'Génération ou scénario introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (déjà adopté, génération non terminée, version pas en génération)' })
  @ZodValidation({ body: zScenarioSelectRequest })
  async selectionnerScenario(
    @Param('id') id: string,
    @Body() corps: unknown,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<{ data: ScenarioSelectReponse; error: null; meta: { timestamp: string } }> {
    const utilisateurId = req.user?.sub;
    if (!utilisateurId) {
      throw new Error('Utilisateur non authentifié');
    }

    const { scenarioId } = corps as { scenarioId: string };
    const resultat = await this.selectionService.selectionnerScenario(
      id,
      scenarioId,
      utilisateurId,
    );

    return {
      data: resultat,
      error: null,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}