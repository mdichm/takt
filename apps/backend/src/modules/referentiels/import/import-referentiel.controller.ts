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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ImportReferentielCsv,
  ImportReferentielCsvConfirme,
  zImportReferentielCsv,
  zImportReferentielCsvConfirme,
  ApercuImport,
  RapportImport,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { ImportReferentielService } from './import-referentiel.service';
import { LISTE_ADAPTATEURS } from './import-adaptateurs';
import { JwtAuthGuard, UtilisateurConnecte } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

interface RequeteAvecUtilisateur {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  user?: UtilisateurConnecte;
}

@ApiTags('Import référentiels')
@ApiBearerAuth()
@Controller('referentiels/import')
export class ImportReferentielController {
  constructor(
    @Inject(ImportReferentielService) private readonly importService: ImportReferentielService,
  ) {}

  /** Liste les types de référentiels importables par CSV. */
  @Get('types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Types de référentiels importables par CSV' })
  @ApiResponse({ status: 200, description: 'Liste des types importables' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async listerTypes(): Promise<typeof LISTE_ADAPTATEURS> {
    return LISTE_ADAPTATEURS;
  }

  /** Aperçu d’un import CSV avant confirmation (TE-MET-10). */
  @Post('apercu')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ body: zImportReferentielCsv })
  @ApiOperation({ summary: 'Aperçu d’import CSV avant confirmation' })
  @ApiResponse({ status: 200, description: 'Aperçu de l’import' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async apercu(@Body() corps: ImportReferentielCsv): Promise<ApercuImport> {
    return this.importService.apercu(corps);
  }

  /** Exécute un import CSV après aperçu (empreinte de contrôle). */
  @Post('executer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ body: zImportReferentielCsvConfirme })
  @ApiOperation({ summary: 'Exécute un import CSV après aperçu' })
  @ApiResponse({ status: 200, description: 'Rapport d’import ligne à ligne' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 409, description: 'Conflit (fichier modifié depuis l’aperçu)' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async executer(
    @Body() corps: ImportReferentielCsvConfirme,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<RapportImport> {
    return this.importService.executer(corps, req.user!.sub);
  }
}
