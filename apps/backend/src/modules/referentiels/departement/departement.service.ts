// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { appliquerFiltreDepartement } from '../../common/rbac/filtre-departement.util';
import { AuditService } from '../../audit/audit.service';
import type {
  DepartementCreate,
  DepartementUpdate,
  DepartementListFilters,
} from '@takt/contracts';

/**
 * Service de gestion des départements.
 *
 * Chaque département appartient à un établissement parent.
 * Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class DepartementService {
  private readonly logger = new Logger(DepartementService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Crée un département. Vérifie que l'établissement parent existe (400). */
  async create(donnees: DepartementCreate, utilisateurIdCreePar: string) {
    const etablissement = await this.prisma.etablissement.findUnique({
      where: { id: donnees.etablissementId },
    });
    if (!etablissement) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'L’établissement parent est introuvable',
        { champ: 'etablissementId' },
      );
    }

    const existant = await this.prisma.departement.findUnique({
      where: { code: donnees.code },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Un département avec ce code existe déjà',
        { champ: 'code' },
      );
    }

    const departement = await this.prisma.departement.create({
      data: {
        code: donnees.code,
        libelle: donnees.libelle,
        etablissementId: donnees.etablissementId,
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'Departement',
      entiteId: departement.id,
      metadonnees: {
        code: departement.code,
        libelle: departement.libelle,
        etablissementId: departement.etablissementId,
      },
    });

    this.logger.log(`Département créé : ${departement.code}`);
    return {
      id: departement.id,
      code: departement.code,
      libelle: departement.libelle,
      etablissementId: departement.etablissementId,
      createdAt: departement.createdAt,
      updatedAt: departement.updatedAt,
    };
  }

  /** Liste paginée des départements, avec filtre département pour rdep. */
  async list(query: DepartementListFilters, departementIds: string[] = []) {
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
    if (query.etablissementId) {
      where = { ...where, etablissementId: query.etablissementId };
    }

    where = appliquerFiltreDepartement(where, departementIds);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.departement.findMany({
        where,
        include: { etablissement: { select: { code: true, libelle: true } } },
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.departement.count({ where }),
    ]);

    return {
      data: items.map((d) => ({
        id: d.id,
        code: d.code,
        libelle: d.libelle,
        etablissementId: d.etablissementId,
        etablissement: d.etablissement,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère un département par son ID (404 si introuvable). */
  async getOne(id: string) {
    const departement = await this.prisma.departement.findUnique({
      where: { id },
      include: { etablissement: { select: { code: true, libelle: true } } },
    });
    if (!departement) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Département introuvable');
    }
    return {
      id: departement.id,
      code: departement.code,
      libelle: departement.libelle,
      etablissementId: departement.etablissementId,
      etablissement: departement.etablissement,
      createdAt: departement.createdAt,
      updatedAt: departement.updatedAt,
    };
  }

  /** Met à jour un département (404 si introuvable, 400 si code déjà utilisé). */
  async update(id: string, donnees: DepartementUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.departement.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Département introuvable');
    }

    if (donnees.code !== undefined && donnees.code !== existant.code) {
      const dejaUtilise = await this.prisma.departement.findUnique({
        where: { code: donnees.code },
      });
      if (dejaUtilise) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Ce code est déjà utilisé par un autre département',
          { champ: 'code' },
        );
      }
    }

    if (donnees.etablissementId !== undefined) {
      const etablissement = await this.prisma.etablissement.findUnique({
        where: { id: donnees.etablissementId },
      });
      if (!etablissement) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'L’établissement parent est introuvable',
          { champ: 'etablissementId' },
        );
      }
    }

    const modifie = await this.prisma.departement.update({
      where: { id },
      data: {
        ...(donnees.code !== undefined && { code: donnees.code }),
        ...(donnees.libelle !== undefined && { libelle: donnees.libelle }),
        ...(donnees.etablissementId !== undefined && {
          etablissementId: donnees.etablissementId,
        }),
      },
      include: { etablissement: { select: { code: true, libelle: true } } },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'Departement',
      entiteId: id,
      metadonnees: {
        code: modifie.code,
        libelle: modifie.libelle,
        etablissementId: modifie.etablissementId,
      },
    });

    this.logger.log(`Département modifié : ${modifie.code}`);
    return {
      id: modifie.id,
      code: modifie.code,
      libelle: modifie.libelle,
      etablissementId: modifie.etablissementId,
      etablissement: modifie.etablissement,
      createdAt: modifie.createdAt,
      updatedAt: modifie.updatedAt,
    };
  }

  /** Supprime un département (404 si introuvable, 409 s'il a des parcours ou utilisateurs). */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.departement.findUnique({
      where: { id },
      include: { parcours: true, utilisateurs: { take: 1 } },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Département introuvable');
    }

    if (existant.parcours.length > 0 || existant.utilisateurs.length > 0) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Impossible de supprimer un département ayant des parcours ou utilisateurs associés',
        { parcours: existant.parcours.length, utilisateurs: existant.utilisateurs.length },
      );
    }

    await this.prisma.departement.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'Departement',
      entiteId: id,
      metadonnees: { code: existant.code },
    });

    this.logger.log(`Département supprimé : ${existant.code}`);
    return { id };
  }
}