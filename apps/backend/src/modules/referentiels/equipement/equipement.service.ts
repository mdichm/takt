// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type { EquipementCreate, EquipementUpdate, EquipementListFilters } from '@takt/contracts';

/**
 * Service de gestion des équipements.
 *
 * Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class EquipementService {
  private readonly logger = new Logger(EquipementService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Crée un équipement. Vérifie l’unicité du code (400). */
  async create(donnees: EquipementCreate, utilisateurIdCreePar: string) {
    const existant = await this.prisma.equipement.findUnique({
      where: { code: donnees.code },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Un équipement avec ce code existe déjà',
        { champ: 'code' },
      );
    }

    const equipement = await this.prisma.equipement.create({
      data: {
        code: donnees.code,
        libelle: donnees.libelle,
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'Equipement',
      entiteId: equipement.id,
      metadonnees: { code: equipement.code, libelle: equipement.libelle },
    });

    this.logger.log(`Équipement créé : ${equipement.code}`);
    return {
      id: equipement.id,
      code: equipement.code,
      libelle: equipement.libelle,
      createdAt: equipement.createdAt,
      updatedAt: equipement.updatedAt,
    };
  }

  /** Liste paginée des équipements. */
  async list(query: EquipementListFilters) {
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
      this.prisma.equipement.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.equipement.count({ where }),
    ]);

    return {
      items: items.map((e) => ({
        id: e.id,
        code: e.code,
        libelle: e.libelle,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère un équipement par son ID. */
  async getOne(id: string) {
    const equipement = await this.prisma.equipement.findUnique({ where: { id } });
    if (!equipement) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Équipement introuvable');
    }
    return {
      id: equipement.id,
      code: equipement.code,
      libelle: equipement.libelle,
      createdAt: equipement.createdAt,
      updatedAt: equipement.updatedAt,
    };
  }

  /** Met à jour un équipement. */
  async update(id: string, donnees: EquipementUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.equipement.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Équipement introuvable');
    }

    if (donnees.code !== undefined && donnees.code !== existant.code) {
      const dejaUtilise = await this.prisma.equipement.findUnique({
        where: { code: donnees.code },
      });
      if (dejaUtilise) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Ce code est déjà utilisé par un autre équipement',
          { champ: 'code' },
        );
      }
    }

    const modifie = await this.prisma.equipement.update({
      where: { id },
      data: {
        ...(donnees.code !== undefined && { code: donnees.code }),
        ...(donnees.libelle !== undefined && { libelle: donnees.libelle }),
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'Equipement',
      entiteId: id,
      metadonnees: { code: modifie.code, libelle: modifie.libelle },
    });

    this.logger.log(`Équipement modifié : ${modifie.code}`);
    return {
      id: modifie.id,
      code: modifie.code,
      libelle: modifie.libelle,
      createdAt: modifie.createdAt,
      updatedAt: modifie.updatedAt,
    };
  }

  /** Supprime un équipement (409 s'il est utilisé par des salles). */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.equipement.findUnique({
      where: { id },
      include: { salleEquipements: { take: 1 } },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Équipement introuvable');
    }

    if (existant.salleEquipements.length > 0) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Impossible de supprimer un équipement utilisé par une ou plusieurs salles',
        { salles: existant.salleEquipements.length },
      );
    }

    await this.prisma.equipement.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'Equipement',
      entiteId: id,
      metadonnees: { code: existant.code },
    });

    this.logger.log(`Équipement supprimé : ${existant.code}`);
    return { id };
  }
}