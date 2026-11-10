// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type { GradeTypeEnseignementCreate } from '@takt/contracts';

/**
 * Service de gestion de la matrice GradeTypeEnseignement (couples grade × type).
 *
 * Ce service gère les combinaisons autorisées entre un grade et un type
 * d’enseignement. Un couple ne peut être supprimé s’il est utilisé par un module.
 * Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class GradeTypeEnseignementService {
  private readonly logger = new Logger(GradeTypeEnseignementService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Liste de tous les couples de la matrice. */
  async list() {
    const couples = await this.prisma.gradeTypeEnseignement.findMany({
      include: {
        grade: { select: { code: true, libelle: true } },
        typeEnseignement: { select: { code: true, libelle: true, couleur: true } },
      },
      orderBy: [{ gradeId: 'asc' }, { typeEnseignementId: 'asc' }],
    });

    return {
      items: couples.map((c) => ({
        id: c.id,
        gradeId: c.gradeId,
        typeEnseignementId: c.typeEnseignementId,
        grade: c.grade,
        typeEnseignement: c.typeEnseignement,
        createdAt: c.createdAt,
      })),
    };
  }

  /** Crée un couple (grade, type d’enseignement) dans la matrice. */
  async create(donnees: GradeTypeEnseignementCreate, utilisateurIdCreePar: string) {
    const existant = await this.prisma.gradeTypeEnseignement.findUnique({
      where: {
        gradeId_typeEnseignementId: {
          gradeId: donnees.gradeId,
          typeEnseignementId: donnees.typeEnseignementId,
        },
      },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Ce couple (grade, type d’enseignement) existe déjà dans la matrice',
        { champ: 'gradeId_typeEnseignementId' },
      );
    }

    const gradeExiste = await this.prisma.grade.findUnique({
      where: { id: donnees.gradeId },
    });
    if (!gradeExiste) {
      throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Le grade n’existe pas', {
        champ: 'gradeId',
      });
    }

    const typeExiste = await this.prisma.typeEnseignement.findUnique({
      where: { id: donnees.typeEnseignementId },
    });
    if (!typeExiste) {
      throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Le type d’enseignement n’existe pas', {
        champ: 'typeEnseignementId',
      });
    }

    const couple = await this.prisma.gradeTypeEnseignement.create({
      data: {
        gradeId: donnees.gradeId,
        typeEnseignementId: donnees.typeEnseignementId,
      },
      include: {
        grade: { select: { code: true, libelle: true } },
        typeEnseignement: { select: { code: true, libelle: true, couleur: true } },
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'GradeTypeEnseignement',
      entiteId: couple.id,
      metadonnees: {
        gradeId: couple.gradeId,
        typeEnseignementId: couple.typeEnseignementId,
      },
    });

    this.logger.log(
      `Couple matrice créé : grade=${couple.gradeId}, type=${couple.typeEnseignementId}`,
    );
    return {
      id: couple.id,
      gradeId: couple.gradeId,
      typeEnseignementId: couple.typeEnseignementId,
      grade: couple.grade,
      typeEnseignement: couple.typeEnseignement,
      createdAt: couple.createdAt,
    };
  }

  /** Récupère un couple de la matrice par son ID. */
  async getOne(id: string) {
    const couple = await this.prisma.gradeTypeEnseignement.findUnique({
      where: { id },
      include: {
        grade: { select: { code: true, libelle: true } },
        typeEnseignement: { select: { code: true, libelle: true, couleur: true } },
      },
    });
    if (!couple) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Couple introuvable dans la matrice');
    }
    return {
      id: couple.id,
      gradeId: couple.gradeId,
      typeEnseignementId: couple.typeEnseignementId,
      grade: couple.grade,
      typeEnseignement: couple.typeEnseignement,
      createdAt: couple.createdAt,
    };
  }

  /** Supprime un couple de la matrice (409 si utilisé par un module). */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.gradeTypeEnseignement.findUnique({
      where: { id },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Couple introuvable dans la matrice');
    }

    const nbModules = await this.prisma.module.count({
      where: {
        typeEnseignementId: existant.typeEnseignementId,
        gradeId: existant.gradeId,
      },
    });
    if (nbModules > 0) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Impossible de supprimer un couple utilisé par un ou plusieurs modules',
        { modules: nbModules },
      );
    }

    await this.prisma.gradeTypeEnseignement.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'GradeTypeEnseignement',
      entiteId: id,
      metadonnees: {
        gradeId: existant.gradeId,
        typeEnseignementId: existant.typeEnseignementId,
      },
    });

    this.logger.log(
      `Couple matrice supprimé : grade=${existant.gradeId}, type=${existant.typeEnseignementId}`,
    );
    return { id };
  }
}
