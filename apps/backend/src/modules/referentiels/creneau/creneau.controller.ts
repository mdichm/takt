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
  zCreneauCreate,
  zCreneauList,
  zCreneauParams,
  zCreneauUpdate,
  type CreneauCreate,
  type CreneauListFilters,
  type CreneauParams,
  type CreneauUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { CreneauService } from './creneau.service';
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
@Controller('referentiels/creneaux')
export class CreneauController {
  constructor(@Inject(CreneauService) private readonly creneauService: CreneauService) {}

  /** Liste paginée des créneaux avec filtres (GET /api/v1/referentiels/creneaux). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zCreneauList })
  @ApiOperation({ summary: 'Liste paginée des créneaux' })
  @ApiResponse({ status: 200, description: 'Liste des créneaux' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as CreneauListFilters;
    return this.creneauService.list(query);
  }

  /** Récupère un créneau par son ID (GET /api/v1/referentiels/creneaux/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zCreneauParams })
  @ApiOperation({ summary: 'Détail d’un créneau' })
  @ApiResponse({ status: 200, description: 'Créneau trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Créneau introuvable' })
  async getOne(@Param() params: CreneauParams): Promise<unknown> {
    return this.creneauService.getOne(params.id);
  }

  /** Crée un créneau (POST /api/v1/referentiels/creneaux). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zCreneauCreate })
  @ApiOperation({ summary: 'Crée un créneau' })
  @ApiResponse({ status: 201, description: 'Créneau créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(@Body() corps: CreneauCreate, @Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    return this.creneauService.create(corps, req.user!.sub);
  }

  /** Met à jour un créneau (PATCH /api/v1/referentiels/creneaux/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zCreneauParams, body: zCreneauUpdate })
  @ApiOperation({ summary: 'Modifie un créneau' })
  @ApiResponse({ status: 200, description: 'Créneau modifié' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Créneau introuvable' })
  async update(
    @Param() params: CreneauParams,
    @Body() corps: CreneauUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.creneauService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime un créneau (DELETE /api/v1/referentiels/creneaux/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zCreneauParams })
  @ApiOperation({ summary: 'Supprime un créneau' })
  @ApiResponse({ status: 200, description: 'Créneau supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Créneau introuvable' })
  async delete(@Param() params: CreneauParams, @Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    return this.creneauService.delete(params.id, req.user!.sub);
  }
}