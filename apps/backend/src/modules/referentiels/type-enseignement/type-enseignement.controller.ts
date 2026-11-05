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
  zTypeEnseignementCreate,
  zTypeEnseignementList,
  zTypeEnseignementParams,
  zTypeEnseignementUpdate,
  type TypeEnseignementCreate,
  type TypeEnseignementListFilters,
  type TypeEnseignementParams,
  type TypeEnseignementUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { TypeEnseignementService } from './type-enseignement.service';
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
@Controller('referentiels/type-enseignements')
export class TypeEnseignementController {
  constructor(
    @Inject(TypeEnseignementService)
    private readonly typeEnseignementService: TypeEnseignementService,
  ) {}

  /** Liste paginée des types d’enseignement (GET /api/v1/referentiels/type-enseignements). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zTypeEnseignementList })
  @ApiOperation({ summary: 'Liste paginée des types d’enseignement' })
  @ApiResponse({ status: 200, description: 'Liste des types d’enseignement' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as TypeEnseignementListFilters;
    return this.typeEnseignementService.list(query);
  }

  /** Récupère un type d’enseignement par son ID (GET /api/v1/referentiels/type-enseignements/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zTypeEnseignementParams })
  @ApiOperation({ summary: 'Détail d’un type d’enseignement' })
  @ApiResponse({ status: 200, description: 'Type d’enseignement trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Type d’enseignement introuvable' })
  async getOne(@Param() params: TypeEnseignementParams): Promise<unknown> {
    return this.typeEnseignementService.getOne(params.id);
  }

  /** Crée un type d’enseignement (POST /api/v1/referentiels/type-enseignements). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zTypeEnseignementCreate })
  @ApiOperation({ summary: 'Crée un type d’enseignement' })
  @ApiResponse({ status: 201, description: 'Type d’enseignement créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(
    @Body() corps: TypeEnseignementCreate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.typeEnseignementService.create(corps, req.user!.sub);
  }

  /** Met à jour un type d’enseignement (PATCH /api/v1/referentiels/type-enseignements/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zTypeEnseignementParams, body: zTypeEnseignementUpdate })
  @ApiOperation({ summary: 'Modifie un type d’enseignement' })
  @ApiResponse({ status: 200, description: 'Type d’enseignement modifié' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Type d’enseignement introuvable' })
  async update(
    @Param() params: TypeEnseignementParams,
    @Body() corps: TypeEnseignementUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.typeEnseignementService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime un type d’enseignement (DELETE /api/v1/referentiels/type-enseignements/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zTypeEnseignementParams })
  @ApiOperation({ summary: 'Supprime un type d’enseignement' })
  @ApiResponse({ status: 200, description: 'Type d’enseignement supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Type d’enseignement introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (utilisé par un module)' })
  async delete(
    @Param() params: TypeEnseignementParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.typeEnseignementService.delete(params.id, req.user!.sub);
  }
}