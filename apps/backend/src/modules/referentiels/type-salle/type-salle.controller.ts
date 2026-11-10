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
  zTypeSalleCreate,
  zTypeSalleList,
  zTypeSalleParams,
  zTypeSalleUpdate,
  type TypeSalleCreate,
  type TypeSalleListFilters,
  type TypeSalleParams,
  type TypeSalleUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { TypeSalleService } from './type-salle.service';
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
@Controller('referentiels/type-salles')
export class TypeSalleController {
  constructor(@Inject(TypeSalleService) private readonly typeSalleService: TypeSalleService) {}

  /** Liste paginée des types de salle (GET /api/v1/referentiels/type-salles). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zTypeSalleList })
  @ApiOperation({ summary: 'Liste paginée des types de salle' })
  @ApiResponse({ status: 200, description: 'Liste des types de salle' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as TypeSalleListFilters;
    return this.typeSalleService.list(query);
  }

  /** Récupère un type de salle par son ID (GET /api/v1/referentiels/type-salles/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zTypeSalleParams })
  @ApiOperation({ summary: 'Détail d’un type de salle' })
  @ApiResponse({ status: 200, description: 'Type de salle trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Type de salle introuvable' })
  async getOne(@Param() params: TypeSalleParams): Promise<unknown> {
    return this.typeSalleService.getOne(params.id);
  }

  /** Crée un type de salle (POST /api/v1/referentiels/type-salles). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zTypeSalleCreate })
  @ApiOperation({ summary: 'Crée un type de salle' })
  @ApiResponse({ status: 201, description: 'Type de salle créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(
    @Body() corps: TypeSalleCreate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.typeSalleService.create(corps, req.user!.sub);
  }

  /** Met à jour un type de salle (PATCH /api/v1/referentiels/type-salles/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zTypeSalleParams, body: zTypeSalleUpdate })
  @ApiOperation({ summary: 'Modifie un type de salle' })
  @ApiResponse({ status: 200, description: 'Type de salle modifié' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Type de salle introuvable' })
  async update(
    @Param() params: TypeSalleParams,
    @Body() corps: TypeSalleUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.typeSalleService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime un type de salle (DELETE /api/v1/referentiels/type-salles/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zTypeSalleParams })
  @ApiOperation({ summary: 'Supprime un type de salle' })
  @ApiResponse({ status: 200, description: 'Type de salle supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Type de salle introuvable' })
  async delete(
    @Param() params: TypeSalleParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.typeSalleService.delete(params.id, req.user!.sub);
  }
}
