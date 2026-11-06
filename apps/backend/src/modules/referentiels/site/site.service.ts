// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type { SiteCreate, SiteUpdate, SiteListFilters } from '@takt/contracts';

/**
 * Service de gestion des sites.
 *
 * Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class SiteService {
  private readonly logger = new Logger(SiteService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Crée un site. Vérifie l’unicité du code (400). */
  async create(donnees: SiteCreate, utilisateurIdCreePar: string) {
    const existant = await this.prisma.site.findUnique({
      where: { code: donnees.code },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Un site avec ce code existe déjà',
        { champ: 'code' },
      );
    }

    const site = await this.prisma.site.create({
      data: {
        code: donnees.code,
        libelle: donnees.libelle,
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'Site',
      entiteId: site.id,
      metadonnees: { code: site.code, libelle: site.libelle },
    });

    this.logger.log(`Site créé : ${site.code}`);
    return {
      id: site.id,
      code: site.code,
      libelle: site.libelle,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    };
  }

  /** Liste paginée des sites. */
  async list(query: SiteListFilters) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    let where: Record<string, unknown> = {};
    if (query.search) {
      where = {
        OR: [
          { code: { contains: query.search, mode: 'insensitive' as const } },
          { libelle: { contains: query.search, mode: 'insensitive' as const } },
        ],
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.site.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.site.count({ where }),
    ]);

    return {
      items: items.map((s) => ({
        id: s.id,
        code: s.code,
        libelle: s.libelle,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère un site par son ID. */
  async getOne(id: string) {
    const site = await this.prisma.site.findUnique({ where: { id } });
    if (!site) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Site introuvable');
    }
    return {
      id: site.id,
      code: site.code,
      libelle: site.libelle,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    };
  }

  /** Met à jour un site. */
  async update(id: string, donnees: SiteUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.site.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Site introuvable');
    }

    if (donnees.code !== undefined && donnees.code !== existant.code) {
      const dejaUtilise = await this.prisma.site.findUnique({
        where: { code: donnees.code },
      });
      if (dejaUtilise) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Ce code est déjà utilisé par un autre site',
          { champ: 'code' },
        );
      }
    }

    const modifie = await this.prisma.site.update({
      where: { id },
      data: {
        ...(donnees.code !== undefined && { code: donnees.code }),
        ...(donnees.libelle !== undefined && { libelle: donnees.libelle }),
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'Site',
      entiteId: id,
      metadonnees: { code: modifie.code, libelle: modifie.libelle },
    });

    this.logger.log(`Site modifié : ${modifie.code}`);
    return {
      id: modifie.id,
      code: modifie.code,
      libelle: modifie.libelle,
      createdAt: modifie.createdAt,
      updatedAt: modifie.updatedAt,
    };
  }

  /** Supprime un site. */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.site.findUnique({
      where: { id },
      include: { salles: { take: 1 } },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Site introuvable');
    }

    if (existant.salles.length > 0) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Impossible de supprimer un site utilisé par une ou plusieurs salles',
        { salles: existant.salles.length },
      );
    }

    await this.prisma.site.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'Site',
      entiteId: id,
      metadonnees: { code: existant.code },
    });

    this.logger.log(`Site supprimé : ${existant.code}`);
    return { id };
  }
}