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
  zModuleCreate,
  zModuleList,
  zModuleParams,
  zModuleUpdate,
  type ModuleCreate,
  type ModuleListFilters,
  type ModuleParams,
  type ModuleUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { ModuleService } from './module.service';
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
@Controller('referentiels/modules')
export class ModuleController {
  constructor(@Inject(ModuleService) private readonly moduleService: ModuleService) {}

  /** Liste paginée des modules (GET /api/v1/referentiels/modules). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zModuleList })
  @ApiOperation({ summary: 'Liste paginée des modules' })
  @ApiResponse({ status: 200, description: 'Liste des modules' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as ModuleListFilters;
    return this.moduleService.list(query);
  }

  /** Récupère un module par son ID (GET /api/v1/referentiels/modules/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zModuleParams })
  @ApiOperation({ summary: 'Détail d’un module' })
  @ApiResponse({ status: 200, description: 'Module trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Module introuvable' })
  async getOne(@Param() params: ModuleParams): Promise<unknown> {
    return this.moduleService.getOne(params.id);
  }

  /** Crée un module (POST /api/v1/referentiels/modules). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zModuleCreate })
  @ApiOperation({ summary: 'Crée un module' })
  @ApiResponse({ status: 201, description: 'Module créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(@Body() corps: ModuleCreate, @Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    return this.moduleService.create(corps, req.user!.sub);
  }

  /** Met à jour un module (PATCH /api/v1/referentiels/modules/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zModuleParams, body: zModuleUpdate })
  @ApiOperation({ summary: 'Modifie un module' })
  @ApiResponse({ status: 200, description: 'Module modifié' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Module introuvable' })
  async update(
    @Param() params: ModuleParams,
    @Body() corps: ModuleUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.moduleService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime un module (DELETE /api/v1/referentiels/modules/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zModuleParams })
  @ApiOperation({ summary: 'Supprime un module' })
  @ApiResponse({ status: 200, description: 'Module supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Module introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (utilisé par une matière)' })
  async delete(
    @Param() params: ModuleParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.moduleService.delete(params.id, req.user!.sub);
  }
}