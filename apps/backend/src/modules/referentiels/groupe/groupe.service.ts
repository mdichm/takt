// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type { GroupeCreate, GroupeUpdate, GroupeListFilters } from '@takt/contracts';

/**
 * Service de gestion des groupes.
 *
 * Chaque groupe appartient à un niveau parent.
 * Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class GroupeService {
  private readonly logger = new Logger(GroupeService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Crée un groupe. Vérifie que le niveau parent existe (400). */
  async create(donnees: GroupeCreate, utilisateurIdCreePar: string) {
    const niveau = await this.prisma.niveau.findUnique({
      where: { id: donnees.niveauId },
    });
    if (!niveau) {
      throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Le niveau parent est introuvable', {
        champ: 'niveauId',
      });
    }

    const existant = await this.prisma.groupe.findUnique({
      where: { code: donnees.code },
    });
    if (existant) {
      throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Un groupe avec ce code existe déjà', {
        champ: 'code',
      });
    }

    const groupe = await this.prisma.groupe.create({
      data: {
        code: donnees.code,
        libelle: donnees.libelle,
        niveauId: donnees.niveauId,
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'Groupe',
      entiteId: groupe.id,
      metadonnees: {
        code: groupe.code,
        libelle: groupe.libelle,
        niveauId: groupe.niveauId,
      },
    });

    this.logger.log(`Groupe créé : ${groupe.code}`);
    return {
      id: groupe.id,
      code: groupe.code,
      libelle: groupe.libelle,
      niveauId: groupe.niveauId,
      createdAt: groupe.createdAt,
      updatedAt: groupe.updatedAt,
    };
  }

  /** Liste paginée des groupes, avec filtre département pour rdep. */
  async list(query: GroupeListFilters, departementIds: string[] = []) {
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
    if (query.niveauId) {
      where = { ...where, niveauId: query.niveauId };
    }

    // Filtre par département via jointure : Groupe → Niveau → Parcours → Departement
    if (departementIds.length > 0) {
      where = {
        ...where,
        niveau: {
          parcours: {
            departementId: { in: departementIds },
          },
        },
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.groupe.findMany({
        where,
        include: {
          niveau: {
            include: {
              parcours: { select: { code: true, libelle: true, departementId: true } },
            },
          },
        },
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.groupe.count({ where }),
    ]);

    return {
      data: items.map((g) => ({
        id: g.id,
        code: g.code,
        libelle: g.libelle,
        niveauId: g.niveauId,
        niveau: g.niveau,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère un groupe par son ID (404 si introuvable). */
  async getOne(id: string) {
    const groupe = await this.prisma.groupe.findUnique({
      where: { id },
      include: {
        niveau: {
          include: {
            parcours: { select: { code: true, libelle: true } },
          },
        },
      },
    });
    if (!groupe) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Groupe introuvable');
    }
    return {
      id: groupe.id,
      code: groupe.code,
      libelle: groupe.libelle,
      niveauId: groupe.niveauId,
      niveau: groupe.niveau,
      createdAt: groupe.createdAt,
      updatedAt: groupe.updatedAt,
    };
  }

  /** Met à jour un groupe (404 si introuvable, 400 si code déjà utilisé). */
  async update(id: string, donnees: GroupeUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.groupe.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Groupe introuvable');
    }

    if (donnees.code !== undefined && donnees.code !== existant.code) {
      const dejaUtilise = await this.prisma.groupe.findUnique({
        where: { code: donnees.code },
      });
      if (dejaUtilise) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Ce code est déjà utilisé par un autre groupe',
          { champ: 'code' },
        );
      }
    }

    if (donnees.niveauId !== undefined) {
      const niveau = await this.prisma.niveau.findUnique({
        where: { id: donnees.niveauId },
      });
      if (!niveau) {
        throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Le niveau parent est introuvable', {
          champ: 'niveauId',
        });
      }
    }

    const modifie = await this.prisma.groupe.update({
      where: { id },
      data: {
        ...(donnees.code !== undefined && { code: donnees.code }),
        ...(donnees.libelle !== undefined && { libelle: donnees.libelle }),
        ...(donnees.niveauId !== undefined && { niveauId: donnees.niveauId }),
      },
      include: {
        niveau: {
          include: {
            parcours: { select: { code: true, libelle: true } },
          },
        },
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'Groupe',
      entiteId: id,
      metadonnees: {
        code: modifie.code,
        libelle: modifie.libelle,
        niveauId: modifie.niveauId,
      },
    });

    this.logger.log(`Groupe modifié : ${modifie.code}`);
    return {
      id: modifie.id,
      code: modifie.code,
      libelle: modifie.libelle,
      niveauId: modifie.niveauId,
      niveau: modifie.niveau,
      createdAt: modifie.createdAt,
      updatedAt: modifie.updatedAt,
    };
  }

  /** Supprime un groupe (404 si introuvable). */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.groupe.findUnique({
      where: { id },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Groupe introuvable');
    }

    await this.prisma.groupe.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'Groupe',
      entiteId: id,
      metadonnees: { code: existant.code },
    });

    this.logger.log(`Groupe supprimé : ${existant.code}`);
    return { id };
  }
}
