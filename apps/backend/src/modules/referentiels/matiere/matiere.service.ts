// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type { MatiereCreate, MatiereUpdate, MatiereListFilters } from '@takt/contracts';

/**
 * Service de gestion des matières.
 *
 * Une matière est liée à un module. Sa suppression est protégée (409) si elle est
 * référencée par une entité dépendante. Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class MatiereService {
  private readonly logger = new Logger(MatiereService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Crée une matière. Vérifie l’unicité du code et l’existence du module. */
  async create(donnees: MatiereCreate, utilisateurIdCreePar: string) {
    const moduleExiste = await this.prisma.module.findUnique({
      where: { id: donnees.moduleId },
    });
    if (!moduleExiste) {
      throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Le module associé n’existe pas', {
        champ: 'moduleId',
      });
    }

    const existant = await this.prisma.matiere.findUnique({
      where: { code: donnees.code },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Une matière avec ce code existe déjà',
        { champ: 'code' },
      );
    }

    const matiere = await this.prisma.matiere.create({
      data: {
        code: donnees.code,
        libelle: donnees.libelle,
        moduleId: donnees.moduleId,
      },
      include: {
        module: { select: { code: true, libelle: true } },
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'Matiere',
      entiteId: matiere.id,
      metadonnees: {
        code: matiere.code,
        libelle: matiere.libelle,
        moduleId: matiere.moduleId,
      },
    });

    this.logger.log(`Matière créée : ${matiere.code}`);
    return {
      id: matiere.id,
      code: matiere.code,
      libelle: matiere.libelle,
      moduleId: matiere.moduleId,
      module: matiere.module,
      createdAt: matiere.createdAt,
      updatedAt: matiere.updatedAt,
    };
  }

  /** Liste paginée des matières. */
  async list(query: MatiereListFilters) {
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
    if (query.moduleId) {
      where = { ...where, moduleId: query.moduleId };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.matiere.findMany({
        where,
        include: {
          module: { select: { code: true, libelle: true } },
        },
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.matiere.count({ where }),
    ]);

    return {
      items: items.map((m) => ({
        id: m.id,
        code: m.code,
        libelle: m.libelle,
        moduleId: m.moduleId,
        module: m.module,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère une matière par son ID. */
  async getOne(id: string) {
    const matiere = await this.prisma.matiere.findUnique({
      where: { id },
      include: {
        module: { select: { code: true, libelle: true } },
      },
    });
    if (!matiere) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Matière introuvable');
    }
    return {
      id: matiere.id,
      code: matiere.code,
      libelle: matiere.libelle,
      moduleId: matiere.moduleId,
      module: matiere.module,
      createdAt: matiere.createdAt,
      updatedAt: matiere.updatedAt,
    };
  }

  /** Met à jour une matière. */
  async update(id: string, donnees: MatiereUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.matiere.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Matière introuvable');
    }

    if (donnees.code !== undefined && donnees.code !== existant.code) {
      const dejaUtilise = await this.prisma.matiere.findUnique({
        where: { code: donnees.code },
      });
      if (dejaUtilise) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Ce code est déjà utilisé par une autre matière',
          { champ: 'code' },
        );
      }
    }

    if (donnees.moduleId !== undefined) {
      const moduleExiste = await this.prisma.module.findUnique({
        where: { id: donnees.moduleId },
      });
      if (!moduleExiste) {
        throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Le module associé n’existe pas', {
          champ: 'moduleId',
        });
      }
    }

    const modifie = await this.prisma.matiere.update({
      where: { id },
      data: {
        ...(donnees.code !== undefined && { code: donnees.code }),
        ...(donnees.libelle !== undefined && { libelle: donnees.libelle }),
        ...(donnees.moduleId !== undefined && { moduleId: donnees.moduleId }),
      },
      include: {
        module: { select: { code: true, libelle: true } },
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'Matiere',
      entiteId: id,
      metadonnees: {
        code: modifie.code,
        libelle: modifie.libelle,
        moduleId: modifie.moduleId,
      },
    });

    this.logger.log(`Matière modifiée : ${modifie.code}`);
    return {
      id: modifie.id,
      code: modifie.code,
      libelle: modifie.libelle,
      moduleId: modifie.moduleId,
      module: modifie.module,
      createdAt: modifie.createdAt,
      updatedAt: modifie.updatedAt,
    };
  }

  /** Supprime une matière (409 si référencée par une entité dépendante). */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.matiere.findUnique({
      where: { id },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Matière introuvable');
    }

    const nbAffectations = await this.prisma.affectationPedagogique.count({
      where: { matiereId: id },
    });
    if (nbAffectations > 0) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Impossible de supprimer une matière utilisée par une affectation pédagogique',
        { affectations: nbAffectations },
      );
    }

    await this.prisma.matiere.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'Matiere',
      entiteId: id,
      metadonnees: { code: existant.code },
    });

    this.logger.log(`Matière supprimée : ${existant.code}`);
    return { id };
  }
}
