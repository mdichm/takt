// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type { TypeSalleCreate, TypeSalleUpdate, TypeSalleListFilters } from '@takt/contracts';

/**
 * Service de gestion des types de salle.
 *
 * Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class TypeSalleService {
  private readonly logger = new Logger(TypeSalleService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Crée un type de salle. Vérifie l’unicité du code (400). */
  async create(donnees: TypeSalleCreate, utilisateurIdCreePar: string) {
    const existant = await this.prisma.typeSalle.findUnique({
      where: { code: donnees.code },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Un type de salle avec ce code existe déjà',
        { champ: 'code' },
      );
    }

    const typeSalle = await this.prisma.typeSalle.create({
      data: {
        code: donnees.code,
        libelle: donnees.libelle,
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'TypeSalle',
      entiteId: typeSalle.id,
      metadonnees: { code: typeSalle.code, libelle: typeSalle.libelle },
    });

    this.logger.log(`Type de salle créé : ${typeSalle.code}`);
    return {
      id: typeSalle.id,
      code: typeSalle.code,
      libelle: typeSalle.libelle,
      createdAt: typeSalle.createdAt,
      updatedAt: typeSalle.updatedAt,
    };
  }

  /** Liste paginée des types de salle. */
  async list(query: TypeSalleListFilters) {
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
      this.prisma.typeSalle.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.typeSalle.count({ where }),
    ]);

    return {
      items: items.map((t) => ({
        id: t.id,
        code: t.code,
        libelle: t.libelle,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère un type de salle par son ID. */
  async getOne(id: string) {
    const typeSalle = await this.prisma.typeSalle.findUnique({ where: { id } });
    if (!typeSalle) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Type de salle introuvable');
    }
    return {
      id: typeSalle.id,
      code: typeSalle.code,
      libelle: typeSalle.libelle,
      createdAt: typeSalle.createdAt,
      updatedAt: typeSalle.updatedAt,
    };
  }

  /** Met à jour un type de salle. */
  async update(id: string, donnees: TypeSalleUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.typeSalle.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Type de salle introuvable');
    }

    if (donnees.code !== undefined && donnees.code !== existant.code) {
      const dejaUtilise = await this.prisma.typeSalle.findUnique({
        where: { code: donnees.code },
      });
      if (dejaUtilise) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Ce code est déjà utilisé par un autre type de salle',
          { champ: 'code' },
        );
      }
    }

    const modifie = await this.prisma.typeSalle.update({
      where: { id },
      data: {
        ...(donnees.code !== undefined && { code: donnees.code }),
        ...(donnees.libelle !== undefined && { libelle: donnees.libelle }),
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'TypeSalle',
      entiteId: id,
      metadonnees: { code: modifie.code, libelle: modifie.libelle },
    });

    this.logger.log(`Type de salle modifié : ${modifie.code}`);
    return {
      id: modifie.id,
      code: modifie.code,
      libelle: modifie.libelle,
      createdAt: modifie.createdAt,
      updatedAt: modifie.updatedAt,
    };
  }

  /** Supprime un type de salle (409 s'il est utilisé par des salles). */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.typeSalle.findUnique({
      where: { id },
      include: { salles: { take: 1 } },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Type de salle introuvable');
    }

    if (existant.salles.length > 0) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Impossible de supprimer un type de salle utilisé par une ou plusieurs salles',
        { salles: existant.salles.length },
      );
    }

    await this.prisma.typeSalle.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'TypeSalle',
      entiteId: id,
      metadonnees: { code: existant.code },
    });

    this.logger.log(`Type de salle supprimé : ${existant.code}`);
    return { id };
  }
}