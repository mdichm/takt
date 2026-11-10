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
  zEtablissementCreate,
  zEtablissementList,
  zEtablissementParams,
  zEtablissementUpdate,
  type EtablissementCreate,
  type EtablissementListFilters,
  type EtablissementParams,
  type EtablissementUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { EtablissementService } from './etablissement.service';
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
@Controller('referentiels/etablissements')
export class EtablissementController {
  constructor(
    @Inject(EtablissementService) private readonly etablissementService: EtablissementService,
  ) {}

  /** Liste paginée des établissements (GET /api/v1/referentiels/etablissements). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zEtablissementList })
  @ApiOperation({ summary: 'Liste paginée des établissements' })
  @ApiResponse({ status: 200, description: 'Liste des établissements' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as EtablissementListFilters;
    return this.etablissementService.list(query, req.departementIds ?? []);
  }

  /** Récupère un établissement par son ID (GET /api/v1/referentiels/etablissements/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zEtablissementParams })
  @ApiOperation({ summary: 'Détail d’un établissement' })
  @ApiResponse({ status: 200, description: 'Établissement trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Établissement introuvable' })
  async getOne(@Param() params: EtablissementParams): Promise<unknown> {
    return this.etablissementService.getOne(params.id);
  }

  /** Crée un établissement (POST /api/v1/referentiels/etablissements). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zEtablissementCreate })
  @ApiOperation({ summary: 'Crée un établissement' })
  @ApiResponse({ status: 201, description: 'Établissement créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(
    @Body() corps: EtablissementCreate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.etablissementService.create(corps, req.user!.sub);
  }

  /** Met à jour un établissement (PATCH /api/v1/referentiels/etablissements/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zEtablissementParams, body: zEtablissementUpdate })
  @ApiOperation({ summary: 'Modifie un établissement' })
  @ApiResponse({ status: 200, description: 'Établissement modifié' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Établissement introuvable' })
  async update(
    @Param() params: EtablissementParams,
    @Body() corps: EtablissementUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.etablissementService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime un établissement (DELETE /api/v1/referentiels/etablissements/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zEtablissementParams })
  @ApiOperation({ summary: 'Supprime un établissement' })
  @ApiResponse({ status: 200, description: 'Établissement supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Établissement introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (départements associés)' })
  async delete(
    @Param() params: EtablissementParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.etablissementService.delete(params.id, req.user!.sub);
  }
}
