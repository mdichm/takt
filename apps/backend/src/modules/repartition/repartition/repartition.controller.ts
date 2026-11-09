// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  zRepartitionAnnuler,
  type RepartitionAnnulerInput,
  zRepartitionValider,
  type RepartitionValiderInput,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { RepartitionService } from './repartition.service';
import { JwtAuthGuard, UtilisateurConnecte } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DepartmentScope } from '../../common/decorators/department-scope.decorator';

interface RequeteAvecUtilisateur {
  user?: UtilisateurConnecte;
  departementIds?: string[];
}

@ApiTags('Répartition')
@ApiBearerAuth()
@Controller('repartition')
export class RepartitionController {
  constructor(
    @Inject(RepartitionService)
    private readonly service: RepartitionService,
  ) {}

  /** Valide la répartition pédagogique d'un département (POST /api/v1/repartition/valider). */
  @Post('valider')
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('rdep', 'admin')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ body: zRepartitionValider })
  @ApiOperation({ summary: 'Valide la répartition pédagogique du département' })
  @ApiResponse({ status: 200, description: 'Répartition validée, snapshot créé' })
  @ApiResponse({ status: 400, description: 'Répartition incomplète ou dépassement de charge' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit ou hors périmètre' })
  @ApiResponse({ status: 404, description: 'Version ou plan d\'études introuvable' })
  @ApiResponse({ status: 409, description: 'État de version invalide pour validation' })
  async valider(
    @Body() corps: RepartitionValiderInput,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    // Le département cible provient du périmètre RBAC (rdep) ou du corps de requête (admin/dir sans département restreint).
    const departementId = corps.departementId ?? req.departementIds?.[0] ?? '';
    return this.service.validerRepartition(corps.versionId, departementId, req.user!.sub);
  }

  /** Annule la répartition pédagogique d'un département (POST /api/v1/repartition/annuler). */
  @Post('annuler')
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('rdep', 'admin')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ body: zRepartitionAnnuler })
  @ApiOperation({ summary: 'Annule la répartition pédagogique du département' })
  @ApiResponse({ status: 200, description: 'Répartition annulée, retour à l\'état initial' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit ou hors périmètre' })
  @ApiResponse({ status: 404, description: 'Aucun snapshot de répartition courant à annuler' })
  @ApiResponse({ status: 409, description: 'État de version invalide pour annulation' })
  async annuler(
    @Body() corps: RepartitionAnnulerInput,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    const departementId = corps.departementId ?? req.departementIds?.[0] ?? '';
    return this.service.annulerRepartition(corps.versionId, departementId, req.user!.sub);
  }
}