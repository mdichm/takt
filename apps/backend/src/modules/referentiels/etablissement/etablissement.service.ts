// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { appliquerFiltreDepartement } from '../../common/rbac/filtre-departement.util';
import { AuditService } from '../../audit/audit.service';
import type {
  EtablissementCreate,
  EtablissementUpdate,
  EtablissementListFilters,
} from '@takt/contracts';

/**
 * Service de gestion des établissements.
 *
 * Permet de créer, lister, modifier et supprimer des établissements.
 * Chaque mutation est journalisée (GG-07).
 * Le code doit être unique (contrainte SQL + validation Zod).
 */
@Injectable()
export class EtablissementService {
  private readonly logger = new Logger(EtablissementService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Crée un établissement. Rejette si le code existe déjà (400). */
  async create(donnees: EtablissementCreate, utilisateurIdCreePar: string) {
    const existant = await this.prisma.etablissement.findUnique({
      where: { code: donnees.code },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Un établissement avec ce code existe déjà',
        { champ: 'code' },
      );
    }

    const etablissement = await this.prisma.etablissement.create({
      data: {
        code: donnees.code,
        libelle: donnees.libelle,
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'Etablissement',
      entiteId: etablissement.id,
      metadonnees: { code: etablissement.code, libelle: etablissement.libelle },
    });

    this.logger.log(`Établissement créé : ${etablissement.code}`);
    return {
      id: etablissement.id,
      code: etablissement.code,
      libelle: etablissement.libelle,
      createdAt: etablissement.createdAt,
      updatedAt: etablissement.updatedAt,
    };
  }

  /** Liste paginée des établissements, avec filtre département pour rdep. */
  async list(query: EtablissementListFilters, departementIds: string[] = []) {
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

    where = appliquerFiltreDepartement(where, departementIds);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.etablissement.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.etablissement.count({ where }),
    ]);

    return {
      data: items.map((e) => ({
        id: e.id,
        code: e.code,
        libelle: e.libelle,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère un établissement par son ID (404 si introuvable). */
  async getOne(id: string) {
    const etablissement = await this.prisma.etablissement.findUnique({
      where: { id },
    });
    if (!etablissement) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Établissement introuvable');
    }
    return {
      id: etablissement.id,
      code: etablissement.code,
      libelle: etablissement.libelle,
      createdAt: etablissement.createdAt,
      updatedAt: etablissement.updatedAt,
    };
  }

  /** Met à jour un établissement (404 si introuvable, 400 si code déjà utilisé). */
  async update(id: string, donnees: EtablissementUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.etablissement.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Établissement introuvable');
    }

    if (donnees.code !== undefined && donnees.code !== existant.code) {
      const dejaUtilise = await this.prisma.etablissement.findUnique({
        where: { code: donnees.code },
      });
      if (dejaUtilise) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Ce code est déjà utilisé par un autre établissement',
          { champ: 'code' },
        );
      }
    }

    const modifie = await this.prisma.etablissement.update({
      where: { id },
      data: {
        ...(donnees.code !== undefined && { code: donnees.code }),
        ...(donnees.libelle !== undefined && { libelle: donnees.libelle }),
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'Etablissement',
      entiteId: id,
      metadonnees: { code: modifie.code, libelle: modifie.libelle },
    });

    this.logger.log(`Établissement modifié : ${modifie.code}`);
    return {
      id: modifie.id,
      code: modifie.code,
      libelle: modifie.libelle,
      createdAt: modifie.createdAt,
      updatedAt: modifie.updatedAt,
    };
  }

  /** Supprime un établissement (404 si introuvable, 409 s'il a des départements). */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.etablissement.findUnique({
      where: { id },
      include: { departements: true },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Établissement introuvable');
    }

    if (existant.departements.length > 0) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Impossible de supprimer un établissement ayant des départements associés',
        { enfants: existant.departements.length },
      );
    }

    await this.prisma.etablissement.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'Etablissement',
      entiteId: id,
      metadonnees: { code: existant.code },
    });

    this.logger.log(`Établissement supprimé : ${existant.code}`);
    return { id };
  }

  /** Hiérarchie complète : Établissement → Département → Parcours → Niveau → Groupe. */
  async arbre() {
    const etablissements = await this.prisma.etablissement.findMany({
      orderBy: [{ code: 'asc' }],
      include: {
        departements: {
          orderBy: [{ code: 'asc' }],
          include: {
            parcours: {
              orderBy: [{ code: 'asc' }],
              include: {
                niveaux: {
                  orderBy: [{ code: 'asc' }],
                  include: {
                    groupes: {
                      orderBy: [{ code: 'asc' }],
                      select: { id: true, code: true, libelle: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return etablissements.map((e) => ({
      id: e.id,
      code: e.code,
      libelle: e.libelle,
      departements: e.departements.map((d) => ({
        id: d.id,
        code: d.code,
        libelle: d.libelle,
        parcours: d.parcours.map((p) => ({
          id: p.id,
          code: p.code,
          libelle: p.libelle,
          niveaux: p.niveaux.map((n) => ({
            id: n.id,
            code: n.code,
            libelle: n.libelle,
            groupes: n.groupes,
          })),
        })),
      })),
    }));
  }
}
