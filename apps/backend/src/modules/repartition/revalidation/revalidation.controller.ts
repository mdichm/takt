// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  zRevalidationDetecter,
  zRevalidationStatutsQuery,
  zRevalidationValider,
} from '@takt/contracts';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { RevalidationService } from './revalidation.service';
import { JwtAuthGuard, UtilisateurConnecte } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DepartmentScope } from '../../common/decorators/department-scope.decorator';

interface RequeteAvecUtilisateur {
  user?: UtilisateurConnecte;
  departementIds?: string[];
}

@ApiTags('Revalidation')
@ApiBearerAuth()
@Controller('repartition/revalidation')
export class RevalidationController {
  constructor(
    @Inject(RevalidationService)
    private readonly service: RevalidationService,
  ) {}

  /**
   * Détecte les départements d’une version impactés par une modification
   * pédagogique (POST /api/v1/repartition/revalidation/detecter).
   */
  @Post('detecter')
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('admin', 'gest', 'dir', 'rdep')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ body: zRevalidationDetecter })
  @ApiOperation({ summary: 'Détecte les départements impactés d’une version' })
  @ApiResponse({ status: 200, description: 'Départements impactés et notifications envoyées' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit ou hors périmètre' })
  @ApiResponse({ status: 404, description: 'Version introuvable' })
  async detecter(
    @Body() corps: { versionId: string },
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    const resultat = await this.service.detecterImpacts(corps.versionId, req.user!.sub);

    // Un rdep ne voit que son propre département.
    const departementIds = req.departementIds ?? [];
    if (departementIds.length > 0) {
      resultat.departementsImpactes = resultat.departementsImpactes.filter((d) =>
        departementIds.includes(d.departementId),
      );
    }

    return resultat;
  }

  /**
   * Revalide un département marqué `REVALIDATION_REQUISE`
   * (POST /api/v1/repartition/revalidation/valider).
   */
  @Post('valider')
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('rdep', 'admin')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ body: zRevalidationValider })
  @ApiOperation({ summary: 'Revalide la répartition d’un département impacté' })
  @ApiResponse({ status: 200, description: 'Département revalidé, nouveau snapshot créé' })
  @ApiResponse({ status: 400, description: 'Répartition incomplète ou charge bloquante' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit ou hors périmètre' })
  @ApiResponse({ status: 404, description: 'Aucune validation de répartition trouvée' })
  @ApiResponse({ status: 409, description: 'Aucune demande de revalidation en cours' })
  async revalider(
    @Body() corps: { versionId: string; departementId?: string },
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    const departementId = corps.departementId ?? (req.departementIds ?? [])[0] ?? '';

    // Un rdep ne peut revalider que son propre département.
    const departementIds = req.departementIds ?? [];
    if (departementIds.length > 0 && departementId && !departementIds.includes(departementId)) {
      throw new ApiError(
        CODES_ERREUR_API.FORBIDDEN,
        403,
        'Hors périmètre : ce département n’est pas dans votre portée',
        { departementId, departementIds },
      );
    }

    return this.service.revalider(corps.versionId, departementId, req.user!.sub);
  }

  /**
   * Lit les états de validation d’une version
   * (GET /api/v1/repartition/revalidation/statuts?versionId=).
   */
  @Get('statuts')
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('admin', 'gest', 'dir', 'rdep')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zRevalidationStatutsQuery })
  @ApiOperation({ summary: 'Liste les états de validation par département' })
  @ApiResponse({ status: 200, description: 'États de validation des départements' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit ou hors périmètre' })
  async statuts(
    @Query() query: { versionId: string },
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    const validations = await this.service.lireStatuts(query.versionId);

    const departementIds = req.departementIds ?? [];
    if (departementIds.length > 0) {
      return validations.filter((v) => departementIds.includes(v.departementId));
    }
    return validations;
  }
}
