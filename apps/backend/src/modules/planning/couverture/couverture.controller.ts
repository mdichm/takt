// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Controller,
  Get,
  Inject,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { zUuid } from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CouvertureService } from './couverture.service';

const ROLES_LECTURE = ['admin', 'gest', 'rdep', 'dir'] as const;

const zCouvertureParams = z.object({
  id: zUuid,
});

/**
 * Lecture de la couverture pédagogique d'une version.
 *
 * Endpoint : GET /api/v1/versions/:id/couverture
 */
@ApiTags('Couverture')
@ApiBearerAuth()
@Controller('versions')
export class CouvertureController {
  constructor(
    @Inject(CouvertureService) private readonly service: CouvertureService,
  ) {}

  /**
   * Retourne le détail de couverture pédagogique d'une version
   * (par affectation, par département, taux global, conformité).
   *
   * Utilisé par l'UI pour afficher le taux de couverture avant soumission.
   */
  @Get(':id/couverture')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_LECTURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({
    params: zCouvertureParams,
  })
  @ApiOperation({ summary: "Couverture pédagogique d'une version" })
  @ApiResponse({ status: 200, description: 'Détail de couverture' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Version introuvable' })
  async couverture(@Param('id') id: string) {
    return this.service.calculerCouverture(id);
  }
}