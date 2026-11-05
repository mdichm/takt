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
  zEnseignantCreate,
  zEnseignantList,
  zEnseignantParams,
  zEnseignantUpdate,
  type EnseignantCreate,
  type EnseignantListFilters,
  type EnseignantParams,
  type EnseignantUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { EnseignantService } from './enseignant.service';
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
@Controller('referentiels/enseignants')
export class EnseignantController {
  constructor(@Inject(EnseignantService) private readonly enseignantService: EnseignantService) {}

  /** Liste paginée des enseignants (GET /api/v1/referentiels/enseignants). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zEnseignantList })
  @ApiOperation({ summary: 'Liste paginée des enseignants' })
  @ApiResponse({ status: 200, description: 'Liste des enseignants' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as EnseignantListFilters;
    return this.enseignantService.list(query);
  }

  /** Récupère un enseignant par son ID (GET /api/v1/referentiels/enseignants/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zEnseignantParams })
  @ApiOperation({ summary: 'Détail d’un enseignant' })
  @ApiResponse({ status: 200, description: 'Enseignant trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Enseignant introuvable' })
  async getOne(@Param() params: EnseignantParams): Promise<unknown> {
    return this.enseignantService.getOne(params.id);
  }

  /** Crée un enseignant (POST /api/v1/referentiels/enseignants). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zEnseignantCreate })
  @ApiOperation({ summary: 'Crée un enseignant' })
  @ApiResponse({ status: 201, description: 'Enseignant créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(@Body() corps: EnseignantCreate, @Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    return this.enseignantService.create(corps, req.user!.sub);
  }

  /** Met à jour un enseignant (PATCH /api/v1/referentiels/enseignants/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zEnseignantParams, body: zEnseignantUpdate })
  @ApiOperation({ summary: 'Modifie un enseignant' })
  @ApiResponse({ status: 200, description: 'Enseignant modifié' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Enseignant introuvable' })
  async update(
    @Param() params: EnseignantParams,
    @Body() corps: EnseignantUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.enseignantService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime un enseignant (DELETE /api/v1/referentiels/enseignants/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zEnseignantParams })
  @ApiOperation({ summary: 'Supprime un enseignant' })
  @ApiResponse({ status: 200, description: 'Enseignant supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Enseignant introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (lié à des départements)' })
  async delete(
    @Param() params: EnseignantParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.enseignantService.delete(params.id, req.user!.sub);
  }
}