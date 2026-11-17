// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { zBailIdParams, type BailIdParams } from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { BailService } from './bail.service';
import { JwtAuthGuard, UtilisateurConnecte } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Bail d\'édition - forçage admin')
@ApiBearerAuth()
@Controller('bails')
export class BailForceController {
  constructor(@Inject(BailService) private readonly service: BailService) {}

  /** Force la liberation d'un bail par son identifiant (DELETE /api/v1/bails/:id, admin uniquement). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zBailIdParams })
  @ApiOperation({ summary: 'Forcer la liberation d un bail d edition (admin)' })
  @ApiResponse({ status: 200, description: 'Bail force' })
  @ApiResponse({ status: 401, description: 'Non authentifie' })
  @ApiResponse({ status: 403, description: 'Interdit (reserve a l admin)' })
  @ApiResponse({ status: 404, description: 'Bail introuvable' })
  async forcer(
    @Param() params: BailIdParams,
    @Req() req: { user: UtilisateurConnecte },
  ) {
    return this.service.forcer(params.id, req.user.sub, req.user.role === 'admin');
  }
}
