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
  zApercuImportArchiveParams,
  zImportArchiveConfirme,
  type ApercuImportArchiveParams,
  type ImportArchiveApercu,
  type ImportArchiveConfirme,
  type RapportImportArchive,
  type TypeImportArchive,
} from '@takt/contracts';
import { ZodValidation } from '../../../common/pipes/zod-validation.decorator';
import { ArchiveImportService } from './archive.service';
import { JwtAuthGuard, UtilisateurConnecte } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

interface RequeteAvecUtilisateur {
  headers: Record<string, string | string[] | undefined>;
  user?: UtilisateurConnecte;
}

const TYPES_IMPORTABLES_ARCHIVE: readonly { type: TypeImportArchive; libelle: string }[] = [
  { type: 'parcours', libelle: 'Parcours' },
  { type: 'groupe', libelle: 'Groupe' },
  { type: 'matiere', libelle: 'Matière' },
  { type: 'module', libelle: 'Module' },
  { type: 'salle', libelle: 'Salle' },
];

@ApiTags('Import archive')
@ApiBearerAuth()
@Controller('referentiels/import/archive')
export class ArchiveImportController {
  constructor(@Inject(ArchiveImportService) private readonly service: ArchiveImportService) {}

  /** Liste les années universitaires clôturées disponibles en tant que source. */
  @Get('annees-source')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liste les années universitaires clôturées disponibles en source' })
  @ApiResponse({ status: 200, description: 'Liste des années clôturées' })
  async listerAnneesSource(): Promise<{ id: string; libelle: string }[]> {
    return this.service.listerAnneesSource();
  }

  /** Liste les types de référentiels importables depuis une année clôturée. */
  @Get('types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Types de référentiels importables depuis une année clôturée',
  })
  @ApiResponse({ status: 200, description: 'Liste des types importables' })
  listerTypes(): typeof TYPES_IMPORTABLES_ARCHIVE {
    return TYPES_IMPORTABLES_ARCHIVE;
  }

  /** Aperçu d’import sélectif depuis une année clôturée (TE-MET-10). */
  @Post('apercu')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ body: zApercuImportArchiveParams })
  @ApiOperation({ summary: 'Aperçu d’import sélectif depuis une année clôturée' })
  @ApiResponse({ status: 200, description: 'Aperçu de l’import d’archive' })
  async apercu(@Body() params: ApercuImportArchiveParams): Promise<ImportArchiveApercu> {
    return this.service.apercu(params);
  }

  /** Exécute un import sélectif depuis une année clôturée (empreinte de contrôle). */
  @Post('executer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ body: zImportArchiveConfirme })
  @ApiOperation({ summary: 'Exécute un import sélectif depuis une année clôturée' })
  @ApiResponse({ status: 200, description: 'Rapport d’import d’archive' })
  async executer(
    @Body() dto: ImportArchiveConfirme,
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<RapportImportArchive> {
    return this.service.executer(dto, req.user!.sub);
  }
}
