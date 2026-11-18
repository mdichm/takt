// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Controller,
  Get,
  Inject,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { zUuid } from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ConflictService } from './conflict.service';

const ROLES_LECTURE = ['admin', 'gest', 'rdep', 'dir'] as const;

/** Paramètres de lecture des conflits d'une séance projetée sur une version. */
const zConflitQuery = z.object({
  jour: z.coerce.number().int().min(1).max(6),
  creneauDebutId: zUuid,
  nbCreneaux: z.number().int().positive(),
  salleId: zUuid.nullish().optional(),
  enseignantId: zUuid.nullish().optional(),
  groupeId: zUuid.nullish().optional(),
});

@ApiTags('Conflits')
@ApiBearerAuth()
@Controller('versions')
export class ConflictController {
  constructor(@Inject(ConflictService) private readonly service: ConflictService) {}

  /**
   * Détecte les conflits d'une séance projetée sur une version (GET /api/v1/versions/:id/conflits).
   * Retourne la liste des conflits et un indicateur `bloquant`.
   */
  @Get(':id/conflits')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_LECTURE)
  @HttpCode(HttpStatus.OK)
  @ZodValidation({
    params: z.object({ id: zUuid }),
    query: zConflitQuery,
  })
  @ApiOperation({ summary: "Détecte les conflits d'une séance sur une version" })
  @ApiResponse({ status: 200, description: 'Liste des conflits détectés' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async conflits(
    @Param() params: { id: string },
    @Query() query: z.infer<typeof zConflitQuery>,
  ) {
    return this.service.detecterConflits({
      versionId: params.id,
      jour: query.jour,
      creneauDebutId: query.creneauDebutId,
      nbCreneaux: query.nbCreneaux,
      salleId: query.salleId,
      enseignantId: query.enseignantId,
      groupeId: query.groupeId,
    });
  }
}
