// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard, UtilisateurConnecte } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ZodValidation } from '../common/pipes/zod-validation.decorator';
import {
  zGeneration,
  zGenerationAnnuler,
  zGenerationListFilters,
  GenerationItem,
  GenerationList,
  GenerationStatut,
} from '@takt/contracts';
import { GenerationsService } from './generations.service';

interface RequeteAvecUtilisateur {
  user?: UtilisateurConnecte;
}

/**
 * Contrôleur des générations CP-SAT.
 *
 * Endpoints conformes à docs/openapi.yaml :
 * - `GET/POST /api/v1/generations` — liste et création de générations
 * - `GET /api/v1/generations/:id/scenarios` — scénarios d'une génération
 * - La sélection d'un scénario est gérée par `SelectionController`
 *
 * Toutes les réponses suivent l'enveloppe `{ data, error, meta }` appliquée
 * par l'intercepteur global (ST_TAKT §3.3).
 */
@ApiTags('générations')
@Controller('generations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GenerationsController {
  constructor(private readonly generationsService: GenerationsService) {}

  /**
   * Liste des générations (GET /api/v1/generations).
   */
  @Get()
  @Roles('admin', 'gest', 'rdep', 'dir')
  @ApiOperation({ summary: 'Liste des générations' })
  @ApiResponse({ status: 200, description: 'Liste des générations' })
  @ZodValidation({ query: zGenerationListFilters })
  async lister(
    @Query() filtres: unknown,
  ): Promise<{ data: GenerationList; error: null; meta: { timestamp: string } }> {
    const resultat = await this.generationsService.listerGenerations(
      filtres as never,
    );
    return {
      data: resultat as unknown as GenerationList,
      error: null,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  /**
   * Crée une génération et publie un job pg-boss (POST /api/v1/generations).
   */
  @Post('')
  @Roles('gest')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Lancer une génération CP-SAT' })
  @ApiResponse({ status: 202, description: "Génération lancée (job en file d'attente)" })
  @ApiResponse({ status: 409, description: 'Conflit (génération déjà en cours)' })
  @ZodValidation({ body: zGeneration })
  async creer(
    @Body() corps: unknown,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<{ data: GenerationItem; error: null; meta: { timestamp: string } }> {
    const utilisateurId = req.user?.sub;
    if (!utilisateurId) {
      throw new Error('Utilisateur non authentifié');
    }

    const { versionId } = corps as { versionId: string };
    const generation = await this.generationsService.creerGeneration(
      versionId,
      utilisateurId,
    );

    return {
      data: generation as unknown as GenerationItem,
      error: null,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  /**
   * Annule une génération en cours (POST /api/v1/generations/:id/annuler).
   * Retourne 409 si la génération n'est pas EN_COURS ou si un scénario a
   * déjà été adopté.
   */
  @Post(':id/annuler')
  @Roles('gest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Annuler une génération' })
  @ApiResponse({ status: 200, description: 'Génération annulée, version retournée à brouillon' })
  @ApiResponse({ status: 404, description: 'Génération introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit (déjà adoptée ou terminée)' })
  @ZodValidation({ body: zGenerationAnnuler })
  async annuler(
    @Param('id') id: string,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<{ data: { id: string; statut: string }; error: null; meta: { timestamp: string } }> {
    const utilisateurId = req.user?.sub;
    if (!utilisateurId) {
      throw new Error('Utilisateur non authentifié');
    }
    const resultat = await this.generationsService.annulerGeneration(id, utilisateurId);
    return {
      data: resultat as unknown as { id: string; statut: string },
      error: null,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  /**
   * Scénarios d'une génération (GET /api/v1/generations/:id/scenarios).
   */
  @Get(':id/scenarios')
  @Roles('admin', 'gest', 'rdep', 'dir')
  @ApiOperation({ summary: "Scénarios d'une génération" })
  @ApiResponse({ status: 200, description: 'Liste des scénarios' })
  @ApiResponse({ status: 404, description: 'Génération non trouvée' })
  async scenarios(
    @Param('id') id: string,
  ): Promise<{
    data: { items: GenerationItem[]; statut: GenerationStatut };
    error: null;
    meta: { timestamp: string };
  }> {
    const [generation, scenarios] = await Promise.all([
      this.generationsService.obtenirGeneration(id),
      this.generationsService.listerScenarios(id),
    ]);
    return {
      data: {
        items: scenarios as unknown as GenerationItem[],
        statut: generation.statut as GenerationStatut,
      },
      error: null,
      meta: { timestamp: new Date().toISOString() },
    };
  }

}
