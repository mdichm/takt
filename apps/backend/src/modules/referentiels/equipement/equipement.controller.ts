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
  zEquipementCreate,
  zEquipementList,
  zEquipementParams,
  zEquipementUpdate,
  type EquipementCreate,
  type EquipementListFilters,
  type EquipementParams,
  type EquipementUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { EquipementService } from './equipement.service';
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
@Controller('referentiels/equipements')
export class EquipementController {
  constructor(@Inject(EquipementService) private readonly equipementService: EquipementService) {}

  /** Liste paginée des équipements (GET /api/v1/referentiels/equipements). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zEquipementList })
  @ApiOperation({ summary: 'Liste paginée des équipements' })
  @ApiResponse({ status: 200, description: 'Liste des équipements' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as EquipementListFilters;
    return this.equipementService.list(query);
  }

  /** Récupère un équipement par son ID (GET /api/v1/referentiels/equipements/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zEquipementParams })
  @ApiOperation({ summary: 'Détail d’un équipement' })
  @ApiResponse({ status: 200, description: 'Équipement trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Équipement introuvable' })
  async getOne(@Param() params: EquipementParams): Promise<unknown> {
    return this.equipementService.getOne(params.id);
  }

  /** Crée un équipement (POST /api/v1/referentiels/equipements). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zEquipementCreate })
  @ApiOperation({ summary: 'Crée un équipement' })
  @ApiResponse({ status: 201, description: 'Équipement créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(
    @Body() corps: EquipementCreate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.equipementService.create(corps, req.user!.sub);
  }

  /** Met à jour un équipement (PATCH /api/v1/referentiels/equipements/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zEquipementParams, body: zEquipementUpdate })
  @ApiOperation({ summary: 'Modifie un équipement' })
  @ApiResponse({ status: 200, description: 'Équipement modifié' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Équipement introuvable' })
  async update(
    @Param() params: EquipementParams,
    @Body() corps: EquipementUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.equipementService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime un équipement (DELETE /api/v1/referentiels/equipements/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zEquipementParams })
  @ApiOperation({ summary: 'Supprime un équipement' })
  @ApiResponse({ status: 200, description: 'Équipement supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Équipement introuvable' })
  async delete(
    @Param() params: EquipementParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.equipementService.delete(params.id, req.user!.sub);
  }
}
