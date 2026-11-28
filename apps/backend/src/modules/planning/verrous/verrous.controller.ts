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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  zLockCreate,
  zLockList,
  zLockParams,
  type LockCreateInput,
  type LockListFilters,
  type LockParams,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { VerrouService } from './verrous.service';
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
const ROLES_ECRITURE = ['rdep', 'admin', 'gest'] as const;

@ApiTags('Verrous')
@ApiBearerAuth()
@Controller('locks')
export class VerrousController {
  constructor(@Inject(VerrouService) private readonly service: VerrouService) {}

  /** Liste paginee des verrous (GET /api/v1/locks). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles(...ROLES_LECTURE)
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zLockList })
  @ApiOperation({ summary: 'Liste paginee des verrous de seance' })
  @ApiResponse({ status: 200, description: 'Liste des verrous' })
  @ApiResponse({ status: 401, description: 'Non authentifie' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async lister(@Query() query: LockListFilters): Promise<unknown> {
    return this.service.lister(query);
  }

  /** Pose un verrou sur une seance ou sur une portee (POST /api/v1/locks). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zLockCreate })
  @ApiOperation({ summary: 'Pose un verrou sur une seance ou une portee' })
  @ApiResponse({ status: 201, description: 'Verrou pose' })
  @ApiResponse({ status: 400, description: 'Requete invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifie' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Version ou seance introuvable' })
  @ApiResponse({ status: 409, description: 'Version verrouillee (publiee)' })
  async poser(
    @Body() corps: LockCreateInput,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.poserVerrou(corps, req.user!.sub);
  }

  /** Leve un verrou par son id (DELETE /api/v1/locks/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_ECRITURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zLockParams })
  @ApiOperation({ summary: 'Leve un verrou de seance' })
  @ApiResponse({ status: 200, description: 'Verrou leve' })
  @ApiResponse({ status: 401, description: 'Non authentifie' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Verrou introuvable' })
  @ApiResponse({ status: 409, description: 'Version verrouillee (publiee)' })
  async lever(
    @Param() params: LockParams,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    return this.service.leverVerrou(params.id, req.user!.sub);
  }
}
