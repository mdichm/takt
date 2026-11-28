// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type { ChargeRuleSetCreate, ChargeRuleSetUpdate } from '@takt/contracts';

/**
 * Service de gestion des règles de charge (ChargeRuleSet).
 *
 * Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class ChargeRuleSetService {
  private readonly logger = new Logger(ChargeRuleSetService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Liste paginée des règles de charge. */
  async list(query: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) {
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
      this.prisma.chargeRuleSet.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.chargeRuleSet.count({ where }),
    ]);

    return {
      items: items.map((c) => ({
        id: c.id,
        code: c.code,
        libelle: c.libelle,
        version: c.version,
        estActive: c.estActive,
        seuilAlerte: c.seuilAlerte,
        plafondHebdomadaire: c.plafondHebdomadaire,
        arrondi: c.arrondi,
        dureeJournee: c.dureeJournee,
        dureeDemiJournee: c.dureeDemiJournee,
        coefficientsParType: c.coefficientsParType,
        cibleHebdomadaireParGrade: c.cibleHebdomadaireParGrade,
        toleranceEquilibrage: c.toleranceEquilibrage,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère une règle de charge par son ID. */
  async getOne(id: string) {
    const crs = await this.prisma.chargeRuleSet.findUnique({ where: { id } });
    if (!crs) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Règle de charge introuvable');
    }
    return crs;
  }

  /** Récupère la règle de charge active. */
  async getActif() {
    const crs = await this.prisma.chargeRuleSet.findFirst({
      where: { estActive: true },
    });
    if (!crs) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Aucune règle de charge active',
      );
    }
    return crs;
  }
  /** Crée une règle de charge. */
  async create(donnees: ChargeRuleSetCreate, utilisateurIdCreePar: string) {
    const existant = await this.prisma.chargeRuleSet.findFirst({
      where: { code: donnees.code },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Une règle de charge avec ce code existe déjà',
        { champ: 'code' },
      );
    }

    const cree = await this.prisma.chargeRuleSet.create({
      data: {
        code: donnees.code,
        libelle: donnees.libelle,
        version: 1,
        estActive: donnees.estActive ?? false,
        seuilAlerte: donnees.seuilAlerte ?? 90,
        plafondHebdomadaire: donnees.plafondHebdomadaire ?? 20,
        arrondi: donnees.arrondi ?? 'UNITAIRE',
        dureeJournee: donnees.dureeJournee ?? 7,
        dureeDemiJournee: donnees.dureeDemiJournee ?? 3.5,
        coefficientsParType: donnees.coefficientsParType,
        cibleHebdomadaireParGrade: donnees.cibleHebdomadaireParGrade ?? {},
        toleranceEquilibrage: donnees.toleranceEquilibrage ?? 5,
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'ChargeRuleSet',
      entiteId: cree.id,
      metadonnees: { code: cree.code, libelle: cree.libelle },
    });

    this.logger.log(`ChargeRuleSet créée : ${cree.code}`);
    return cree;
  }

  /** Met à jour une règle de charge. */
  async update(id: string, donnees: ChargeRuleSetUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.chargeRuleSet.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Règle de charge introuvable');
    }

    const modifie = await this.prisma.chargeRuleSet.update({
      where: { id },
      data: {
        ...(donnees.libelle !== undefined && { libelle: donnees.libelle }),
        ...(donnees.seuilAlerte !== undefined && { seuilAlerte: donnees.seuilAlerte }),
        ...(donnees.plafondHebdomadaire !== undefined && {
          plafondHebdomadaire: donnees.plafondHebdomadaire,
        }),
        ...(donnees.arrondi !== undefined && { arrondi: donnees.arrondi }),
        ...(donnees.dureeJournee !== undefined && { dureeJournee: donnees.dureeJournee }),
        ...(donnees.dureeDemiJournee !== undefined && {
          dureeDemiJournee: donnees.dureeDemiJournee,
        }),
        ...(donnees.coefficientsParType !== undefined && {
          coefficientsParType: donnees.coefficientsParType,
        }),
        ...(donnees.cibleHebdomadaireParGrade !== undefined && {
          cibleHebdomadaireParGrade: donnees.cibleHebdomadaireParGrade,
        }),
        ...(donnees.toleranceEquilibrage !== undefined && {
          toleranceEquilibrage: donnees.toleranceEquilibrage,
        }),
        ...(donnees.estActive !== undefined && { estActive: donnees.estActive }),
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'ChargeRuleSet',
      entiteId: id,
      metadonnees: { code: modifie.code, libelle: modifie.libelle },
    });

    this.logger.log(`ChargeRuleSet modifiée : ${modifie.code}`);
    return modifie;
  }

  /** Supprime une règle de charge. */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.chargeRuleSet.findUnique({
      where: { id },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Règle de charge introuvable');
    }

    await this.prisma.chargeRuleSet.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'ChargeRuleSet',
      entiteId: id,
      metadonnees: { code: existant.code },
    });

    this.logger.log(`ChargeRuleSet supprimée : ${existant.code}`);
    return { id };
  }
}