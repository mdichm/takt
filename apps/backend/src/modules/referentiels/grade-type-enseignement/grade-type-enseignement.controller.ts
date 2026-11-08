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
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { zGradeTypeEnseignementCreate, type GradeTypeEnseignementCreate } from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { GradeTypeEnseignementService } from './grade-type-enseignement.service';
import { JwtAuthGuard, UtilisateurConnecte } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

interface RequeteAvecUtilisateur {
  headers: Record<string, string | string[] | undefined>;
  user?: UtilisateurConnecte;
}

@ApiTags('Référentiels')
@ApiBearerAuth()
@Controller('referentiels/grade-type-enseignements')
export class GradeTypeEnseignementController {
  constructor(
    @Inject(GradeTypeEnseignementService)
    private readonly gradeTypeEnseignementService: GradeTypeEnseignementService,
  ) {}

  /** Liste complète des couples de la matrice (GET /api/v1/referentiels/grade-type-enseignements). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liste des couples (grade, type d’enseignement) de la matrice' })
  @ApiResponse({ status: 200, description: 'Liste des couples de la matrice' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(): Promise<unknown> {
    return this.gradeTypeEnseignementService.list();
  }

  /** Crée un couple dans la matrice (POST /api/v1/referentiels/grade-type-enseignements). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zGradeTypeEnseignementCreate })
  @ApiOperation({ summary: 'Crée un couple (grade, type d’enseignement) dans la matrice' })
  @ApiResponse({ status: 201, description: 'Couple créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(
    @Body() corps: GradeTypeEnseignementCreate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.gradeTypeEnseignementService.create(corps, req.user!.sub);
  }

  /** Récupère un couple de la matrice par son ID (GET /api/v1/referentiels/grade-type-enseignements/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Détail d’un couple (grade, type d’enseignement)' })
  @ApiResponse({ status: 200, description: 'Couple trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Couple introuvable' })
  async getOne(@Param('id') id: string): Promise<unknown> {
    return this.gradeTypeEnseignementService.getOne(id);
  }

  /** Supprime un couple de la matrice (DELETE /api/v1/referentiels/grade-type-enseignements/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprime un couple de la matrice' })
  @ApiResponse({ status: 200, description: 'Couple supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Couple introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (utilisé par un module)' })
  async delete(@Param('id') id: string, @Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    return this.gradeTypeEnseignementService.delete(id, req.user!.sub);
  }
}
