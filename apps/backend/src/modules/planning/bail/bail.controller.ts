// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { zBailVersionParams, type BailVersionParams } from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { BailService } from './bail.service';
import { JwtAuthGuard, UtilisateurConnecte } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

const ROUTES_BAIL = ['admin', 'gest', 'rdep', 'dir'] as const;

@ApiTags('Bail d\'édition')
@ApiBearerAuth()
@Controller('versions')
export class BailController {
  constructor(@Inject(BailService) private readonly service: BailService) {}

  /** Acquisition du bail d'édition sur une version (POST /api/v1/versions/:id/bail). */
  @Post(':id/bail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROUTES_BAIL)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zBailVersionParams })
  @ApiOperation({ summary: 'Acquerir le bail d edition sur une version' })
  @ApiResponse({ status: 200, description: 'Bail acquis' })
  @ApiResponse({ status: 401, description: 'Non authentifie' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Version introuvable' })
  @ApiResponse({ status: 423, description: 'Version verrouillee par un autre utilisateur' })
  async acquerir(
    @Param() params: BailVersionParams,
    @Req() req: { user: UtilisateurConnecte },
  ) {
    return this.service.acquerir(params.id, req.user.sub);
  }

  /** Renouvellement du bail d'édition (POST /api/v1/versions/:id/bail/renouveler). */
  @Post(':id/bail/renouveler')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROUTES_BAIL)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zBailVersionParams })
  @ApiOperation({ summary: 'Renouveler le bail d edition sur une version' })
  @ApiResponse({ status: 200, description: 'Bail renouvele' })
  @ApiResponse({ status: 401, description: 'Non authentifie' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Aucun bail actif' })
  async renouveler(
    @Param() params: BailVersionParams,
    @Req() req: { user: UtilisateurConnecte },
  ) {
    return this.service.renouveler(params.id, req.user.sub);
  }

  /** Liberation du bail d'edition par le detenteur (DELETE /api/v1/versions/:id/bail). */
  @Delete(':id/bail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROUTES_BAIL)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zBailVersionParams })
  @ApiOperation({ summary: 'Liberer le bail d edition sur une version' })
  @ApiResponse({ status: 200, description: 'Bail libere' })
  @ApiResponse({ status: 401, description: 'Non authentifie' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Aucun bail actif' })
  async liberer(
    @Param() params: BailVersionParams,
    @Req() req: { user: UtilisateurConnecte },
  ) {
    return this.service.liberer(params.id, req.user.sub);
  }
}
