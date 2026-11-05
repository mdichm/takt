// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type {
  EnseignantCreate,
  EnseignantUpdate,
  EnseignantListFilters,
} from '@takt/contracts';

/**
 * Service de gestion des enseignants (référentiel métier).
 *
 * Chaque mutation est journalisée (GG-07).
 * La relation N:N avec Département est gérée via la table associative
 * EnseignantDepartement.
 */
@Injectable()
export class EnseignantService {
  private readonly logger = new Logger(EnseignantService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Crée un enseignant. Vérifie l’unicité du matricule (400) et de l’email (400). */
  async create(donnees: EnseignantCreate, utilisateurIdCreePar: string) {
    const existantMatricule = await this.prisma.enseignant.findUnique({
      where: { matricule: donnees.matricule },
    });
    if (existantMatricule) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Un enseignant avec ce matricule existe déjà',
        { champ: 'matricule' },
      );
    }

    const existantEmail = await this.prisma.enseignant.findUnique({
      where: { email: donnees.email },
    });
    if (existantEmail) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Un enseignant avec cet email existe déjà',
        { champ: 'email' },
      );
    }

    // Valider le grade si fourni
    if (donnees.gradeId !== undefined && donnees.gradeId !== null) {
      const grade = await this.prisma.grade.findUnique({
        where: { id: donnees.gradeId },
      });
      if (!grade) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Le grade spécifié est introuvable',
          { champ: 'gradeId' },
        );
      }
    }

    // Valider les départements si fournis
    if (donnees.departementIds !== undefined) {
      for (const deptId of donnees.departementIds) {
        const dept = await this.prisma.departement.findUnique({
          where: { id: deptId },
        });
        if (!dept) {
          throw new ApiError(
            CODES_ERREUR_API.BAD_REQUEST,
            400,
            `Le département ${deptId} est introuvable`,
            { champ: 'departementIds' },
          );
        }
      }
    }

    const enseignant = await this.prisma.enseignant.create({
      data: {
        matricule: donnees.matricule,
        nom: donnees.nom,
        prenom: donnees.prenom,
        email: donnees.email,
        gradeId: donnees.gradeId ?? null,
        estActif: donnees.estActif ?? true,
        ...(donnees.departementIds !== undefined && {
          departements: {
            create: donnees.departementIds.map((departementId) => ({
              departement: { connect: { id: departementId } },
            })),
          },
        }),
      },
      include: {
        departements: { include: { departement: true } },
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'Enseignant',
      entiteId: enseignant.id,
      metadonnees: {
        matricule: enseignant.matricule,
        nom: enseignant.nom,
        prenom: enseignant.prenom,
        email: enseignant.email,
        gradeId: enseignant.gradeId,
        departementIds: donnees.departementIds ?? [],
      },
    });

    this.logger.log(`Enseignant créé : ${enseignant.matricule}`);
    return {
      id: enseignant.id,
      matricule: enseignant.matricule,
      nom: enseignant.nom,
      prenom: enseignant.prenom,
      email: enseignant.email,
      gradeId: enseignant.gradeId,
      estActif: enseignant.estActif,
      departements: enseignant.departements.map((d) => ({
        id: d.departement.id,
        code: d.departement.code,
        libelle: d.departement.libelle,
      })),
      createdAt: enseignant.createdAt,
      updatedAt: enseignant.updatedAt,
    };
  }

  /** Liste paginée des enseignants avec recherche plein texte. */
  async list(query: EnseignantListFilters) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    let where: Record<string, unknown> = {};
    if (query.search) {
      where = {
        OR: [
          { matricule: { contains: query.search, mode: 'insensitive' as const } },
          { nom: { contains: query.search, mode: 'insensitive' as const } },
          { prenom: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
        ],
      };
    }
    if (query.gradeId !== undefined) {
      where = { ...where, gradeId: query.gradeId };
    }
    if (query.estActif !== undefined) {
      where = { ...where, estActif: query.estActif };
    }
    if (query.departementId !== undefined) {
      where = {
        ...where,
        departements: { some: { departementId: query.departementId } },
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.enseignant.findMany({
        where,
        include: {
          departements: { include: { departement: true } },
        },
        orderBy: [
          { [query.sortBy ?? 'matricule']: query.sortDirection ?? 'asc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.enseignant.count({ where }),
    ]);

    return {
      items: items.map((e) => ({
        id: e.id,
        matricule: e.matricule,
        nom: e.nom,
        prenom: e.prenom,
        email: e.email,
        gradeId: e.gradeId,
        estActif: e.estActif,
        departements: e.departements.map((d) => ({
          id: d.departement.id,
          code: d.departement.code,
          libelle: d.departement.libelle,
        })),
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère un enseignant par son ID. */
  async getOne(id: string) {
    const enseignant = await this.prisma.enseignant.findUnique({
      where: { id },
      include: {
        departements: { include: { departement: true } },
        grade: true,
      },
    });
    if (!enseignant) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Enseignant introuvable',
      );
    }
    return {
      id: enseignant.id,
      matricule: enseignant.matricule,
      nom: enseignant.nom,
      prenom: enseignant.prenom,
      email: enseignant.email,
      gradeId: enseignant.gradeId,
      grade: enseignant.grade
        ? { id: enseignant.grade.id, code: enseignant.grade.code, libelle: enseignant.grade.libelle }
        : null,
      estActif: enseignant.estActif,
      departements: enseignant.departements.map((d) => ({
        id: d.departement.id,
        code: d.departement.code,
        libelle: d.departement.libelle,
      })),
      createdAt: enseignant.createdAt,
      updatedAt: enseignant.updatedAt,
    };
  }

  /** Met à jour un enseignant. Remplace les départements si departementIds fourni. */
  async update(id: string, donnees: EnseignantUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.enseignant.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Enseignant introuvable',
      );
    }

    if (donnees.matricule !== undefined && donnees.matricule !== existant.matricule) {
      const dejaUtilise = await this.prisma.enseignant.findUnique({
        where: { matricule: donnees.matricule },
      });
      if (dejaUtilise) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Ce matricule est déjà utilisé par un autre enseignant',
          { champ: 'matricule' },
        );
      }
    }

    if (donnees.email !== undefined && donnees.email !== existant.email) {
      const dejaUtilise = await this.prisma.enseignant.findUnique({
        where: { email: donnees.email },
      });
      if (dejaUtilise) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Cet email est déjà utilisé par un autre enseignant',
          { champ: 'email' },
        );
      }
    }

    if (donnees.gradeId !== undefined && donnees.gradeId !== null && donnees.gradeId !== existant.gradeId) {
      const grade = await this.prisma.grade.findUnique({
        where: { id: donnees.gradeId },
      });
      if (!grade) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Le grade spécifié est introuvable',
          { champ: 'gradeId' },
        );
      }
    }

    if (donnees.departementIds !== undefined) {
      for (const deptId of donnees.departementIds) {
        const dept = await this.prisma.departement.findUnique({
          where: { id: deptId },
        });
        if (!dept) {
          throw new ApiError(
            CODES_ERREUR_API.BAD_REQUEST,
            400,
            `Le département ${deptId} est introuvable`,
            { champ: 'departementIds' },
          );
        }
      }
    }

    const modifie = await this.prisma.enseignant.update({
      where: { id },
      data: {
        ...(donnees.matricule !== undefined && { matricule: donnees.matricule }),
        ...(donnees.nom !== undefined && { nom: donnees.nom }),
        ...(donnees.prenom !== undefined && { prenom: donnees.prenom }),
        ...(donnees.email !== undefined && { email: donnees.email }),
        ...(donnees.gradeId !== undefined && { gradeId: donnees.gradeId }),
        ...(donnees.estActif !== undefined && { estActif: donnees.estActif }),
        ...(donnees.departementIds !== undefined && {
          departements: {
            deleteMany: {},
            create: donnees.departementIds.map((departementId) => ({
              departement: { connect: { id: departementId } },
            })),
          },
        }),
      },
      include: {
        departements: { include: { departement: true } },
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'Enseignant',
      entiteId: id,
      metadonnees: {
        matricule: modifie.matricule,
        nom: modifie.nom,
        prenom: modifie.prenom,
        email: modifie.email,
        gradeId: modifie.gradeId,
        departementIds: donnees.departementIds ?? [],
      },
    });

    this.logger.log(`Enseignant modifié : ${modifie.matricule}`);
    return {
      id: modifie.id,
      matricule: modifie.matricule,
      nom: modifie.nom,
      prenom: modifie.prenom,
      email: modifie.email,
      gradeId: modifie.gradeId,
      estActif: modifie.estActif,
      departements: modifie.departements.map((d) => ({
        id: d.departement.id,
        code: d.departement.code,
        libelle: d.departement.libelle,
      })),
      createdAt: modifie.createdAt,
      updatedAt: modifie.updatedAt,
    };
  }

  /** Supprime un enseignant (409 s’il est lié à des départements). */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.enseignant.findUnique({
      where: { id },
      include: { departements: { take: 1 } },
    });
    if (!existant) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Enseignant introuvable',
      );
    }

    if (existant.departements.length > 0) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Impossible de supprimer un enseignant lié à un ou plusieurs départements',
        { departements: existant.departements.length },
      );
    }

    await this.prisma.enseignant.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'Enseignant',
      entiteId: id,
      metadonnees: { matricule: existant.matricule },
    });

    this.logger.log(`Enseignant supprimé : ${existant.matricule}`);
    return { id };
  }
}