// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { Prisma, PrismaClient } from '@takt/db';
import { AuditEntree, AuditFiltres, SecurityEventEntree, SecurityEventFiltres } from '@takt/contracts';

/**
 * Service de lecture du journal d'audit et des événements de sécurité (TAKT-L11-01).
 *
 * Lecture seule : aucun endpoint de modification n'est exposé (le journal est immuable, GG-07).
 * L'accès est réservé au rôle 'admin' (EX-DAT-05) — le guard RolesGuard est appliqué au controller.
 *
 * Rétention : les entrées âgées de plus de 3 ans ne sont jamais retournées (EX-DAT-05, conservation 3/5 ans).
 */
@Injectable()
export class AuditReadService {
  private readonly logger = new Logger(AuditReadService.name);

  // Seuil de rétention : 3 ans (EX-DAT-05)
  private readonly RETENTION_DAYS = 3 * 365;

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /**
   * Construit le filtre WHERE pour les entrées d'audit à partir des filtres API.
   */
  private construireWhereAudit(filtres: AuditFiltres): Prisma.JournalAuditWhereInput {
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - this.RETENTION_DAYS);

    const where: Prisma.JournalAuditWhereInput = {
      horodatage: { gte: dateLimite },
    };

    if (filtres.action) {
      where.action = { equals: filtres.action };
    }
    if (filtres.entite) {
      where.entite = { contains: filtres.entite, mode: 'insensitive' as Prisma.QueryMode };
    }
    if (filtres.entiteId) {
      where.entiteId = { contains: filtres.entiteId, mode: 'insensitive' as Prisma.QueryMode };
    }
    if (filtres.utilisateurId) {
      where.utilisateurId = filtres.utilisateurId;
    }
    if (filtres.dateFrom || filtres.dateTo) {
      where.horodatage = {
        ...(where.horodatage as { gte: Date }),
        ...(filtres.dateFrom ? { gte: new Date(filtres.dateFrom) } : {}),
        ...(filtres.dateTo ? { lte: new Date(filtres.dateTo) } : {}),
      };
    }

    return where;
  }

  /**
   * Liste paginée des entrées d'audit avec filtres.
   * Joint Utilisateur pour récupérer l'email (affichage).
   */
  async lister(filtres: AuditFiltres): Promise<{ data: AuditEntree[]; total: number }> {
    const where = this.construireWhereAudit(filtres);
    const page = filtres.page ?? 1;
    const pageSize = Math.min(filtres.pageSize ?? 20, 200);
    const skip = (page - 1) * pageSize;

    const [entries, total] = await this.prisma.$transaction([
      this.prisma.journalAudit.findMany({
        where,
        orderBy: { horodatage: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          action: true,
          horodatage: true,
          utilisateurId: true,
          entite: true,
          entiteId: true,
          metadonnees: true,
          utilisateur: {
            select: { email: true },
          },
        },
      }),
      this.prisma.journalAudit.count({ where }),
    ]);

    return {
      data: entries.map((e) => ({
        id: e.id,
        action: e.action,
        horodatage: e.horodatage.toISOString(),
        utilisateurId: e.utilisateurId,
        utilisateurEmail: e.utilisateur?.email ?? null,
        entite: e.entite,
        entiteId: e.entiteId,
        metadonnees: e.metadonnees,
      })),
      total,
    };
  }

  /**
   * Export CSV des entrées d'audit.
   * Lecture par lots de 1 000 pour garantir < 5 s sur 10 000 lignes (critère L11-01).
   * Retourne { lignes CSV, nbLignes, periodeFrom, periodeTo }.
   */
  async exporterCsv(filtres: AuditFiltres): Promise<{
    csv: string;
    nbLignes: number;
    periodeFrom: Date | null;
    periodeTo: Date | null;
  }> {
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - this.RETENTION_DAYS);

    const where: Prisma.JournalAuditWhereInput = {
      horodatage: { gte: dateLimite },
      ...(filtres.action ? { action: filtres.action } : {}),
      ...(filtres.entite ? { entite: filtres.entite } : {}),
      ...(filtres.entiteId ? { entiteId: filtres.entiteId } : {}),
      ...(filtres.utilisateurId ? { utilisateurId: filtres.utilisateurId } : {}),
      ...(filtres.dateFrom || filtres.dateTo
        ? {
            horodatage: {
              ...(filtres.dateFrom ? { gte: new Date(filtres.dateFrom) } : {}),
              ...(filtres.dateTo ? { lte: new Date(filtres.dateTo) } : {}),
            },
          }
        : {}),
    };

    const periode = await this.prisma.journalAudit.aggregate({
      where,
      _min: { horodatage: true },
      _max: { horodatage: true },
    });

    const lignes: string[] = [];
    const EN_TETE = 'id;action;horodatage;utilisateurId;utilisateurEmail;entite;entiteId;metadonnees';
    lignes.push(EN_TETE);

    const BATCH = 1000;
    let skip = 0;
    let nbLignes = 0;
    let hasMore = true;

    while (hasMore) {
      const entries = await this.prisma.journalAudit.findMany({
        where,
        orderBy: { horodatage: 'asc' },
        skip,
        take: BATCH,
        select: {
          id: true,
          action: true,
          horodatage: true,
          utilisateurId: true,
          entite: true,
          entiteId: true,
          metadonnees: true,
          utilisateur: { select: { email: true } },
        },
      });

      for (const e of entries) {
        lignes.push(this.echapperCsv(e.id));
        lignes.push(';');
        lignes.push(this.echapperCsv(e.action));
        lignes.push(';');
        lignes.push(this.echapperCsv(e.horodatage.toISOString()));
        lignes.push(';');
        lignes.push(this.echapperCsv(e.utilisateurId ?? ''));
        lignes.push(';');
        lignes.push(this.echapperCsv(e.utilisateur?.email ?? ''));
        lignes.push(';');
        lignes.push(this.echapperCsv(e.entite));
        lignes.push(';');
        lignes.push(this.echapperCsv(e.entiteId ?? ''));
        lignes.push(';');
        lignes.push(this.echapperCsv(JSON.stringify(e.metadonnees ?? {})));
        lignes.push('\n');
        nbLignes++;
      }

      skip += entries.length;
      hasMore = entries.length === BATCH;
    }

    return {
      csv: lignes.join(''),
      nbLignes,
      periodeFrom: periode._min.horodatage ?? null,
      periodeTo: periode._max.horodatage ?? null,
    };
  }

  /**
   * Liste paginée des événements de sécurité (table SecurityEvent, L11-01).
   * L'écriture des événements est du ressort de TAKT-L10-06 ; ce service ne fait que lire.
   */
  async listerSecurite(filtres: SecurityEventFiltres): Promise<{ data: SecurityEventEntree[]; total: number }> {
    const where: Prisma.SecurityEventWhereInput = {};

    if (filtres.type) {
      where.type = { contains: filtres.type, mode: 'insensitive' as Prisma.QueryMode };
    }
    if (filtres.utilisateurId) {
      where.utilisateurId = filtres.utilisateurId;
    }
    if (filtres.dateFrom || filtres.dateTo) {
      where.createdAt = {
        ...(filtres.dateFrom ? { gte: new Date(filtres.dateFrom) } : {}),
        ...(filtres.dateTo ? { lte: new Date(filtres.dateTo) } : {}),
      };
    }

    const page = filtres.page ?? 1;
    const pageSize = Math.min(filtres.pageSize ?? 20, 200);
    const skip = (page - 1) * pageSize;

    const [events, total] = await this.prisma.$transaction([
      this.prisma.securityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          type: true,
          createdAt: true,
          utilisateurId: true,
          ip: true,
          userAgent: true,
          details: true,
        },
      }),
      this.prisma.securityEvent.count({ where }),
    ]);

    return {
      data: events.map((e) => ({
        id: e.id,
        type: e.type,
        createdAt: e.createdAt.toISOString(),
        utilisateurId: e.utilisateurId,
        ip: e.ip,
        userAgent: e.userAgent,
        details: e.details,
      })),
      total,
    };
  }

  /**
   * Échappe une valeur pour le CSV RFC 4180 (séparateur ;) :
   * les guillemets sont doublés, la valeur est entourée de guillemets si elle
   * contient un séparateur, un guillemet ou un saut de ligne.
   */
  private echapperCsv(valeur: string): string {
    if (/[;"\n\r]/.test(valeur)) {
      return `"${valeur.replace(/"/g, '""')}"`;
    }
    return valeur;
  }
}