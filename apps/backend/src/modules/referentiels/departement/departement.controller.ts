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
  zDepartementCreate,
  zDepartementList,
  zDepartementParams,
  zDepartementUpdate,
  type DepartementCreate,
  type DepartementListFilters,
  type DepartementParams,
  type DepartementUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { DepartementService } from './departement.service';
import { JwtAuthGuard, UtilisateurConnecte } from '../../common/guards/jwt-auth.guard';
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
@Controller('referentiels/departements')
export class DepartementController {
  constructor(
    @Inject(DepartementService) private readonly departementService: DepartementService,
  ) {}

  /** Liste paginée des départements (GET /api/v1/referentiels/departements). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zDepartementList })
  @ApiOperation({ summary: 'Liste paginée des départements' })
  @ApiResponse({ status: 200, description: 'Liste des départements' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as DepartementListFilters;
    return this.departementService.list(query, req.departementIds ?? []);
  }

  /** Récupère un département par son ID (GET /api/v1/referentiels/departements/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zDepartementParams })
  @ApiOperation({ summary: 'Détail d’un département' })
  @ApiResponse({ status: 200, description: 'Département trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Département introuvable' })
  async getOne(@Param() params: DepartementParams): Promise<unknown> {
    return this.departementService.getOne(params.id);
  }

  /** Crée un département (POST /api/v1/referentiels/departements). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zDepartementCreate })
  @ApiOperation({ summary: 'Crée un département' })
  @ApiResponse({ status: 201, description: 'Département créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(
    @Body() corps: DepartementCreate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.departementService.create(corps, req.user!.sub);
  }

  /** Met à jour un département (PATCH /api/v1/referentiels/departements/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zDepartementParams, body: zDepartementUpdate })
  @ApiOperation({ summary: 'Modifie un département' })
  @ApiResponse({ status: 200, description: 'Département modifié' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Département introuvable' })
  async update(
    @Param() params: DepartementParams,
    @Body() corps: DepartementUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.departementService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime un département (DELETE /api/v1/referentiels/departements/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zDepartementParams })
  @ApiOperation({ summary: 'Supprime un département' })
  @ApiResponse({ status: 200, description: 'Département supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Département introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (parcours/utilisateurs associés)' })
  async delete(
    @Param() params: DepartementParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.departementService.delete(params.id, req.user!.sub);
  }
}
