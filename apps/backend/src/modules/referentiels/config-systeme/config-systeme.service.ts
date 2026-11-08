// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type { ConfigSystemeUpdate } from '@takt/contracts';

/**
 * Service de gestion des paramètres système (singleton) (L04-05).
 *
 * Une seule ligne de configuration existe (singleton).
 * Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class ConfigSystemeService {
  private readonly logger = new Logger(ConfigSystemeService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Récupère (ou crée si absente) la configuration système singleton. */
  async getOrCreate() {
    let config = await this.prisma.configSysteme.findFirst();
    if (!config) {
      config = await this.prisma.configSysteme.create({
        data: {
          pasDeTempsMinutes: 30,
          joursOuvres: '1,2,3,4,5,6',
          creneauxParJour: 24,
        },
      });
      this.logger.log('ConfigSysteme créée (défaut)');
    }
    return config;
  }

  /** Récupère la configuration système. 404 si absente. */
  async getOne() {
    const config = await this.prisma.configSysteme.findFirst();
    if (!config) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Configuration système introuvable');
    }
    return config;
  }

  /** Met à jour la configuration système (singleton). */
  async update(donnees: ConfigSystemeUpdate, utilisateurIdModifiePar: string) {
    const existant = await this.prisma.configSysteme.findFirst();
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Configuration système introuvable');
    }

    // Garde métier : les valeurs doivent être positives (défense en complément du schéma Zod)
    if (donnees.pasDeTempsMinutes !== undefined && donnees.pasDeTempsMinutes <= 0) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Le pas de temps doit être supérieur à 0',
        { champ: 'pasDeTempsMinutes' },
      );
    }
    if (donnees.creneauxParJour !== undefined && donnees.creneauxParJour <= 0) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Le nombre de créneaux par jour doit être supérieur à 0',
        { champ: 'creneauxParJour' },
      );
    }

    const modifie = await this.prisma.configSysteme.update({
      where: { id: existant.id },
      data: {
        ...(donnees.pasDeTempsMinutes !== undefined && {
          pasDeTempsMinutes: donnees.pasDeTempsMinutes,
        }),
        ...(donnees.joursOuvres !== undefined && { joursOuvres: donnees.joursOuvres }),
        ...(donnees.creneauxParJour !== undefined && { creneauxParJour: donnees.creneauxParJour }),
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'ConfigSysteme',
      entiteId: modifie.id,
      metadonnees: {
        pasDeTempsMinutes: modifie.pasDeTempsMinutes,
        joursOuvres: modifie.joursOuvres,
        creneauxParJour: modifie.creneauxParJour,
      },
    });

    this.logger.log(`ConfigSysteme modifiée : id=${modifie.id}`);
    return modifie;
  }
}
