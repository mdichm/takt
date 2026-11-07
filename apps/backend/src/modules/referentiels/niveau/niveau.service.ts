// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type {
  NiveauCreate,
  NiveauUpdate,
  NiveauListFilters,
} from '@takt/contracts';

/**
 * Service de gestion des niveaux.
 *
 * Chaque niveau appartient à un parcours parent.
 * Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class NiveauService {
  private readonly logger = new Logger(NiveauService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Crée un niveau. Vérifie que le parcours parent existe (400). */
  async create(donnees: NiveauCreate, utilisateurIdCreePar: string) {
    const parcours = await this.prisma.parcours.findUnique({
      where: { id: donnees.parcoursId },
    });
    if (!parcours) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Le parcours parent est introuvable',
        { champ: 'parcoursId' },
      );
    }

    const existant = await this.prisma.niveau.findUnique({
      where: { code: donnees.code },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Un niveau avec ce code existe déjà',
        { champ: 'code' },
      );
    }

    const niveau = await this.prisma.niveau.create({
      data: {
        code: donnees.code,
        libelle: donnees.libelle,
        parcoursId: donnees.parcoursId,
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'Niveau',
      entiteId: niveau.id,
      metadonnees: {
        code: niveau.code,
        libelle: niveau.libelle,
        parcoursId: niveau.parcoursId,
      },
    });

    this.logger.log(`Niveau créé : ${niveau.code}`);
    return {
      id: niveau.id,
      code: niveau.code,
      libelle: niveau.libelle,
      parcoursId: niveau.parcoursId,
      createdAt: niveau.createdAt,
      updatedAt: niveau.updatedAt,
    };
  }

  /** Liste paginée des niveaux. */
  async list(query: NiveauListFilters) {
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
    if (query.parcoursId) {
      where = { ...where, parcoursId: query.parcoursId };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.niveau.findMany({
        where,
        include: { parcours: { select: { code: true, libelle: true } } },
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.niveau.count({ where }),
    ]);

    return {
      data: items.map((n) => ({
        id: n.id,
        code: n.code,
        libelle: n.libelle,
        parcoursId: n.parcoursId,
        parcours: n.parcours,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère un niveau par son ID (404 si introuvable). */
  async getOne(id: string) {
    const niveau = await this.prisma.niveau.findUnique({
      where: { id },
      include: { parcours: { select: { code: true, libelle: true } } },
    });
    if (!niveau) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Niveau introuvable');
    }
    return {
      id: niveau.id,
      code: niveau.code,
      libelle: niveau.libelle,
      parcoursId: niveau.parcoursId,
      parcours: niveau.parcours,
      createdAt: niveau.createdAt,
      updatedAt: niveau.updatedAt,
    };
  }

  /** Met à jour un niveau (404 si introuvable, 400 si code déjà utilisé). */
  async update(id: string, donnees: NiveauUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.niveau.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Niveau introuvable');
    }

    if (donnees.code !== undefined && donnees.code !== existant.code) {
      const dejaUtilise = await this.prisma.niveau.findUnique({
        where: { code: donnees.code },
      });
      if (dejaUtilise) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Ce code est déjà utilisé par un autre niveau',
          { champ: 'code' },
        );
      }
    }

    if (donnees.parcoursId !== undefined) {
      const parcours = await this.prisma.parcours.findUnique({
        where: { id: donnees.parcoursId },
      });
      if (!parcours) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Le parcours parent est introuvable',
          { champ: 'parcoursId' },
        );
      }
    }

    const modifie = await this.prisma.niveau.update({
      where: { id },
      data: {
        ...(donnees.code !== undefined && { code: donnees.code }),
        ...(donnees.libelle !== undefined && { libelle: donnees.libelle }),
        ...(donnees.parcoursId !== undefined && { parcoursId: donnees.parcoursId }),
      },
      include: { parcours: { select: { code: true, libelle: true } } },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'Niveau',
      entiteId: id,
      metadonnees: {
        code: modifie.code,
        libelle: modifie.libelle,
        parcoursId: modifie.parcoursId,
      },
    });

    this.logger.log(`Niveau modifié : ${modifie.code}`);
    return {
      id: modifie.id,
      code: modifie.code,
      libelle: modifie.libelle,
      parcoursId: modifie.parcoursId,
      parcours: modifie.parcours,
      createdAt: modifie.createdAt,
      updatedAt: modifie.updatedAt,
    };
  }

  /** Supprime un niveau (404 si introuvable, 409 s'il a des groupes). */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.niveau.findUnique({
      where: { id },
      include: { groupes: true },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Niveau introuvable');
    }

    if (existant.groupes.length > 0) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Impossible de supprimer un niveau ayant des groupes associés',
        { enfants: existant.groupes.length },
      );
    }

    await this.prisma.niveau.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'Niveau',
      entiteId: id,
      metadonnees: { code: existant.code },
    });

    this.logger.log(`Niveau supprimé : ${existant.code}`);
    return { id };
  }
}