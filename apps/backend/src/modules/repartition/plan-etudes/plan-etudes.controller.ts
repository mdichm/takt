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
  zPlanEtudesCreate,
  zPlanEtudesList,
  zPlanEtudesMatiereCreate,
  zPlanEtudesMatiereList,
  zPlanEtudesMatiereParams,
  zPlanEtudesMatiereUpdate,
  zPlanEtudesParams,
  zPlanEtudesUpdate,
  type PlanEtudesCreate,
  type PlanEtudesListFilters,
  type PlanEtudesMatiereCreate,
  type PlanEtudesMatiereListFilters,
  type PlanEtudesMatiereParams,
  type PlanEtudesMatiereUpdate,
  type PlanEtudesParams,
  type PlanEtudesUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { PlanEtudesService } from './plan-etudes.service';
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

const ROLES_LECTURE = ['admin', 'gest', 'rdep', 'dir'] as const;
const ROLES_ECRITURE = ['admin', 'gest'] as const;

@ApiTags('Plans d’études')
@ApiBearerAuth()
@Controller('plans-etudes')
export class PlanEtudesController {
  constructor(@Inject(PlanEtudesService) private readonly service: PlanEtudesService) {}

  /** Liste paginée des plans d'études (GET /api/v1/plans-etudes). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles(...ROLES_LECTURE)
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zPlanEtudesList })
  @ApiOperation({ summary: 'Liste paginée des plans d’études' })
  @ApiResponse({ status: 200, description: 'Liste des plans d’études' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as PlanEtudesListFilters;
    return this.service.list(query, req.departementIds ?? []);
  }

  /** Détail d’un plan d'études (GET /api/v1/plans-etudes/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_LECTURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zPlanEtudesParams })
  @ApiOperation({ summary: 'Détail d’un plan d’études' })
  @ApiResponse({ status: 200, description: 'Plan d’études trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit ou hors périmètre' })
  @ApiResponse({ status: 404, description: 'Plan d’études introuvable' })
  async getOne(
    @Param() params: PlanEtudesParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.getOne(params.id, req.departementIds ?? []);
  }

  /** Volume total hebdomadaire d'un plan d'études (GET /api/v1/plans-etudes/:id/volume-total). */
  @Get(':id/volume-total')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_LECTURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zPlanEtudesParams })
  @ApiOperation({ summary: 'Volume total hebdomadaire d’un plan d’études' })
  @ApiResponse({ status: 200, description: 'Volume total du plan d’études' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit ou hors périmètre' })
  @ApiResponse({ status: 404, description: 'Plan d’études introuvable' })
  async volumeTotal(
    @Param() params: PlanEtudesParams,
  ): Promise<unknown> {
    return this.service.volumeTotal(params.id);
  }

  /** Groupes héritant du plan via leur niveau (GET /api/v1/plans-etudes/:id/groupes-herites). */
  @Get(':id/groupes-herites')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_LECTURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zPlanEtudesParams })
  @ApiOperation({ summary: 'Groupes héritant du plan d’études' })
  @ApiResponse({ status: 200, description: 'Liste des groupes héritiers' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit ou hors périmètre' })
  @ApiResponse({ status: 404, description: 'Plan d’études introuvable' })
  async groupesHerites(
    @Param() params: PlanEtudesParams,
  ): Promise<unknown> {
    return this.service.groupesHerites(params.id);
  }

  /** Crée un plan d'études (POST /api/v1/plans-etudes). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zPlanEtudesCreate })
  @ApiOperation({ summary: 'Crée un plan d’études' })
  @ApiResponse({ status: 201, description: 'Plan d’études créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 409, description: 'Conflit (plan déjà existant)' })
  async create(
    @Body() corps: PlanEtudesCreate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.create(corps, req.user!.sub);
  }

  /** Met à jour un plan d'études (PATCH /api/v1/plans-etudes/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zPlanEtudesParams, body: zPlanEtudesUpdate })
  @ApiOperation({ summary: 'Modifie un plan d’études' })
  @ApiResponse({ status: 200, description: 'Plan d’études modifié' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Plan d’études introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (plan déjà existant)' })
  async update(
    @Param() params: PlanEtudesParams,
    @Body() corps: PlanEtudesUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.update(params.id, corps, req.user!.sub);
  }

  /** Supprime un plan d'études (DELETE /api/v1/plans-etudes/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zPlanEtudesParams })
  @ApiOperation({ summary: 'Supprime un plan d’études' })
  @ApiResponse({ status: 200, description: 'Plan d’études supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Plan d’études introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (matières associées)' })
  async delete(
    @Param() params: PlanEtudesParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.delete(params.id, req.user!.sub);
  }

  /** Liste paginée des matières d'un plan d'études (GET /api/v1/plans-etudes/:planEtudesId/matieres). */
  @Get(':planEtudesId/matieres')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_LECTURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zPlanEtudesMatiereParams, query: zPlanEtudesMatiereList })
  @ApiOperation({ summary: 'Liste des matières d’un plan d’études' })
  @ApiResponse({ status: 200, description: 'Liste des matières du plan' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit ou hors périmètre' })
  @ApiResponse({ status: 404, description: 'Plan d’études introuvable' })
  async listMatieres(
    @Param() params: PlanEtudesMatiereParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as PlanEtudesMatiereListFilters;
    return this.service.listMatieres(params.planEtudesId, query);
  }

  /** Détail d'une matière de plan d'études (GET /api/v1/plans-etudes/:planEtudesId/matieres/:id). */
  @Get(':planEtudesId/matieres/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_LECTURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zPlanEtudesMatiereParams })
  @ApiOperation({ summary: 'Détail d’une matière de plan d’études' })
  @ApiResponse({ status: 200, description: 'Matière du plan d’études' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit ou hors périmètre' })
  @ApiResponse({ status: 404, description: 'Matière introuvable' })
  async getMatiere(
    @Param() params: PlanEtudesMatiereParams,
  ): Promise<unknown> {
    return this.service.getMatiere(params.planEtudesId, params.id);
  }

  /** Ajoute une matière à un plan d'études (POST /api/v1/plans-etudes/:planEtudesId/matieres). */
  @Post(':planEtudesId/matieres')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ params: zPlanEtudesMatiereParams, body: zPlanEtudesMatiereCreate })
  @ApiOperation({ summary: 'Ajoute une matière à un plan d’études' })
  @ApiResponse({ status: 201, description: 'Matière ajoutée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Plan d’études introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (matière déjà présente)' })
  async ajouterMatiere(
    @Param() params: PlanEtudesMatiereParams,
    @Body() corps: PlanEtudesMatiereCreate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.ajouterMatiere(params.planEtudesId, corps, req.user!.sub);
  }

  /** Modifie une matière d'un plan d'études (PATCH /api/v1/plans-etudes/:planEtudesId/matieres/:id). */
  @Patch(':planEtudesId/matieres/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zPlanEtudesMatiereParams, body: zPlanEtudesMatiereUpdate })
  @ApiOperation({ summary: 'Modifie une matière de plan d’études' })
  @ApiResponse({ status: 200, description: 'Matière modifiée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Matière introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (matière déjà présente)' })
  async updateMatiere(
    @Param() params: PlanEtudesMatiereParams,
    @Body() corps: PlanEtudesMatiereUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.updateMatiere(params.planEtudesId, params.id, corps, req.user!.sub);
  }

  /** Supprime une matière d'un plan d'études (DELETE /api/v1/plans-etudes/:planEtudesId/matieres/:id). */
  @Delete(':planEtudesId/matieres/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zPlanEtudesMatiereParams })
  @ApiOperation({ summary: 'Supprime une matière de plan d’études' })
  @ApiResponse({ status: 200, description: 'Matière supprimée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Matière introuvable' })
  async deleteMatiere(
    @Param() params: PlanEtudesMatiereParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.deleteMatiere(params.planEtudesId, params.id, req.user!.sub);
  }
}