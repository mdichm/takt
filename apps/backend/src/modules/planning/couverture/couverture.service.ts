// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import {
  GARDE_COUVERTURE,
  IGardeCouverture,
  ResultatCouvertureLocal,
} from '../../common/di/garde-couverture.token';

/**
 * Types locaux (miroir de @takt/charge-engine) pour l'import des données
 * depuis Prisma. La valeur `computeCouverture` est chargée par import
 * dynamique (backend CommonJS ↔ package ESM).
 */
interface AffectationCouvertureEntree {
  id: string;
  departementId: string;
  volumeHebdo: number;
}

interface SeanceCouvertureEntree {
  id: string;
  affectationId: string;
  nbCreneaux: number;
  dureeCreneauMinutes: number;
}

/**
 * Calcul et garde de la couverture pédagogique d'une version (TAKT-L06-09).
 *
 * Règle métier : une version ne peut pas passer en `valid_pedag` si sa
 * couverture pédagogique n'est pas exactement de 100 % sur toutes ses
 * affectations, et qu'il n'existe aucune séance orpheline.
 *
 * Dépend uniquement de `common` (Prisma) — aucun import statique de
 * `planning` depuis `versions`, pas de cycle.
 */
@Injectable()
export class CouvertureService implements IGardeCouverture {
  private readonly logger = new Logger(CouvertureService.name);

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /**
   * Calcule la couverture pédagogique complète d'une version.
   *
   * @param versionId - Identifiant de la version
   * @returns Résultat détaillé par affectation et par département
   */
  async calculerCouverture(
    versionId: string,
  ): Promise<ResultatCouvertureLocal> {
    // 1. Affectations de la version
    const affectations = await this.prisma.affectationPedagogique.findMany({
      where: { versionId },
      select: { id: true, departementId: true, volumeHebdo: true },
    });

    // 2. Séances de la version avec la durée du créneau de début
    const seances = await this.prisma.seance.findMany({
      where: { versionId },
      select: {
        id: true,
        affectationId: true,
        nbCreneaux: true,
        creneauDebut: { select: { dureeMinutes: true } },
      },
    });

    const entitesAffectations: AffectationCouvertureEntree[] =
      affectations.map((a) => ({
        id: a.id,
        departementId: a.departementId,
        volumeHebdo: a.volumeHebdo,
      }));

    const entitesSeances: SeanceCouvertureEntree[] = seances.map((s) => ({
      id: s.id,
      affectationId: s.affectationId,
      nbCreneaux: s.nbCreneaux,
      dureeCreneauMinutes: s.creneauDebut.dureeMinutes,
    }));

    // 3. Import dynamique du moteur pur (ESM, backend CJS)
    let resultat: ResultatCouvertureLocal;
    try {
      // any-justify: import dynamique d'un package ESM, type résolu à l'exécution
      const engine = (await import('@takt/charge-engine')) as {
        computeCouverture: (
          affectations: readonly AffectationCouvertureEntree[],
          seances: readonly SeanceCouvertureEntree[],
        ) => ResultatCouvertureLocal;
      };
      resultat = engine.computeCouverture(entitesAffectations, entitesSeances);
    } catch (err) {
      this.logger.error(
        'Impossible d\'exécuter le moteur de couverture',
        err as Error,
      );
      throw new ApiError(
        CODES_ERREUR_API.INTERNAL,
        500,
        'Échec du calcul de couverture pédagogique',
      );
    }

    return resultat;
  }

  /**
   * Garde de soumission : vérifie que la couverture est exactement 100 %.
   *
   * @throws ApiError 400 `VALIDATION_ERROR` si couverture < 100 %, > 100 %,
   *         ou séance orpheline
   */
  async verifierSoumission(versionId: string): Promise<void> {
    const couverture = await this.calculerCouverture(versionId);

    if (!couverture.estConforme) {
      const details = {
        tauxGlobal: couverture.tauxGlobal,
        parAffectation: couverture.parAffectation.map((a) => ({
          affectationId: a.affectationId,
          statut: a.statut,
          taux: a.taux,
        })),
        seancesOrphelines: couverture.seancesOrphelines,
      };

      const sousCouv = couverture.parAffectation.some(
        (a: { statut: string }) => a.statut === 'SOUS_PLANIFICATION',
      );
      const surCouv = couverture.parAffectation.some(
        (a: { statut: string }) => a.statut === 'SUR_PLANIFICATION',
      );

      let message = 'Couverture pédagogique incomplète';
      if (sousCouv && surCouv) {
        message =
          'Couverture pédagogique incomplète : affectations sous et sur-planifiées';
      } else if (sousCouv) {
        message = 'Couverture pédagogique incomplète : sous-planification';
      } else if (surCouv) {
        message = 'Couverture pédagogique incomplète : sur-planification';
      } else if (couverture.seancesOrphelines.length > 0) {
        message = 'Séances orphelines détectées';
      }

      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        message,
        details,
      );
    }
  }
}

// Export du jeton pour le branchement DI (versions injecte ce jeton).
export { GARDE_COUVERTURE };