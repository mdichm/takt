// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Controller,
  Get,
  Inject,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  zAuditFiltres,
  zSecurityEventFiltres,
  type AuditFiltres,
  type AuditEntree,
  type SecurityEventFiltres,
  type SecurityEventEntree,
} from '@takt/contracts';
import { ZodValidation } from '../../common/pipes/zod-validation.decorator';
import { AuditReadService } from './audit-read.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DonneesPaginees } from '../../common/http/api-envelope';

/**
 * Contrôleur de lecture du journal d'audit et des événements de sécurité (TAKT-L11-01).
 *
 * Endpoints :
 *   GET /audit          — liste paginée des entrées d'audit (filtres, tri, pagination)
 *   GET /audit/export   — export CSV (filtres identiques, téléchargement direct)
 *   GET /security       — liste paginée des événements de sécurité
 *
 * Tous les endpoints sont protégés par JwtAuthGuard + RolesGuard (role 'admin' uniquement, EX-DAT-05).
 * L'écriture (JournalAudit.record, SecurityEvent.insert) est du ressort de TAKT-L03-06 / TAKT-L10-06.
 */
@ApiTags('Journal d\'audit et sécurité')
@ApiBearerAuth()
@Controller('audit')
export class AuditReadController {
  constructor(@Inject(AuditReadService) private readonly auditReadService: AuditReadService) {}

  /** Liste paginée des entrées d'audit (GET /api/v1/audit). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zAuditFiltres })
  @ApiOperation({ summary: 'Liste paginée du journal d\'audit' })
  @ApiResponse({ status: 200, description: 'Entrées d\'audit paginées' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit (réservé aux administrateurs)' })
  async lister(@Query() filtres: AuditFiltres): Promise<DonneesPaginees<AuditEntree>> {
    const { data, total } = await this.auditReadService.lister(filtres);
    const page = filtres.page ?? 1;
    const pageSize = Math.min(filtres.pageSize ?? 20, 200);

    return { data, meta: { page, pageSize, total } };
  }

  /** Export CSV des entrées d'audit (GET /api/v1/audit/export). */
  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zAuditFiltres })
  @ApiOperation({ summary: 'Export CSV du journal d\'audit' })
  @ApiResponse({ status: 200, description: 'Fichier CSV téléchargeable' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit (réservé aux administrateurs)' })
  async exporter(
    @Query() filtres: AuditFiltres,
    // any-justify: réponse HTTP Express non typée (nestjs sans @types/express)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Res() res: any,
  ): Promise<void> {
    const { csv, nbLignes, periodeFrom, periodeTo } = await this.auditReadService.exporterCsv(filtres);

    const nomFichier = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
    res.setHeader('X-Audit-Lignes', String(nbLignes));
    res.setHeader('X-Audit-Periode-From', periodeFrom ?? '');
    res.setHeader('X-Audit-Periode-To', periodeTo ?? '');

    // BOM UTF-8 pour ouverture correcte dans Excel
    res.write('\uFEFF');
    res.write(csv);
    res.end();
  }

  /** Liste paginée des événements de sécurité (GET /api/v1/security). */
  @Get('security')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zSecurityEventFiltres })
  @ApiOperation({ summary: 'Liste paginée des événements de sécurité' })
  @ApiResponse({ status: 200, description: 'Événements de sécurité paginés' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit (réservé aux administrateurs)' })
  async listerSecurite(
    @Query() filtres: SecurityEventFiltres,
  ): Promise<DonneesPaginees<SecurityEventEntree>> {
    const { data, total } = await this.auditReadService.listerSecurite(filtres);
    const page = filtres.page ?? 1;
    const pageSize = Math.min(filtres.pageSize ?? 20, 200);

    return { data, meta: { page, pageSize, total } };
  }
}
