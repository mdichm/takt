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
  zNiveauCreate,
  zNiveauList,
  zNiveauParams,
  zNiveauUpdate,
  type NiveauCreate,
  type NiveauListFilters,
  type NiveauParams,
  type NiveauUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { NiveauService } from './niveau.service';
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
@Controller('referentiels/niveaux')
export class NiveauController {
  constructor(@Inject(NiveauService) private readonly niveauService: NiveauService) {}

  /** Liste paginée des niveaux (GET /api/v1/referentiels/niveaux). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zNiveauList })
  @ApiOperation({ summary: 'Liste paginée des niveaux' })
  @ApiResponse({ status: 200, description: 'Liste des niveaux' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as NiveauListFilters;
    return this.niveauService.list(query);
  }

  /** Récupère un niveau par son ID (GET /api/v1/referentiels/niveaux/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zNiveauParams })
  @ApiOperation({ summary: 'Détail d’un niveau' })
  @ApiResponse({ status: 200, description: 'Niveau trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Niveau introuvable' })
  async getOne(@Param() params: NiveauParams): Promise<unknown> {
    return this.niveauService.getOne(params.id);
  }

  /** Crée un niveau (POST /api/v1/referentiels/niveaux). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zNiveauCreate })
  @ApiOperation({ summary: 'Crée un niveau' })
  @ApiResponse({ status: 201, description: 'Niveau créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(
    @Body() corps: NiveauCreate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.niveauService.create(corps, req.user!.sub);
  }

  /** Met à jour un niveau (PATCH /api/v1/referentiels/niveaux/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zNiveauParams, body: zNiveauUpdate })
  @ApiOperation({ summary: 'Modifie un niveau' })
  @ApiResponse({ status: 200, description: 'Niveau modifié' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Niveau introuvable' })
  async update(
    @Param() params: NiveauParams,
    @Body() corps: NiveauUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.niveauService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime un niveau (DELETE /api/v1/referentiels/niveaux/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zNiveauParams })
  @ApiOperation({ summary: 'Supprime un niveau' })
  @ApiResponse({ status: 200, description: 'Niveau supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Niveau introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (groupes associés)' })
  async delete(
    @Param() params: NiveauParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.niveauService.delete(params.id, req.user!.sub);
  }
}