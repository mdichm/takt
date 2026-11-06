// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  zSiteCreate,
  zSiteList,
  zSiteParams,
  zSiteUpdate,
  type SiteCreate,
  type SiteListFilters,
  type SiteParams,
  type SiteUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { SiteService } from './site.service';
import { JwtAuthGuard, UtilisateurConnecte } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

interface RequeteAvecUtilisateur {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  user?: UtilisateurConnecte;
}

@ApiTags('Référentiels')
@ApiBearerAuth()
@Controller('referentiels/sites')
export class SiteController {
  constructor(@Inject(SiteService) private readonly siteService: SiteService) {}

  /** Liste paginée des sites (GET /api/v1/referentiels/sites). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zSiteList })
  @ApiOperation({ summary: 'Liste paginée des sites' })
  @ApiResponse({ status: 200, description: 'Liste des sites' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as SiteListFilters;
    return this.siteService.list(query);
  }

  /** Récupère un site par son ID (GET /api/v1/referentiels/sites/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zSiteParams })
  @ApiOperation({ summary: 'Détail d’un site' })
  @ApiResponse({ status: 200, description: 'Site trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Site introuvable' })
  async getOne(@Param() params: SiteParams): Promise<unknown> {
    return this.siteService.getOne(params.id);
  }

  /** Crée un site (POST /api/v1/referentiels/sites). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zSiteCreate })
  @ApiOperation({ summary: 'Crée un site' })
  @ApiResponse({ status: 201, description: 'Site créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(@Body() corps: SiteCreate, @Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    return this.siteService.create(corps, req.user!.sub);
  }

  /** Met à jour un site (PATCH /api/v1/referentiels/sites/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zSiteParams, body: zSiteUpdate })
  @ApiOperation({ summary: 'Modifie un site' })
  @ApiResponse({ status: 200, description: 'Site modifié' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Site introuvable' })
  async update(
    @Param() params: SiteParams,
    @Body() corps: SiteUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.siteService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime un site (DELETE /api/v1/referentiels/sites/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zSiteParams })
  @ApiOperation({ summary: 'Supprime un site' })
  @ApiResponse({ status: 200, description: 'Site supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Site introuvable' })
  async delete(@Param() params: SiteParams, @Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    return this.siteService.delete(params.id, req.user!.sub);
  }
}