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
  zChargeRuleSetCreate,
  zChargeRuleSetUpdate,
  type ChargeRuleSetCreate,
  type ChargeRuleSetUpdate,
} from '@takt/contracts';
import { zPaginationQuery, zSearchFilter } from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { ChargeRuleSetService } from './charge-rule-set.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

interface RequeteAvecUtilisateur {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  user?: { sub: string };
}

const zChargeRuleSetList = zPaginationQuery.merge(zSearchFilter);

@ApiTags('Référentiels')
@ApiBearerAuth()
@Controller('referentiels/charge-rule-sets')
export class ChargeRuleSetController {
  constructor(
    @Inject(ChargeRuleSetService)
    private readonly chargeRuleSetService: ChargeRuleSetService,
  ) {}

  /** Liste paginée des règles de charge. */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zChargeRuleSetList })
  @ApiOperation({ summary: 'Liste paginée des règles de charge' })
  @ApiResponse({ status: 200, description: 'Liste des règles de charge' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as {
      page?: number;
      pageSize?: number;
      search?: string;
    };
    return this.chargeRuleSetService.list(query);
  }

  /** Récupère la règle de charge active. */
  @Get('actif')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Règle de charge active' })
  @ApiResponse({ status: 200, description: 'Règle de charge active' })
  @ApiResponse({ status: 404, description: 'Aucune règle de charge active' })
  async getActif(): Promise<unknown> {
    return this.chargeRuleSetService.getActif();
  }

  /** Récupère une règle de charge par son ID. */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Détail d’une règle de charge' })
  @ApiResponse({ status: 200, description: 'Règle de charge trouvée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Règle de charge introuvable' })
  async getOne(@Param() params: { id: string }): Promise<unknown> {
    return this.chargeRuleSetService.getOne(params.id);
  }

  /** Crée une règle de charge. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zChargeRuleSetCreate })
  @ApiOperation({ summary: 'Crée une règle de charge' })
  @ApiResponse({ status: 201, description: 'Règle de charge créée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(
    @Body() corps: ChargeRuleSetCreate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.chargeRuleSetService.create(corps, req.user!.sub);
  }

  /** Met à jour une règle de charge. */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ body: zChargeRuleSetUpdate })
  @ApiOperation({ summary: 'Modifie une règle de charge' })
  @ApiResponse({ status: 200, description: 'Règle de charge modifiée' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Règle de charge introuvable' })
  async update(
    @Param() params: { id: string },
    @Body() corps: ChargeRuleSetUpdate,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.chargeRuleSetService.update(params.id, corps, req.user!.sub);
  }

  /** Supprime une règle de charge. */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprime une règle de charge' })
  @ApiResponse({ status: 200, description: 'Règle de charge supprimée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Règle de charge introuvable' })
  async delete(
    @Param() params: { id: string },
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<{ id: string }> {
    return this.chargeRuleSetService.delete(params.id, req.user!.sub);
  }
}