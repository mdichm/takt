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
  zGroupe,
  zGroupeCreate,
  zGroupeList,
  zGroupeParams,
  zGroupeUpdate,
  type GroupeCreate,
  type GroupeListFilters,
  type GroupeParams,
  type GroupeUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { GroupeService } from './groupe.service';
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
@Controller('referentiels/groupes')
export class GroupeController {
  constructor(@Inject(GroupeService) private readonly groupeService: GroupeService) {}

  /** Liste paginée des groupes (GET /api/v1/referentiels/groupes). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zGroupeList })
  @ApiOperation({ summary: 'Liste paginée des groupes' })
  @ApiResponse({ status: 200, description: 'Liste des groupes' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as GroupeListFilters;
    return this.groupeService.list(query, req.departementIds ?? []);
  }

  /** Récupère un groupe par son ID (GET /api/v1/referentiels/groupes/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zGroupeParams })
  @ApiOperation({ summary: 'Détail d’un groupe' })
  @ApiResponse({ status: 200, description: 'Groupe trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Groupe introuvable' })
  async getOne(@Param() params: GroupeParams): Promise<unknown> {
    return this.groupeService.getOne(params.id);
  }

  /** Crée un groupe (POST /api/v1/referentiels/groupes). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zGroupeCreate })
  @ApiOperation({ summary: 'Crée un groupe' })
  @ApiResponse({ status: 201, description: 'Groupe créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(
    @Body() corps: GroupeCreate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.groupeService.create(corps, req.user!.sub);
  }

  /** Met à jour un groupe (PATCH /api/v1/referentiels/groupes/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zGroupeParams, body: zGroupeUpdate })
  @ApiOperation({ summary: 'Modifie un groupe' })
  @ApiResponse({ status: 200, description: 'Groupe modifié' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Groupe introuvable' })
  async update(
    @Param() params: GroupeParams,
    @Body() corps: GroupeUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.groupeService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime un groupe (DELETE /api/v1/referentiels/groupes/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zGroupeParams })
  @ApiOperation({ summary: 'Supprime un groupe' })
  @ApiResponse({ status: 200, description: 'Groupe supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Groupe introuvable' })
  async delete(
    @Param() params: GroupeParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.groupeService.delete(params.id, req.user!.sub);
  }
}