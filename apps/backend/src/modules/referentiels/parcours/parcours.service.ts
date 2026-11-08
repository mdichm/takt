// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type { ParcoursCreate, ParcoursUpdate, ParcoursListFilters } from '@takt/contracts';

/**
 * Service de gestion des parcours.
 *
 * Chaque parcours appartient à un département parent.
 * Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class ParcoursService {
  private readonly logger = new Logger(ParcoursService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Crée un parcours. Vérifie que le département parent existe (400). */
  async create(donnees: ParcoursCreate, utilisateurIdCreePar: string) {
    const departement = await this.prisma.departement.findUnique({
      where: { id: donnees.departementId },
    });
    if (!departement) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Le département parent est introuvable',
        { champ: 'departementId' },
      );
    }

    const existant = await this.prisma.parcours.findUnique({
      where: { code: donnees.code },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Un parcours avec ce code existe déjà',
        { champ: 'code' },
      );
    }

    const parcours = await this.prisma.parcours.create({
      data: {
        code: donnees.code,
        libelle: donnees.libelle,
        departementId: donnees.departementId,
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'Parcours',
      entiteId: parcours.id,
      metadonnees: {
        code: parcours.code,
        libelle: parcours.libelle,
        departementId: parcours.departementId,
      },
    });

    this.logger.log(`Parcours créé : ${parcours.code}`);
    return {
      id: parcours.id,
      code: parcours.code,
      libelle: parcours.libelle,
      departementId: parcours.departementId,
      createdAt: parcours.createdAt,
      updatedAt: parcours.updatedAt,
    };
  }

  /** Liste paginée des parcours. */
  async list(query: ParcoursListFilters) {
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
    if (query.departementId) {
      where = { ...where, departementId: query.departementId };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.parcours.findMany({
        where,
        include: { departement: { select: { code: true, libelle: true } } },
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.parcours.count({ where }),
    ]);

    return {
      data: items.map((p) => ({
        id: p.id,
        code: p.code,
        libelle: p.libelle,
        departementId: p.departementId,
        departement: p.departement,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère un parcours par son ID (404 si introuvable). */
  async getOne(id: string) {
    const parcours = await this.prisma.parcours.findUnique({
      where: { id },
      include: { departement: { select: { code: true, libelle: true } } },
    });
    if (!parcours) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Parcours introuvable');
    }
    return {
      id: parcours.id,
      code: parcours.code,
      libelle: parcours.libelle,
      departementId: parcours.departementId,
      departement: parcours.departement,
      createdAt: parcours.createdAt,
      updatedAt: parcours.updatedAt,
    };
  }

  /** Met à jour un parcours (404 si introuvable, 400 si code déjà utilisé). */
  async update(id: string, donnees: ParcoursUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.parcours.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Parcours introuvable');
    }

    if (donnees.code !== undefined && donnees.code !== existant.code) {
      const dejaUtilise = await this.prisma.parcours.findUnique({
        where: { code: donnees.code },
      });
      if (dejaUtilise) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Ce code est déjà utilisé par un autre parcours',
          { champ: 'code' },
        );
      }
    }

    if (donnees.departementId !== undefined) {
      const departement = await this.prisma.departement.findUnique({
        where: { id: donnees.departementId },
      });
      if (!departement) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Le département parent est introuvable',
          { champ: 'departementId' },
        );
      }
    }

    const modifie = await this.prisma.parcours.update({
      where: { id },
      data: {
        ...(donnees.code !== undefined && { code: donnees.code }),
        ...(donnees.libelle !== undefined && { libelle: donnees.libelle }),
        ...(donnees.departementId !== undefined && {
          departementId: donnees.departementId,
        }),
      },
      include: { departement: { select: { code: true, libelle: true } } },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'Parcours',
      entiteId: id,
      metadonnees: {
        code: modifie.code,
        libelle: modifie.libelle,
        departementId: modifie.departementId,
      },
    });

    this.logger.log(`Parcours modifié : ${modifie.code}`);
    return {
      id: modifie.id,
      code: modifie.code,
      libelle: modifie.libelle,
      departementId: modifie.departementId,
      departement: modifie.departement,
      createdAt: modifie.createdAt,
      updatedAt: modifie.updatedAt,
    };
  }

  /** Supprime un parcours (404 si introuvable, 409 s'il a des niveaux). */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.parcours.findUnique({
      where: { id },
      include: { niveaux: true },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Parcours introuvable');
    }

    if (existant.niveaux.length > 0) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Impossible de supprimer un parcours ayant des niveaux associés',
        { enfants: existant.niveaux.length },
      );
    }

    await this.prisma.parcours.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'Parcours',
      entiteId: id,
      metadonnees: { code: existant.code },
    });

    this.logger.log(`Parcours supprimé : ${existant.code}`);
    return { id };
  }
}
