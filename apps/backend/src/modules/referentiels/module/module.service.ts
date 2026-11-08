// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type { ModuleCreate, ModuleUpdate, ModuleListFilters } from '@takt/contracts';

/**
 * Service de gestion des modules pédagogiques.
 *
 * Un module est lié à un type d’enseignement et un grade. Le couple
 * (gradeId, typeEnseignementId) doit exister dans la matrice GradeTypeEnseignement.
 * Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class ModuleService {
  private readonly logger = new Logger(ModuleService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Crée un module. Vérifie l’unicité du code et l’existence du couple (grade, type). */
  async create(donnees: ModuleCreate, utilisateurIdCreePar: string) {
    const coupleExiste = await this.prisma.gradeTypeEnseignement.findUnique({
      where: {
        gradeId_typeEnseignementId: {
          gradeId: donnees.gradeId,
          typeEnseignementId: donnees.typeEnseignementId,
        },
      },
    });
    if (!coupleExiste) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Le couple (grade, type d’enseignement) n’existe pas dans la matrice type × grade',
        { champ: 'gradeId_typeEnseignementId' },
      );
    }

    const existant = await this.prisma.module.findUnique({
      where: { code: donnees.code },
    });
    if (existant) {
      throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Un module avec ce code existe déjà', {
        champ: 'code',
      });
    }

    const module = await this.prisma.module.create({
      data: {
        code: donnees.code,
        libelle: donnees.libelle,
        typeEnseignementId: donnees.typeEnseignementId,
        gradeId: donnees.gradeId,
      },
      include: {
        typeEnseignement: { select: { code: true, libelle: true, couleur: true } },
        grade: { select: { code: true, libelle: true } },
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'Module',
      entiteId: module.id,
      metadonnees: {
        code: module.code,
        libelle: module.libelle,
        typeEnseignementId: module.typeEnseignementId,
        gradeId: module.gradeId,
      },
    });

    this.logger.log(`Module créé : ${module.code}`);
    return {
      id: module.id,
      code: module.code,
      libelle: module.libelle,
      typeEnseignementId: module.typeEnseignementId,
      gradeId: module.gradeId,
      typeEnseignement: module.typeEnseignement,
      grade: module.grade,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
    };
  }

  /** Liste paginée des modules. */
  async list(query: ModuleListFilters) {
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
    if (query.typeEnseignementId) {
      where = { ...where, typeEnseignementId: query.typeEnseignementId };
    }
    if (query.gradeId) {
      where = { ...where, gradeId: query.gradeId };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.module.findMany({
        where,
        include: {
          typeEnseignement: { select: { code: true, libelle: true, couleur: true } },
          grade: { select: { code: true, libelle: true } },
        },
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.module.count({ where }),
    ]);

    return {
      items: items.map((m) => ({
        id: m.id,
        code: m.code,
        libelle: m.libelle,
        typeEnseignementId: m.typeEnseignementId,
        gradeId: m.gradeId,
        typeEnseignement: m.typeEnseignement,
        grade: m.grade,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère un module par son ID. */
  async getOne(id: string) {
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        typeEnseignement: { select: { code: true, libelle: true, couleur: true } },
        grade: { select: { code: true, libelle: true } },
      },
    });
    if (!module) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Module introuvable');
    }
    return {
      id: module.id,
      code: module.code,
      libelle: module.libelle,
      typeEnseignementId: module.typeEnseignementId,
      gradeId: module.gradeId,
      typeEnseignement: module.typeEnseignement,
      grade: module.grade,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
    };
  }

  /** Met à jour un module. */
  async update(id: string, donnees: ModuleUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.module.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Module introuvable');
    }

    if (donnees.code !== undefined && donnees.code !== existant.code) {
      const dejaUtilise = await this.prisma.module.findUnique({
        where: { code: donnees.code },
      });
      if (dejaUtilise) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Ce code est déjà utilisé par un autre module',
          { champ: 'code' },
        );
      }
    }

    if (donnees.typeEnseignementId !== undefined || donnees.gradeId !== undefined) {
      const typeEnseignementId = donnees.typeEnseignementId ?? existant.typeEnseignementId;
      const gradeId = donnees.gradeId ?? existant.gradeId;
      const coupleExiste = await this.prisma.gradeTypeEnseignement.findUnique({
        where: {
          gradeId_typeEnseignementId: {
            gradeId,
            typeEnseignementId,
          },
        },
      });
      if (!coupleExiste) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Le couple (grade, type d’enseignement) n’existe pas dans la matrice type × grade',
          { champ: 'gradeId_typeEnseignementId' },
        );
      }
    }

    const modifie = await this.prisma.module.update({
      where: { id },
      data: {
        ...(donnees.code !== undefined && { code: donnees.code }),
        ...(donnees.libelle !== undefined && { libelle: donnees.libelle }),
        ...(donnees.typeEnseignementId !== undefined && {
          typeEnseignementId: donnees.typeEnseignementId,
        }),
        ...(donnees.gradeId !== undefined && { gradeId: donnees.gradeId }),
      },
      include: {
        typeEnseignement: { select: { code: true, libelle: true, couleur: true } },
        grade: { select: { code: true, libelle: true } },
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'Module',
      entiteId: id,
      metadonnees: {
        code: modifie.code,
        libelle: modifie.libelle,
        typeEnseignementId: modifie.typeEnseignementId,
        gradeId: modifie.gradeId,
      },
    });

    this.logger.log(`Module modifié : ${modifie.code}`);
    return {
      id: modifie.id,
      code: modifie.code,
      libelle: modifie.libelle,
      typeEnseignementId: modifie.typeEnseignementId,
      gradeId: modifie.gradeId,
      typeEnseignement: modifie.typeEnseignement,
      grade: modifie.grade,
      createdAt: modifie.createdAt,
      updatedAt: modifie.updatedAt,
    };
  }

  /** Supprime un module (409 s’il est utilisé par une matière). */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.module.findUnique({
      where: { id },
      include: { matieres: { take: 1 } },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Module introuvable');
    }

    if (existant.matieres.length > 0) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Impossible de supprimer un module utilisé par un ou plusieurs matières',
        { matieres: existant.matieres.length },
      );
    }

    await this.prisma.module.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'Module',
      entiteId: id,
      metadonnees: { code: existant.code },
    });

    this.logger.log(`Module supprimé : ${existant.code}`);
    return { id };
  }
}
