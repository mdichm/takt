// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  UtilisateurConnecte,
} from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EtablissementService } from './etablissement/etablissement.service';

interface RequeteAvecUtilisateur {
  headers: Record<string, string | string[] | undefined>;
  user?: UtilisateurConnecte;
}

/**
 * Contrôleur de l'arbre hiérarchique des référentiels.
 *
 * Fournit l'agrégation complète : Établissement → Département → Parcours → Niveau → Groupe.
 * Lecture autorisée à tous les rôles authentifiés.
 */
@ApiTags('Référentiels')
@ApiBearerAuth()
@Controller('referentiels/arbre')
export class ArbreController {
  constructor(
    @Inject(EtablissementService)
    private readonly etablissementService: EtablissementService,
  ) {}

  /** Hiérarchie complète des référentiels (GET /api/v1/referentiels/arbre). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hiérarchie complète des référentiels' })
  @ApiResponse({ status: 200, description: 'Arbre des référentiels' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async arbre(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const etablissements = await this.etablissementService.arbre();
    return etablissements;
  }
}