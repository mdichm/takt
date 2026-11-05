// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type {
  TypeEnseignementCreate,
  TypeEnseignementUpdate,
  TypeEnseignementListFilters,
} from '@takt/contracts';

/**
 * Service de gestion des types d’enseignement (CM, TD, TP, PROJET).
 *
 * Chaque type d’enseignement possède une couleur pour l’affichage dans la grille EDT.
 * Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class TypeEnseignementService {
  private readonly logger = new Logger(TypeEnseignementService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Crée un type d’enseignement. Vérifie l’unicité du code (400). */
  async create(donnees: TypeEnseignementCreate, utilisateurIdCreePar: string) {
    const existant = await this.prisma.typeEnseignement.findUnique({
      where: { code: donnees.code },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Un type d’enseignement avec ce code existe déjà',
        { champ: 'code' },
      );
    }

    const typeEnseignement = await this.prisma.typeEnseignement.create({
      data: {
        code: donnees.code,
        libelle: donnees.libelle,
        couleur: donnees.couleur,
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'TypeEnseignement',
      entiteId: typeEnseignement.id,
      metadonnees: {
        code: typeEnseignement.code,
        libelle: typeEnseignement.libelle,
        couleur: typeEnseignement.couleur,
      },
    });

    this.logger.log(`Type d’enseignement créé : ${typeEnseignement.code}`);
    return {
      id: typeEnseignement.id,
      code: typeEnseignement.code,
      libelle: typeEnseignement.libelle,
      couleur: typeEnseignement.couleur,
      createdAt: typeEnseignement.createdAt,
      updatedAt: typeEnseignement.updatedAt,
    };
  }

  /** Liste paginée des types d’enseignement. */
  async list(query: TypeEnseignementListFilters) {
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
      this.prisma.typeEnseignement.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.typeEnseignement.count({ where }),
    ]);

    return {
      items: items.map((t) => ({
        id: t.id,
        code: t.code,
        libelle: t.libelle,
        couleur: t.couleur,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère un type d’enseignement par son ID. */
  async getOne(id: string) {
    const typeEnseignement = await this.prisma.typeEnseignement.findUnique({
      where: { id },
    });
    if (!typeEnseignement) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Type d’enseignement introuvable',
      );
    }
    return {
      id: typeEnseignement.id,
      code: typeEnseignement.code,
      libelle: typeEnseignement.libelle,
      couleur: typeEnseignement.couleur,
      createdAt: typeEnseignement.createdAt,
      updatedAt: typeEnseignement.updatedAt,
    };
  }

  /** Met à jour un type d’enseignement. */
  async update(id: string, donnees: TypeEnseignementUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.typeEnseignement.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Type d’enseignement introuvable',
      );
    }

    if (donnees.code !== undefined && donnees.code !== existant.code) {
      const dejaUtilise = await this.prisma.typeEnseignement.findUnique({
        where: { code: donnees.code },
      });
      if (dejaUtilise) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Ce code est déjà utilisé par un autre type d’enseignement',
          { champ: 'code' },
        );
      }
    }

    const modifie = await this.prisma.typeEnseignement.update({
      where: { id },
      data: {
        ...(donnees.code !== undefined && { code: donnees.code }),
        ...(donnees.libelle !== undefined && { libelle: donnees.libelle }),
        ...(donnees.couleur !== undefined && { couleur: donnees.couleur }),
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'TypeEnseignement',
      entiteId: id,
      metadonnees: {
        code: modifie.code,
        libelle: modifie.libelle,
        couleur: modifie.couleur,
      },
    });

    this.logger.log(`Type d’enseignement modifié : ${modifie.code}`);
    return {
      id: modifie.id,
      code: modifie.code,
      libelle: modifie.libelle,
      couleur: modifie.couleur,
      createdAt: modifie.createdAt,
      updatedAt: modifie.updatedAt,
    };
  }

  /** Supprime un type d’enseignement (409 s’il est utilisé par un module). */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.typeEnseignement.findUnique({
      where: { id },
      include: { modules: { take: 1 } },
    });
    if (!existant) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Type d’enseignement introuvable',
      );
    }

    if (existant.modules.length > 0) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Impossible de supprimer un type d’enseignement utilisé par un ou plusieurs modules',
        { modules: existant.modules.length },
      );
    }

    await this.prisma.typeEnseignement.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'TypeEnseignement',
      entiteId: id,
      metadonnees: { code: existant.code },
    });

    this.logger.log(`Type d’enseignement supprimé : ${existant.code}`);
    return { id };
  }
}