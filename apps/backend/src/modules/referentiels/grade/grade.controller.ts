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
  zGradeCreate,
  zGradeList,
  zGradeParams,
  zGradeUpdate,
  type GradeCreate,
  type GradeListFilters,
  type GradeParams,
  type GradeUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { GradeService } from './grade.service';
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
@Controller('referentiels/grades')
export class GradeController {
  constructor(@Inject(GradeService) private readonly gradeService: GradeService) {}

  /** Liste paginée des grades (GET /api/v1/referentiels/grades). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zGradeList })
  @ApiOperation({ summary: 'Liste paginée des grades' })
  @ApiResponse({ status: 200, description: 'Liste des grades' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as GradeListFilters;
    return this.gradeService.list(query);
  }

  /** Récupère un grade par son ID (GET /api/v1/referentiels/grades/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zGradeParams })
  @ApiOperation({ summary: 'Détail d’un grade' })
  @ApiResponse({ status: 200, description: 'Grade trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Grade introuvable' })
  async getOne(@Param() params: GradeParams): Promise<unknown> {
    return this.gradeService.getOne(params.id);
  }

  /** Crée un grade (POST /api/v1/referentiels/grades). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zGradeCreate })
  @ApiOperation({ summary: 'Crée un grade' })
  @ApiResponse({ status: 201, description: 'Grade créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(@Body() corps: GradeCreate, @Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    return this.gradeService.create(corps, req.user!.sub);
  }

  /** Met à jour un grade (PATCH /api/v1/referentiels/grades/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zGradeParams, body: zGradeUpdate })
  @ApiOperation({ summary: 'Modifie un grade' })
  @ApiResponse({ status: 200, description: 'Grade modifié' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Grade introuvable' })
  async update(
    @Param() params: GradeParams,
    @Body() corps: GradeUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.gradeService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime un grade (DELETE /api/v1/referentiels/grades/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zGradeParams })
  @ApiOperation({ summary: 'Supprime un grade' })
  @ApiResponse({ status: 200, description: 'Grade supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Grade introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (utilisé par un module)' })
  async delete(@Param() params: GradeParams, @Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    return this.gradeService.delete(params.id, req.user!.sub);
  }
}
