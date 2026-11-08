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
  zMatiereCreate,
  zMatiereList,
  zMatiereParams,
  zMatiereUpdate,
  type MatiereCreate,
  type MatiereListFilters,
  type MatiereParams,
  type MatiereUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { MatiereService } from './matiere.service';
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
@Controller('referentiels/matieres')
export class MatiereController {
  constructor(@Inject(MatiereService) private readonly matiereService: MatiereService) {}

  /** Liste paginée des matières (GET /api/v1/referentiels/matieres). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zMatiereList })
  @ApiOperation({ summary: 'Liste paginée des matières' })
  @ApiResponse({ status: 200, description: 'Liste des matières' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as MatiereListFilters;
    return this.matiereService.list(query);
  }

  /** Récupère une matière par son ID (GET /api/v1/referentiels/matieres/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zMatiereParams })
  @ApiOperation({ summary: 'Détail d’une matière' })
  @ApiResponse({ status: 200, description: 'Matière trouvée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Matière introuvable' })
  async getOne(@Param() params: MatiereParams): Promise<unknown> {
    return this.matiereService.getOne(params.id);
  }

  /** Crée une matière (POST /api/v1/referentiels/matieres). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zMatiereCreate })
  @ApiOperation({ summary: 'Crée une matière' })
  @ApiResponse({ status: 201, description: 'Matière créée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(@Body() corps: MatiereCreate, @Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    return this.matiereService.create(corps, req.user!.sub);
  }

  /** Met à jour une matière (PATCH /api/v1/referentiels/matieres/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zMatiereParams, body: zMatiereUpdate })
  @ApiOperation({ summary: 'Modifie une matière' })
  @ApiResponse({ status: 200, description: 'Matière modifiée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Matière introuvable' })
  async update(
    @Param() params: MatiereParams,
    @Body() corps: MatiereUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.matiereService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime une matière (DELETE /api/v1/referentiels/matieres/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zMatiereParams })
  @ApiOperation({ summary: 'Supprime une matière' })
  @ApiResponse({ status: 200, description: 'Matière supprimée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Matière introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (utilisée par une affectation)' })
  async delete(
    @Param() params: MatiereParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.matiereService.delete(params.id, req.user!.sub);
  }
}
