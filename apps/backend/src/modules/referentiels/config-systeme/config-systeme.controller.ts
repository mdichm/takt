// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { zConfigSystemeUpdate, type ConfigSystemeUpdate } from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { ConfigSystemeService } from './config-systeme.service';
import { JwtAuthGuard, UtilisateurConnecte } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

interface RequeteAvecUtilisateur {
  headers: Record<string, string | string[] | undefined>;
  user?: UtilisateurConnecte;
}

@ApiTags('Référentiels')
@ApiBearerAuth()
@Controller('referentiels/config-systeme')
export class ConfigSystemeController {
  constructor(
    @Inject(ConfigSystemeService) private readonly configSystemeService: ConfigSystemeService,
  ) {}

  /** Récupère (ou crée) la configuration système singleton (GET /api/v1/referentiels/config-systeme). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configuration système (singleton)' })
  @ApiResponse({ status: 200, description: 'Configuration système' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async getOrCreate(): Promise<unknown> {
    return this.configSystemeService.getOrCreate();
  }

  /** Met à jour la configuration système (PATCH /api/v1/referentiels/config-systeme). */
  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ body: zConfigSystemeUpdate })
  @ApiOperation({ summary: 'Modifie la configuration système' })
  @ApiResponse({ status: 200, description: 'Configuration système modifiée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Configuration système introuvable' })
  async update(
    @Body() corps: ConfigSystemeUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.configSystemeService.update(corps, req.user!.sub);
  }
}
