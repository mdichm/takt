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
  zSalleCreate,
  zSalleList,
  zSalleParams,
  zSalleUpdate,
  type SalleCreate,
  type SalleListFilters,
  type SalleParams,
  type SalleUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { SalleService } from './salle.service';
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
@Controller('referentiels/salles')
export class SalleController {
  constructor(@Inject(SalleService) private readonly salleService: SalleService) {}

  /** Liste paginée des salles avec filtres multi-critères (GET /api/v1/referentiels/salles). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zSalleList })
  @ApiOperation({ summary: 'Liste paginée des salles' })
  @ApiResponse({ status: 200, description: 'Liste des salles' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as SalleListFilters;
    return this.salleService.list(query);
  }

  /** Récupère une salle par son ID (GET /api/v1/referentiels/salles/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zSalleParams })
  @ApiOperation({ summary: 'Détail d’une salle' })
  @ApiResponse({ status: 200, description: 'Salle trouvée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Salle introuvable' })
  async getOne(@Param() params: SalleParams): Promise<unknown> {
    return this.salleService.getOne(params.id);
  }

  /** Crée une salle (POST /api/v1/referentiels/salles). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zSalleCreate })
  @ApiOperation({ summary: 'Crée une salle' })
  @ApiResponse({ status: 201, description: 'Salle créée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(@Body() corps: SalleCreate, @Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    return this.salleService.create(corps, req.user!.sub);
  }

  /** Met à jour une salle (PATCH /api/v1/referentiels/salles/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zSalleParams, body: zSalleUpdate })
  @ApiOperation({ summary: 'Modifie une salle' })
  @ApiResponse({ status: 200, description: 'Salle modifiée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Salle introuvable' })
  async update(
    @Param() params: SalleParams,
    @Body() corps: SalleUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.salleService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime une salle (DELETE /api/v1/referentiels/salles/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zSalleParams })
  @ApiOperation({ summary: 'Supprime une salle' })
  @ApiResponse({ status: 200, description: 'Salle supprimée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Salle introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (salle utilisée)' })
  async delete(@Param() params: SalleParams, @Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    return this.salleService.delete(params.id, req.user!.sub);
  }
}
