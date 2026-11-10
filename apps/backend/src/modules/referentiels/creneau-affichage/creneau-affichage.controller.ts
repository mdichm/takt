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
  zCreneauAffichageCreate,
  zCreneauAffichageList,
  zCreneauAffichageParams,
  zCreneauAffichageUpdate,
  type CreneauAffichageCreate,
  type CreneauAffichageListFilters,
  type CreneauAffichageParams,
  type CreneauAffichageUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { CreneauAffichageService } from './creneau-affichage.service';
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
@Controller('referentiels/creneaux-affichage')
export class CreneauAffichageController {
  constructor(
    @Inject(CreneauAffichageService)
    private readonly creneauAffichageService: CreneauAffichageService,
  ) {}

  /** Liste paginée des variantes d'affichage (GET /api/v1/referentiels/creneaux-affichage). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zCreneauAffichageList })
  @ApiOperation({ summary: 'Liste paginée des variantes d’affichage' })
  @ApiResponse({ status: 200, description: 'Liste des variantes d’affichage' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as CreneauAffichageListFilters;
    return this.creneauAffichageService.list(query);
  }

  /** Récupère une variante d’affichage par son ID (GET /api/v1/referentiels/creneaux-affichage/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zCreneauAffichageParams })
  @ApiOperation({ summary: 'Détail d’une variante d’affichage' })
  @ApiResponse({ status: 200, description: 'Variante d’affichage trouvée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Variante d’affichage introuvable' })
  async getOne(@Param() params: CreneauAffichageParams): Promise<unknown> {
    return this.creneauAffichageService.getOne(params.id);
  }

  /** Crée une variante d’affichage (POST /api/v1/referentiels/creneaux-affichage). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zCreneauAffichageCreate })
  @ApiOperation({ summary: 'Crée une variante d’affichage' })
  @ApiResponse({ status: 201, description: 'Variante d’affichage créée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(
    @Body() corps: CreneauAffichageCreate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.creneauAffichageService.create(corps, req.user!.sub);
  }

  /** Met à jour une variante d’affichage (PATCH /api/v1/referentiels/creneaux-affichage/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zCreneauAffichageParams, body: zCreneauAffichageUpdate })
  @ApiOperation({ summary: 'Modifie une variante d’affichage' })
  @ApiResponse({ status: 200, description: 'Variante d’affichage modifiée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Variante d’affichage introuvable' })
  async update(
    @Param() params: CreneauAffichageParams,
    @Body() corps: CreneauAffichageUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.creneauAffichageService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime une variante d’affichage (DELETE /api/v1/referentiels/creneaux-affichage/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zCreneauAffichageParams })
  @ApiOperation({ summary: 'Supprime une variante d’affichage' })
  @ApiResponse({ status: 200, description: 'Variante d’affichage supprimée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Variante d’affichage introuvable' })
  async delete(
    @Param() params: CreneauAffichageParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.creneauAffichageService.delete(params.id, req.user!.sub);
  }
}
