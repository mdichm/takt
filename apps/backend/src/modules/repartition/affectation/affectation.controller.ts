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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  zAffectationPedagogiqueCascade,
  zAffectationPedagogiqueCreate,
  zAffectationPedagogiqueListFilters,
  zAffectationPedagogiqueParams,
  zAffectationPedagogiqueUpdate,
  type AffectationPedagogiqueCreate,
  type AffectationPedagogiqueCascade,
  type AffectationPedagogiqueListFilters,
  type AffectationPedagogiqueParams,
  type AffectationPedagogiqueUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { AffectationPedagogiqueService } from './affectation.service';
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

const ROLES_LECTURE = ['admin', 'gest', 'rdep', 'dir'] as const;
const ROLES_ECRITURE = ['rdep', 'admin'] as const;

@ApiTags('Répartition')
@ApiBearerAuth()
@Controller('affectations')
export class AffectationPedagogiqueController {
  constructor(
    @Inject(AffectationPedagogiqueService)
    private readonly service: AffectationPedagogiqueService,
  ) {}

  /** Liste paginée des affectations pédagogiques (GET /api/v1/affectations). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles(...ROLES_LECTURE)
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zAffectationPedagogiqueListFilters })
  @ApiOperation({ summary: 'Liste paginée des affectations pédagogiques' })
  @ApiResponse({ status: 200, description: 'Liste des affectations pédagogiques' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(
    @Query() query: AffectationPedagogiqueListFilters,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.lister(query, req.departementIds ?? []);
  }

  /** Détail d'une affectation pédagogique (GET /api/v1/affectations/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_LECTURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zAffectationPedagogiqueParams })
  @ApiOperation({ summary: 'Détail d’une affectation pédagogique' })
  @ApiResponse({ status: 200, description: 'Affectation pédagogique trouvée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit ou hors périmètre' })
  @ApiResponse({ status: 404, description: 'Affectation pédagogique introuvable' })
  async getOne(
    @Param() params: AffectationPedagogiqueParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.detail(params.id, req.departementIds ?? []);
  }

  /** Crée une affectation pédagogique (POST /api/v1/affectations). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles(...ROLES_ECRITURE)
  @DepartmentScope()
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zAffectationPedagogiqueCreate })
  @ApiOperation({ summary: 'Crée une affectation pédagogique' })
  @ApiResponse({ status: 201, description: 'Affectation pédagogique créée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Version ou ressource introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (triplet déjà affecté)' })
  async creer(
    @Body() corps: AffectationPedagogiqueCreate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    const departementId = req.departementIds?.[0] ?? '';
    return this.service.creer(corps, departementId, req.user!.sub);
  }

  /** Met à jour une affectation pédagogique (PATCH /api/v1/affectations/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zAffectationPedagogiqueParams, body: zAffectationPedagogiqueUpdate })
  @ApiOperation({ summary: 'Modifie une affectation pédagogique' })
  @ApiResponse({ status: 200, description: 'Affectation pédagogique modifiée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Affectation pédagogique introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (triplet déjà affecté)' })
  async mettreAJour(
    @Param() params: AffectationPedagogiqueParams,
    @Body() corps: AffectationPedagogiqueUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.mettreAJour(params.id, corps, req.user!.sub);
  }

  /** Supprime une affectation pédagogique (DELETE /api/v1/affectations/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zAffectationPedagogiqueParams })
  @ApiOperation({ summary: 'Supprime une affectation pédagogique' })
  @ApiResponse({ status: 200, description: 'Affectation pédagogique supprimée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Affectation pédagogique introuvable' })
  async supprimer(
    @Param() params: AffectationPedagogiqueParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.supprimer(params.id, req.user!.sub);
  }

  /** Crée des affectations en cascade depuis un plan d'études (POST /api/v1/affectations/cascade). */
  @Post('cascade')
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles(...ROLES_ECRITURE)
  @DepartmentScope()
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zAffectationPedagogiqueCascade })
  @ApiOperation({ summary: 'Crée des affectations en cascade depuis un plan d’études' })
  @ApiResponse({ status: 201, description: 'Affectations créées en cascade' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Ressource introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (triplet déjà affecté)' })
  async creerCascade(
    @Body() corps: AffectationPedagogiqueCascade,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    const departementId = req.departementIds?.[0] ?? '';
    return this.service.creerCascade(corps, departementId, req.user!.sub);
  }
}
