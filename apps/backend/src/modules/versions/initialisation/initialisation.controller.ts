// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  zInitialisationInput,
  type InitialisationInput,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { InitialisationService } from './initialisation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

interface RequeteAvecUtilisateur {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  user?: { sub: string; role: string };
}

@ApiTags('Initialisation')
@ApiBearerAuth()
@Controller('versions/initialisation')
export class InitialisationController {
  constructor(
    @Inject(InitialisationService) private readonly initialisationService: InitialisationService,
  ) {}

  /** Crée une année universitaire, un semestre et une version initiale (POST /api/v1/versions/initialisation). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zInitialisationInput })
  @ApiOperation({ summary: 'Initialise une année, un semestre et une version initiale' })
  @ApiResponse({ status: 201, description: 'Version initiale créée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 409, description: 'Conflit (version non archivée déjà existante)' })
  async initialiser(
    @Body() corps: InitialisationInput,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.initialisationService.initialiser(corps, req.user!.sub);
  }

  /** Liste paginée des années universitaires avec leurs semestres et état de version (GET /api/v1/versions/annees-universitaires). */
  @Get('annees-universitaires')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liste paginée des années universitaires avec semestres et état de version' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page (défaut 1)' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Taille de page (défaut 20)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Recherche textuelle sur le libellé' })
  @ApiResponse({ status: 200, description: 'Liste des années universitaires' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async listerAnneesUniversitaires(
    @Query() query: { page?: string; pageSize?: string; search?: string },
  ): Promise<unknown> {
    const page = parseInt(query.page ?? '1', 10) || 1;
    const pageSize = parseInt(query.pageSize ?? '20', 10) || 20;
    return this.initialisationService.listerAnneesUniversitaires({ page, pageSize, search: query.search });
  }
}