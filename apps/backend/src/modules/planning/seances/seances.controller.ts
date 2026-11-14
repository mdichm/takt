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
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  zSeanceCreate,
  zSeanceList,
  zSeanceParams,
  zSeanceReplace,
  zSeanceUpdate,
  type SeanceCreateInput,
  type SeanceListFilters,
  type SeanceParams,
  type SeanceReplaceInput,
  type SeanceUpdateInput,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { SeancesService } from './seances.service';
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

@ApiTags('Seances')
@ApiBearerAuth()
@Controller('seances')
export class SeancesController {
  constructor(
    @Inject(SeancesService)
    private readonly service: SeancesService,
  ) {}

  /** Liste paginee des seances d'une version (GET /api/v1/seances). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles(...ROLES_LECTURE)
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zSeanceList })
  @ApiOperation({ summary: 'Liste paginee des seances d une version' })
  @ApiResponse({ status: 200, description: 'Liste des seances' })
  @ApiResponse({ status: 401, description: 'Non authentifie' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Query() query: SeanceListFilters): Promise<unknown> {
    return this.service.lister(query);
  }

  /** Detail d'une seance (GET /api/v1/seances/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_LECTURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zSeanceParams })
  @ApiOperation({ summary: 'Detail d une seance' })
  @ApiResponse({ status: 200, description: 'Seance trouvee' })
  @ApiResponse({ status: 401, description: 'Non authentifie' })
  @ApiResponse({ status: 403, description: 'Interdit ou hors perimetre' })
  @ApiResponse({ status: 404, description: 'Seance introuvable' })
  async getOne(@Param() params: SeanceParams): Promise<unknown> {
    return this.service.obtenir(params);
  }

  /** Cree une seance (POST /api/v1/seances). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zSeanceCreate })
  @ApiOperation({ summary: 'Cree une seance' })
  @ApiResponse({ status: 201, description: 'Seance creee' })
  @ApiResponse({ status: 400, description: 'Requete invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifie' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Version ou ressource introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (version publiee)' })
  async creer(
    @Body() corps: SeanceCreateInput,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.creer(corps, req.user!.sub);
  }

  /** Remplace completement une seance (PUT /api/v1/seances/:id). */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zSeanceParams, body: zSeanceReplace })
  @ApiOperation({ summary: 'Remplace completement une seance' })
  @ApiResponse({ status: 200, description: 'Seance remplacee' })
  @ApiResponse({ status: 400, description: 'Requete invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifie' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Seance introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (version publiee)' })
  async remplacer(
    @Param() params: SeanceParams,
    @Body() corps: SeanceReplaceInput,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.mettreAJour(params.id, corps, req.user!.sub);
  }

  /** Met a jour partiellement une seance (PATCH /api/v1/seances/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zSeanceParams, body: zSeanceUpdate })
  @ApiOperation({ summary: 'Modifie partiellement une seance' })
  @ApiResponse({ status: 200, description: 'Seance modifiee' })
  @ApiResponse({ status: 400, description: 'Requete invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifie' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Seance introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (version publiee)' })
  async mettreAJour(
    @Param() params: SeanceParams,
    @Body() corps: SeanceUpdateInput,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.mettreAJour(params.id, corps, req.user!.sub);
  }

  /** Supprime une seance (DELETE /api/v1/seances/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zSeanceParams })
  @ApiOperation({ summary: 'Supprime une seance' })
  @ApiResponse({ status: 200, description: 'Seance supprimee' })
  @ApiResponse({ status: 401, description: 'Non authentifie' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Seance introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (version publiee)' })
  async supprimer(
    @Param() params: SeanceParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.supprimer(params.id, req.user!.sub);
  }
}