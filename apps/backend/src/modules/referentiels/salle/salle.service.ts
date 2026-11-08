// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type { SalleCreate, SalleUpdate, SalleListFilters } from '@takt/contracts';

/**
 * Service de gestion des salles.
 *
 * Les salles sont transverses : aucun lien departementId (EX-REF-03).
 * Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class SalleService {
  private readonly logger = new Logger(SalleService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Crée une salle. Vérifie l'unicité du code, l'existence du type et du site, la capacité > 0. */
  async create(donnees: SalleCreate, utilisateurIdCreePar: string) {
    const existant = await this.prisma.salle.findUnique({
      where: { code: donnees.code },
    });
    if (existant) {
      throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Une salle avec ce code existe déjà', {
        champ: 'code',
      });
    }

    // Valider le type de salle
    const typeSalle = await this.prisma.typeSalle.findUnique({
      where: { id: donnees.typeSalleId },
    });
    if (!typeSalle) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Le type de salle spécifié est introuvable',
        { champ: 'typeSalleId' },
      );
    }

    // Valider le site
    const site = await this.prisma.site.findUnique({
      where: { id: donnees.siteId },
    });
    if (!site) {
      throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Le site spécifié est introuvable', {
        champ: 'siteId',
      });
    }

    // Valider les équipements si fournis
    if (donnees.equipements !== undefined) {
      for (const eq of donnees.equipements) {
        const equipement = await this.prisma.equipement.findUnique({
          where: { id: eq.equipementId },
        });
        if (!equipement) {
          throw new ApiError(
            CODES_ERREUR_API.BAD_REQUEST,
            400,
            `L'équipement ${eq.equipementId} est introuvable`,
            { champ: 'equipements' },
          );
        }
      }
    }

    const salle = await this.prisma.salle.create({
      data: {
        code: donnees.code,
        libelle: donnees.libelle,
        typeSalleId: donnees.typeSalleId,
        capacite: donnees.capacite,
        siteId: donnees.siteId,
        ...(donnees.equipements !== undefined && {
          salleEquipements: {
            create: donnees.equipements.map((eq) => ({
              equipement: { connect: { id: eq.equipementId } },
              quantite: eq.quantite ?? 1,
            })),
          },
        }),
      },
      include: {
        typeSalle: { select: { id: true, code: true, libelle: true } },
        site: { select: { id: true, code: true, libelle: true } },
        salleEquipements: {
          include: { equipement: { select: { id: true, code: true, libelle: true } } },
        },
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'Salle',
      entiteId: salle.id,
      metadonnees: {
        code: salle.code,
        libelle: salle.libelle,
        typeSalleId: salle.typeSalleId,
        siteId: salle.siteId,
        capacite: salle.capacite,
      },
    });

    this.logger.log(`Salle créée : ${salle.code}`);
    return {
      id: salle.id,
      code: salle.code,
      libelle: salle.libelle,
      typeSalleId: salle.typeSalleId,
      siteId: salle.siteId,
      capacite: salle.capacite,
      typeSalle: salle.typeSalle,
      site: salle.site,
      equipements: salle.salleEquipements.map((se) => ({
        equipementId: se.equipementId,
        quantite: se.quantite,
      })),
      createdAt: salle.createdAt,
      updatedAt: salle.updatedAt,
    };
  }

  /** Liste paginée des salles avec filtres multi-critères. */
  async list(query: SalleListFilters) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Record<string, unknown> = {};

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' as const } },
        { libelle: { contains: query.search, mode: 'insensitive' as const } },
      ];
    }

    if (query.typeSalleId) {
      where.typeSalleId = query.typeSalleId;
    }

    if (query.siteId) {
      where.siteId = query.siteId;
    }

    const capaciteFilter: Record<string, unknown> = {};
    if (query.capaciteMin !== undefined) {
      capaciteFilter.gte = Number(query.capaciteMin);
    }
    if (query.capaciteMax !== undefined) {
      capaciteFilter.lte = Number(query.capaciteMax);
    }
    if (Object.keys(capaciteFilter).length > 0) {
      where.capacite = capaciteFilter;
    }

    if (query.equipement) {
      where.salleEquipements = {
        some: {
          equipement: {
            code: { equals: query.equipement, mode: 'insensitive' as const },
          },
        },
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.salle.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          typeSalle: { select: { id: true, code: true, libelle: true } },
          site: { select: { id: true, code: true, libelle: true } },
          salleEquipements: {
            include: { equipement: { select: { id: true, code: true, libelle: true } } },
          },
        },
      }),
      this.prisma.salle.count({ where }),
    ]);

    return {
      items: items.map((s) => ({
        id: s.id,
        code: s.code,
        libelle: s.libelle,
        typeSalleId: s.typeSalleId,
        siteId: s.siteId,
        capacite: s.capacite,
        typeSalle: s.typeSalle,
        site: s.site,
        equipements: s.salleEquipements.map((se) => ({
          equipementId: se.equipementId,
          quantite: se.quantite,
        })),
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère une salle par son ID. */
  async getOne(id: string) {
    const salle = await this.prisma.salle.findUnique({
      where: { id },
      include: {
        typeSalle: { select: { id: true, code: true, libelle: true } },
        site: { select: { id: true, code: true, libelle: true } },
        salleEquipements: {
          include: { equipement: { select: { id: true, code: true, libelle: true } } },
        },
      },
    });
    if (!salle) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Salle introuvable');
    }
    return {
      id: salle.id,
      code: salle.code,
      libelle: salle.libelle,
      typeSalleId: salle.typeSalleId,
      siteId: salle.siteId,
      capacite: salle.capacite,
      typeSalle: salle.typeSalle,
      site: salle.site,
      equipements: salle.salleEquipements.map((se) => ({
        equipementId: se.equipementId,
        quantite: se.quantite,
      })),
      createdAt: salle.createdAt,
      updatedAt: salle.updatedAt,
    };
  }
  /** Met à jour une salle. Remplace la liste des équipements si fournie. */
  async update(id: string, donnees: SalleUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.salle.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Salle introuvable');
    }

    if (donnees.code !== undefined && donnees.code !== existant.code) {
      const dejaUtilise = await this.prisma.salle.findUnique({
        where: { code: donnees.code },
      });
      if (dejaUtilise) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Ce code est déjà utilisé par une autre salle',
          { champ: 'code' },
        );
      }
    }

    if (donnees.typeSalleId !== undefined) {
      const typeSalle = await this.prisma.typeSalle.findUnique({
        where: { id: donnees.typeSalleId },
      });
      if (!typeSalle) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Le type de salle spécifié est introuvable',
          { champ: 'typeSalleId' },
        );
      }
    }

    if (donnees.siteId !== undefined) {
      const site = await this.prisma.site.findUnique({
        where: { id: donnees.siteId },
      });
      if (!site) {
        throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Le site spécifié est introuvable', {
          champ: 'siteId',
        });
      }
    }

    // Valider les équipements si fournis
    if (donnees.equipements !== undefined) {
      for (const eq of donnees.equipements) {
        const equipement = await this.prisma.equipement.findUnique({
          where: { id: eq.equipementId },
        });
        if (!equipement) {
          throw new ApiError(
            CODES_ERREUR_API.BAD_REQUEST,
            400,
            `L'équipement ${eq.equipementId} est introuvable`,
            { champ: 'equipements' },
          );
        }
      }
    }

    const modifie = await this.prisma.salle.update({
      where: { id },
      data: {
        ...(donnees.code !== undefined && { code: donnees.code }),
        ...(donnees.libelle !== undefined && { libelle: donnees.libelle }),
        ...(donnees.typeSalleId !== undefined && { typeSalleId: donnees.typeSalleId }),
        ...(donnees.siteId !== undefined && { siteId: donnees.siteId }),
        ...(donnees.capacite !== undefined && { capacite: donnees.capacite }),
        ...(donnees.equipements !== undefined && {
          salleEquipements: {
            deleteMany: {},
            create: donnees.equipements.map((eq) => ({
              equipement: { connect: { id: eq.equipementId } },
              quantite: eq.quantite ?? 1,
            })),
          },
        }),
      },
      include: {
        typeSalle: { select: { id: true, code: true, libelle: true } },
        site: { select: { id: true, code: true, libelle: true } },
        salleEquipements: {
          include: { equipement: { select: { id: true, code: true, libelle: true } } },
        },
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'Salle',
      entiteId: id,
      metadonnees: {
        code: modifie.code,
        libelle: modifie.libelle,
        typeSalleId: modifie.typeSalleId,
        siteId: modifie.siteId,
        capacite: modifie.capacite,
      },
    });

    this.logger.log(`Salle modifiée : ${modifie.code}`);
    return {
      id: modifie.id,
      code: modifie.code,
      libelle: modifie.libelle,
      typeSalleId: modifie.typeSalleId,
      siteId: modifie.siteId,
      capacite: modifie.capacite,
      typeSalle: modifie.typeSalle,
      site: modifie.site,
      equipements: modifie.salleEquipements.map((se) => ({
        equipementId: se.equipementId,
        quantite: se.quantite,
      })),
      createdAt: modifie.createdAt,
      updatedAt: modifie.updatedAt,
    };
  }

  /** Supprime une salle (409 si utilisée par un module). */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.salle.findUnique({
      where: { id },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Salle introuvable');
    }

    // Aucun module ne référence encore Salle à ce stade ; la garde 409 est conservée
    // pour anticiper le générateur de conflits et le solveur (L06, L07).
    await this.prisma.salle.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'Salle',
      entiteId: id,
      metadonnees: { code: existant.code },
    });

    this.logger.log(`Salle supprimée : ${existant.code}`);
    return { id };
  }
}
