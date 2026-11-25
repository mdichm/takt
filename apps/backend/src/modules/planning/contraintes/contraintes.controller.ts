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
import { z } from 'zod';
import { zUuid } from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ContraintesService } from './contraintes.service';

const ROLES_LECTURE = ['admin', 'gest', 'rdep', 'dir'] as const;
const ROLES_ECRITURE = ['admin', 'gest'] as const;

interface RequeteAvecUtilisateur {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  user?: { sub: string };
}

const zContrainteQuery = z.object({
  versionId: zUuid.optional(),
  type: z.string().optional(),
  cibleId: zUuid.optional(),
  estActif: z.boolean().optional(),
});

const zContrainteParams = z.object({ id: zUuid });

const zContrainteCreateBody = z.object({
  versionId: zUuid,
  type: z.string(),
  cibleId: zUuid,
  valeur: z.string(),
  poids: z.number().int().min(1).max(100).optional(),
  estActif: z.boolean().optional(),
});

const zContrainteUpdateBody = z.object({
  type: z.string().optional(),
  cibleId: zUuid.optional(),
  valeur: z.string().optional(),
  poids: z.number().int().min(1).max(100).optional().nullable(),
  estActif: z.boolean().optional(),
});

@ApiTags('Contraintes')
@ApiBearerAuth()
@Controller('contraintes')
export class ContraintesController {
  constructor(
    @Inject(ContraintesService) private readonly service: ContraintesService,
  ) {}

  /**
   * Liste paginée des contraintes d'une version.
   * GET /api/v1/contraintes?versionId=&type=&cibleId=&page=&pageSize=
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_LECTURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zContrainteQuery })
  @ApiOperation({ summary: 'Liste paginée des contraintes d une version' })
  @ApiResponse({ status: 200, description: 'Liste des contraintes' })
  @ApiResponse({ status: 401, description: 'Non authentifie' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async lister(
    @Query() query: z.infer<typeof zContrainteQuery>,
  ) {
    return this.service.lister(query as never);
  }

  /**
   * Détecte les conflits potentiels des contraintes d'une version.
   * GET /api/v1/contraintes/conflits?versionId=
   */
  @Get('conflits')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_LECTURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({
    query: z.object({ versionId: zUuid }),
  })
  @ApiOperation({ summary: 'Détecte les conflits de contraintes d une version' })
  @ApiResponse({ status: 200, description: 'Conflits détectés' })
  @ApiResponse({ status: 401, description: 'Non authentifie' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async conflits(
    @Query() query: { versionId: string },
  ) {
    return this.service.detecterConflits(query.versionId);
  }

  /**
   * Crée une contrainte.
   * POST /api/v1/contraintes
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zContrainteCreateBody })
  @ApiOperation({ summary: 'Crée une contrainte de génération' })
  @ApiResponse({ status: 201, description: 'Contrainte créée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Version introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (version publiée ou doublon)' })
  async creer(
    @Body() corps: z.infer<typeof zContrainteCreateBody>,
    @Req() req: RequeteAvecUtilisateur,
  ) {
    return this.service.creer(corps, req.user!.sub);
  }

  /**
   * Modifie partiellement une contrainte.
   * PATCH /api/v1/contraintes/:id
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({
    params: zContrainteParams,
    body: zContrainteUpdateBody,
  })
  @ApiOperation({ summary: 'Modifie partiellement une contrainte' })
  @ApiResponse({ status: 200, description: 'Contrainte modifiée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Contrainte introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (version publiée ou doublon)' })
  async mettreAJour(
    @Param() params: z.infer<typeof zContrainteParams>,
    @Body() corps: z.infer<typeof zContrainteUpdateBody>,
    @Req() req: RequeteAvecUtilisateur,
  ) {
    return this.service.mettreAJour(params, corps, req.user!.sub);
  }

  /**
   * Supprime une contrainte.
   * DELETE /api/v1/contraintes/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zContrainteParams })
  @ApiOperation({ summary: 'Supprime une contrainte' })
  @ApiResponse({ status: 200, description: 'Contrainte supprimée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Contrainte introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (version publiée)' })
  async supprimer(
    @Param() params: z.infer<typeof zContrainteParams>,
    @Req() req: RequeteAvecUtilisateur,
  ) {
    return this.service.supprimer(params, req.user!.sub);
  }
}
