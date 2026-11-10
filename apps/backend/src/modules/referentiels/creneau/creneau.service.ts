// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type { CreneauCreate, CreneauUpdate, CreneauListFilters } from '@takt/contracts';

/**
 * Service de gestion des créneaux de la grille horaire (L04-05).
 *
 * Chaque mutation est journalisée (GG-07).
 * La continuité des ordres est garantie par contrainte applicative :
 * pour un jour donné, les ordres doivent former une suite sans trou.
 */
@Injectable()
export class CreneauService {
  private readonly logger = new Logger(CreneauService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Crée un créneau. Vérifie l'unicité [jour, ordre] et la continuité des ordres du jour. */
  async create(donnees: CreneauCreate, utilisateurIdCreePar: string) {
    // Unicité [jour, ordre]
    const existant = await this.prisma.creneau.findFirst({
      where: { jour: donnees.jour, ordre: donnees.ordre },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Un créneau avec ce jour et cet ordre existe déjà',
        { champ: 'ordre' },
      );
    }

    // Vérifier la continuité : l'ordre ne doit pas créer de trou
    if (donnees.ordre > 1) {
      const precedent = await this.prisma.creneau.findFirst({
        where: { jour: donnees.jour, ordre: donnees.ordre - 1 },
      });
      if (!precedent) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Rupture de continuité : le créneau précédent (ordre-1) est manquant pour ce jour',
          { champ: 'ordre' },
        );
      }
    }

    // Vérifier la cohérence horaire : heureFin > heureDebut
    const debut = new Date(donnees.heureDebut).getTime();
    const fin = new Date(donnees.heureFin).getTime();
    if (fin <= debut) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'heureFin doit être postérieure à heureDebut',
        { champ: 'heureFin' },
      );
    }

    const creneau = await this.prisma.creneau.create({
      data: {
        jour: donnees.jour,
        ordre: donnees.ordre,
        heureDebut: new Date(donnees.heureDebut),
        heureFin: new Date(donnees.heureFin),
        dureeMinutes: donnees.dureeMinutes ?? 30,
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'Creneau',
      entiteId: creneau.id,
      metadonnees: {
        jour: creneau.jour,
        ordre: creneau.ordre,
        heureDebut: creneau.heureDebut,
        heureFin: creneau.heureFin,
        dureeMinutes: creneau.dureeMinutes,
      },
    });

    this.logger.log(`Creneau créé : jour=${creneau.jour}, ordre=${creneau.ordre}`);
    return creneau;
  }

  /** Récupère un créneau par son ID. 404 si introuvable. */
  async getOne(id: string) {
    const creneau = await this.prisma.creneau.findUnique({ where: { id } });
    if (!creneau) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Creneau introuvable');
    }
    return creneau;
  }

  /** Liste paginée des créneaux avec filtres. */
  async list(filtres: CreneauListFilters) {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'ordre',
      sortDirection = 'asc',
      jour,
      search,
    } = filtres;

    const where: Record<string, unknown> = {};
    if (jour !== undefined) {
      where.jour = Number(jour);
    }
    if (search) {
      where.OR = [
        { heureDebut: { contains: search, mode: 'insensitive' } },
        { heureFin: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.creneau.findMany({
        where,
        orderBy: { [sortBy]: sortDirection },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.creneau.count({ where }),
    ]);

    return {
      items,
      meta: { page, pageSize, total },
    };
  }

  /** Met à jour un créneau. Vérifie la continuité et l'unicité [jour, ordre]. */
  async update(id: string, donnees: CreneauUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.creneau.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Creneau introuvable');
    }

    // Si l'ordre change, vérifier l'unicité et la continuité
    if (donnees.ordre !== undefined && donnees.ordre !== existant.ordre) {
      const conflit = await this.prisma.creneau.findFirst({
        where: { jour: donnees.jour ?? existant.jour, ordre: donnees.ordre },
      });
      if (conflit) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Un créneau avec ce jour et cet ordre existe déjà',
          { champ: 'ordre' },
        );
      }

      // Continuité : si ordre > 1, l'ordre-1 doit exister (pour le nouveau jour)
      const jourCible = donnees.jour ?? existant.jour;
      if (donnees.ordre > 1) {
        const precedent = await this.prisma.creneau.findFirst({
          where: { jour: jourCible, ordre: donnees.ordre - 1 },
        });
        if (!precedent) {
          throw new ApiError(
            CODES_ERREUR_API.BAD_REQUEST,
            400,
            'Rupture de continuité : le créneau précédent (ordre-1) est manquant pour ce jour',
            { champ: 'ordre' },
          );
        }
      }
    }

    // Vérifier la cohérence horaire si les deux dates changent
    if (donnees.heureDebut !== undefined || donnees.heureFin !== undefined) {
      const debut = new Date(donnees.heureDebut ?? existant.heureDebut).getTime();
      const fin = new Date(donnees.heureFin ?? existant.heureFin).getTime();
      if (fin <= debut) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'heureFin doit être postérieure à heureDebut',
          { champ: 'heureFin' },
        );
      }
    }

    const modifie = await this.prisma.creneau.update({
      where: { id },
      data: {
        ...(donnees.jour !== undefined && { jour: donnees.jour }),
        ...(donnees.ordre !== undefined && { ordre: donnees.ordre }),
        ...(donnees.heureDebut !== undefined && { heureDebut: new Date(donnees.heureDebut) }),
        ...(donnees.heureFin !== undefined && { heureFin: new Date(donnees.heureFin) }),
        ...(donnees.dureeMinutes !== undefined && { dureeMinutes: donnees.dureeMinutes }),
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'Creneau',
      entiteId: id,
      metadonnees: {
        jour: modifie.jour,
        ordre: modifie.ordre,
        heureDebut: modifie.heureDebut,
        heureFin: modifie.heureFin,
        dureeMinutes: modifie.dureeMinutes,
      },
    });

    this.logger.log(`Creneau modifié : id=${id}`);
    return modifie;
  }

  /** Supprime un créneau. 404 si introuvable. */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.creneau.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Creneau introuvable');
    }

    await this.prisma.creneau.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'Creneau',
      entiteId: id,
      metadonnees: { jour: existant.jour, ordre: existant.ordre },
    });

    this.logger.log(`Creneau supprimé : id=${id}`);
    return { id };
  }
}
