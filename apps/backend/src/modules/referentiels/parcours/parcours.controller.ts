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
  zParcours,
  zParcoursCreate,
  zParcoursList,
  zParcoursParams,
  zParcoursUpdate,
  type ParcoursCreate,
  type ParcoursListFilters,
  type ParcoursParams,
  type ParcoursUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { ParcoursService } from './parcours.service';
import {
  JwtAuthGuard,
  UtilisateurConnecte,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DepartmentScope } from '../../common/decorators/department-scope.decorator';

interface RequeteAvecUtilisateur {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  user?: UtilisateurConnecte;
  departementIds?: string[];
}

@ApiTags('Référentiels')
@ApiBearerAuth()
@Controller('referentiels/parcours')
export class ParcoursController {
  constructor(@Inject(ParcoursService) private readonly parcoursService: ParcoursService) {}

  /** Liste paginée des parcours (GET /api/v1/referentiels/parcours). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zParcoursList })
  @ApiOperation({ summary: 'Liste paginée des parcours' })
  @ApiResponse({ status: 200, description: 'Liste des parcours' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as ParcoursListFilters;
    return this.parcoursService.list(query);
  }

  /** Récupère un parcours par son ID (GET /api/v1/referentiels/parcours/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zParcoursParams })
  @ApiOperation({ summary: 'Détail d’un parcours' })
  @ApiResponse({ status: 200, description: 'Parcours trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Parcours introuvable' })
  async getOne(@Param() params: ParcoursParams): Promise<unknown> {
    return this.parcoursService.getOne(params.id);
  }

  /** Crée un parcours (POST /api/v1/referentiels/parcours). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zParcoursCreate })
  @ApiOperation({ summary: 'Crée un parcours' })
  @ApiResponse({ status: 201, description: 'Parcours créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(
    @Body() corps: ParcoursCreate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.parcoursService.create(corps, req.user!.sub);
  }

  /** Met à jour un parcours (PATCH /api/v1/referentiels/parcours/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zParcoursParams, body: zParcoursUpdate })
  @ApiOperation({ summary: 'Modifie un parcours' })
  @ApiResponse({ status: 200, description: 'Parcours modifié' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Parcours introuvable' })
  async update(
    @Param() params: ParcoursParams,
    @Body() corps: ParcoursUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.parcoursService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime un parcours (DELETE /api/v1/referentiels/parcours/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zParcoursParams })
  @ApiOperation({ summary: 'Supprime un parcours' })
  @ApiResponse({ status: 200, description: 'Parcours supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Parcours introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (niveaux associés)' })
  async delete(
    @Param() params: ParcoursParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.parcoursService.delete(params.id, req.user!.sub);
  }
}