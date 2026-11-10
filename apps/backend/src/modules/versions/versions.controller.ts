// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  zVersion,
  zVersionList,
  zVersionParams,
  type VersionInput,
  type VersionListFilters,
  type VersionParams,
} from '@takt/contracts';
import { ZodValidation } from '../common/pipes/zod-validation.decorator';
import { VersionsService } from './versions.service';
import { JwtAuthGuard, UtilisateurConnecte } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DepartmentScopeGuard } from '../common/guards/department-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DepartmentScope } from '../common/decorators/department-scope.decorator';

interface RequeteAvecUtilisateur {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  user?: UtilisateurConnecte;
}

@ApiTags('Versions')
@ApiBearerAuth()
@Controller('versions')
export class VersionsController {
  constructor(@Inject(VersionsService) private readonly versionsService: VersionsService) {}

  /** Liste paginée des versions (GET /api/v1/versions). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zVersionList })
  @ApiOperation({ summary: 'Liste paginée des versions de planning' })
  @ApiResponse({ status: 200, description: 'Liste des versions' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as VersionListFilters;
    return this.versionsService.lister(query);
  }

  /** Récupère une version par son ID (GET /api/v1/versions/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zVersionParams })
  @ApiOperation({ summary: 'Détail d’une version' })
  @ApiResponse({ status: 200, description: 'Version trouvée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Version introuvable' })
  async getOne(@Param() params: VersionParams): Promise<unknown> {
    return this.versionsService.obtenir(params);
  }

  /** Crée une version (POST /api/v1/versions). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zVersion })
  @ApiOperation({ summary: 'Crée une version de planning' })
  @ApiResponse({ status: 201, description: 'Version créée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 409, description: 'Conflit (version publiée déjà existante)' })
  async create(
    @Body() corps: VersionInput,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.versionsService.creer(corps, req.user!.sub);
  }

  /** Duplique une version archivée (POST /api/v1/versions/:id/dupliquer). */
  @Post(':id/dupliquer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ params: zVersionParams })
  @ApiOperation({ summary: 'Duplique une version archivee' })
  @ApiResponse({ status: 201, description: 'Version dupliquee' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Version introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (source non archivee ou publiee deja existante)' })
  async dupliquer(
    @Param() params: VersionParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.versionsService.dupliquer(params.id, req.user!.sub);
  }
}