// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type {
  GradeCreate,
  GradeUpdate,
  GradeListFilters,
} from '@takt/contracts';

/**
 * Service de gestion des grades académiques (L1, L2, L3, M1, M2).
 *
 * Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class GradeService {
  private readonly logger = new Logger(GradeService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Crée un grade. Vérifie l’unicité du code (400). */
  async create(donnees: GradeCreate, utilisateurIdCreePar: string) {
    const existant = await this.prisma.grade.findUnique({
      where: { code: donnees.code },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Un grade avec ce code existe déjà',
        { champ: 'code' },
      );
    }

    const grade = await this.prisma.grade.create({
      data: {
        code: donnees.code,
        libelle: donnees.libelle,
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'Grade',
      entiteId: grade.id,
      metadonnees: {
        code: grade.code,
        libelle: grade.libelle,
      },
    });

    this.logger.log(`Grade créé : ${grade.code}`);
    return {
      id: grade.id,
      code: grade.code,
      libelle: grade.libelle,
      createdAt: grade.createdAt,
      updatedAt: grade.updatedAt,
    };
  }

  /** Liste paginée des grades. */
  async list(query: GradeListFilters) {
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
      this.prisma.grade.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.grade.count({ where }),
    ]);

    return {
      items: items.map((g) => ({
        id: g.id,
        code: g.code,
        libelle: g.libelle,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère un grade par son ID. */
  async getOne(id: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
    });
    if (!grade) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Grade introuvable',
      );
    }
    return {
      id: grade.id,
      code: grade.code,
      libelle: grade.libelle,
      createdAt: grade.createdAt,
      updatedAt: grade.updatedAt,
    };
  }

  /** Met à jour un grade. */
  async update(id: string, donnees: GradeUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.grade.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Grade introuvable',
      );
    }

    if (donnees.code !== undefined && donnees.code !== existant.code) {
      const dejaUtilise = await this.prisma.grade.findUnique({
        where: { code: donnees.code },
      });
      if (dejaUtilise) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Ce code est déjà utilisé par un autre grade',
          { champ: 'code' },
        );
      }
    }

    const modifie = await this.prisma.grade.update({
      where: { id },
      data: {
        ...(donnees.code !== undefined && { code: donnees.code }),
        ...(donnees.libelle !== undefined && { libelle: donnees.libelle }),
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'Grade',
      entiteId: id,
      metadonnees: {
        code: modifie.code,
        libelle: modifie.libelle,
      },
    });

    this.logger.log(`Grade modifié : ${modifie.code}`);
    return {
      id: modifie.id,
      code: modifie.code,
      libelle: modifie.libelle,
      createdAt: modifie.createdAt,
      updatedAt: modifie.updatedAt,
    };
  }

  /** Supprime un grade (409 s’il est utilisé par un module). */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.grade.findUnique({
      where: { id },
      include: { modules: { take: 1 } },
    });
    if (!existant) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Grade introuvable',
      );
    }

    if (existant.modules.length > 0) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Impossible de supprimer un grade utilisé par un ou plusieurs modules',
        { modules: existant.modules.length },
      );
    }

    await this.prisma.grade.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'Grade',
      entiteId: id,
      metadonnees: { code: existant.code },
    });

    this.logger.log(`Grade supprimé : ${existant.code}`);
    return { id };
  }
}