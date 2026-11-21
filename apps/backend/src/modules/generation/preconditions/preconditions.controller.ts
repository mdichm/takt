// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PreconditionsService } from './preconditions.service';
import type { ResultatPreconditions } from '@takt/contracts';
import { zPreconditionsParams } from '@takt/contracts';

/**
 * Préconditions de lancement de génération (TAKT-L07-07).
 *
 * Endpoint lecture seule consulté par l'UI avant de confirmer le lancement
 * d'une génération. Retourne `{ data, error, meta }` conformément à
 * ST_TAKT §3.3.
 *
 * Dépend uniquement de `common` et du service interne de préconditions.
 */
@ApiTags('génération — préconditions')
@Controller('generations/preconditions')
export class PreconditionsController {
  constructor(
    private readonly preconditionsService: PreconditionsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @ApiOperation({
    summary: 'Vérifie les préconditions de lancement de génération',
    description:
      'Contrôle les 5 garde-fous (état version, départements validés, verrous, couverture, taux de verrouillage) avant création du job pg-boss.',
  })
  @ApiResponse({
    status: 200,
    description: 'Résultat des préconditions',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Version introuvable',
  })
  @ZodValidation({ query: zPreconditionsParams })
  async preconditions(
    @Query() query: unknown,
  ): Promise<{
    data: ResultatPreconditions;
    error: null;
    meta: { timestamp: string };
  }> {
    const { versionId } = zPreconditionsParams.parse(query);
    const resultat = await this.preconditionsService.checkGenerationPreconditions(
      versionId,
    );

    return {
      data: resultat as unknown as ResultatPreconditions,
      error: null,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
