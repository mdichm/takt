// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type { CreneauAffichageCreate, CreneauAffichageUpdate, CreneauAffichageListFilters } from '@takt/contracts';

/**
 * Service de gestion des variantes d'affichage des créneaux (NORMAL / RAMADAN) (L04-05).
 *
 * Les variantes sont disjointes : une seule entrée par variante (contrainte @unique sur `variante`).
 * Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class CreneauAffichageService {
  private readonly logger = new Logger(CreneauAffichageService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Crée une variante d'affichage. 400 si la variante existe déjà. */
  async create(donnees: CreneauAffichageCreate, utilisateurIdCreePar: string) {
    const existant = await this.prisma.creneauAffichage.findUnique({
      where: { variante: donnees.variante },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        `La variante d'affichage ${donnees.variante} existe déjà`,
        { champ: 'variante' },
      );
    }

    const affichage = await this.prisma.creneauAffichage.create({
      data: {
        variante: donnees.variante,
        decalageMinutes: donnees.decalageMinutes ?? 0,
        ...(donnees.plageReduiteMinutes !== undefined && {
          plageReduiteMinutes: donnees.plageReduiteMinutes,
        }),
        libelle: donnees.libelle,
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'CreneauAffichage',
      entiteId: affichage.id,
      metadonnees: {
        variante: affichage.variante,
        decalageMinutes: affichage.decalageMinutes,
        plageReduiteMinutes: affichage.plageReduiteMinutes,
        libelle: affichage.libelle,
      },
    });

    this.logger.log(`CreneauAffichage créé : variante=${affichage.variante}`);
    return affichage;
  }

  /** Récupère une variante d'affichage par son ID. 404 si introuvable. */
  async getOne(id: string) {
    const affichage = await this.prisma.creneauAffichage.findUnique({ where: { id } });
    if (!affichage) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'CreneauAffichage introuvable');
    }
    return affichage;
  }

  /** Récupère une variante d'affichage par son code (NORMAL / RAMADAN). 404 si introuvable. */
  async getByVariante(variante: string) {
    const affichage = await this.prisma.creneauAffichage.findUnique({ where: { variante } });
    if (!affichage) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, `Variante d'affichage ${variante} introuvable`);
    }
    return affichage;
  }

  /** Liste paginée des variantes d'affichage avec filtres. */
  async list(filtres: CreneauAffichageListFilters) {
    const { page = 1, pageSize = 20, sortBy = 'variante', sortDirection = 'asc', variante, search } = filtres;

    const where: Record<string, unknown> = {};
    if (variante) {
      where.variante = variante;
    }
    if (search) {
      where.libelle = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.creneauAffichage.findMany({
        where,
        orderBy: { [sortBy]: sortDirection },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.creneauAffichage.count({ where }),
    ]);

    return {
      items,
      meta: { page, pageSize, total },
    };
  }

  /** Met à jour une variante d'affichage. */
  async update(id: string, donnees: CreneauAffichageUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.creneauAffichage.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'CreneauAffichage introuvable');
    }

    const modifie = await this.prisma.creneauAffichage.update({
      where: { id },
      data: {
        ...(donnees.decalageMinutes !== undefined && { decalageMinutes: donnees.decalageMinutes }),
        ...(donnees.plageReduiteMinutes !== undefined && { plageReduiteMinutes: donnees.plageReduiteMinutes }),
        ...(donnees.libelle !== undefined && { libelle: donnees.libelle }),
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'CreneauAffichage',
      entiteId: id,
      metadonnees: {
        variante: modifie.variante,
        decalageMinutes: modifie.decalageMinutes,
        plageReduiteMinutes: modifie.plageReduiteMinutes,
        libelle: modifie.libelle,
      },
    });

    this.logger.log(`CreneauAffichage modifié : id=${id}`);
    return modifie;
  }

  /** Supprime une variante d'affichage. 404 si introuvable. */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.creneauAffichage.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'CreneauAffichage introuvable');
    }

    await this.prisma.creneauAffichage.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'CreneauAffichage',
      entiteId: id,
      metadonnees: { variante: existant.variante },
    });

    this.logger.log(`CreneauAffichage supprimé : id=${id}`);
    return { id };
  }
}