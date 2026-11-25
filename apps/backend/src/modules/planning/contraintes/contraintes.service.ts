// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import {
  buildPrismaQuery,
  ConfigurationRequeteListe,
} from '../../common/pagination/build-prisma-query';
import { construireDonneesPaginees } from '../../common/pagination/pagination-normalizer';
import {
  type ContrainteListFilters,
} from '@takt/contracts';

/**
 * Service des contraintes de génération sur une version.
 *
 * Dépend uniquement de `CommonModule` (Prisma) — pas d'import du module
 * `audit` (règle de dépendance ST_TAKT §1.2). L'écriture du `JournalAudit`
 * est faite directement via Prisma, à l'identique de `BailService`.
 *
 * Règles :
 * - Toute mutation est refusée (409 WORKFLOW_INVALID_TRANSITION) si la
 *   version n'est pas en état `brouillon`.
 * - Un doublon exact (même versionId, type, cibleId, valeur) lève un 409.
 * - Une contradiction (préférence ↔ indisponibilité sur même cible/jour/créneau)
 *   est signalée comme avertissement, non bloquante.
 * - `poids` est optionnel : null ⇒ poids canonique du type (selon mapping).
 * - `estActif` permet de désactiver une contrainte sans la supprimer.
 */
@Injectable()
export class ContraintesService {
  private readonly logger = new Logger(ContraintesService.name);

  // Poids canoniques par type de contrainte (alignés sur mapping.ts).
  private readonly POIDS_CANONIQUE: Record<string, number> = {
    INDISPONIBILITE: 100,
    EXIGENCE_SALLE: 100,
    PREFERENCE_CRENEAU: 30,
    CRENEAU_EVITE: 20,
    JOUR_PREFERE: 25,
    SALLE_PREFEREE: 15,
    SEANCES_CONSECUTIVES: 40,
    PAS_DE_TROUS_GROUPE: 35,
    PAS_DE_TROUS_ENSEIGNANT: 30,
    JOURNEES_COMPACTES: 25,
    CHARGE_MAX_JOUR: 50,
    CHARGE_MAX_SEMAINE: 60,
    EQUILIBRAGE_CHARGE: 30,
  };

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /* ------------------------------------------------------------------ */
  /* Lecture                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Liste paginée des contraintes d'une version.
   * Endpoint : GET /api/v1/contraintes
   */
  async lister(filtres: ContrainteListFilters) {
    const { page, pageSize, sortBy, sortDirection, search, ...filtresMetier } =
      filtres;

    const configuration: ConfigurationRequeteListe<
      Record<string, unknown>,
      Record<string, unknown>
    > = {
      where: () => {
        const where: Record<string, unknown> = {};
        if (filtresMetier.versionId) {
          where.versionId = filtresMetier.versionId;
        }
        if (filtresMetier.type) {
          where.type = filtresMetier.type;
        }
        if (filtresMetier.cibleId) {
          where.cibleId = filtresMetier.cibleId;
        }
        if (filtresMetier.estActif !== undefined) {
          where.estActif = filtresMetier.estActif;
        }
        return where;
      },
      searchFields: {
        type: (valeur) => ({
          type: { contains: valeur, mode: 'insensitive' as const },
        }),
      },
      sortFields: {
        type: (direction: 'asc' | 'desc') => ({ type: direction }),
        createdAt: (direction: 'asc' | 'desc') => ({ createdAt: direction }),
      },
      defaultSort: () => ({ createdAt: 'desc' }),
    };

    const { where, orderBy, skip, take } = buildPrismaQuery(
      {
        page,
        pageSize,
        sortBy,
        sortDirection,
        search,
      },
      configuration,
    );

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contrainte.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          versionId: true,
          type: true,
          cibleId: true,
          valeur: true,
          poids: true,
          estActif: true,
          createdAt: true,
        },
      }),
      this.prisma.contrainte.count({ where }),
    ]);

    return construireDonneesPaginees(items, total, {
      page: page ?? 1,
      pageSize: pageSize ?? 20,
    } as never);
  }

  /**
   * Détecte les conflits potentiels des contraintes d'une version.
   * Endpoint : GET /api/v1/contraintes/conflits?versionId=
   */
  async detecterConflits(versionId: string) {
    const contraintes = await this.prisma.contrainte.findMany({
      where: { versionId, estActif: true },
      select: { id: true, type: true, cibleId: true, valeur: true },
    });

    const conflits: Array<{
      contrainteId: string | null;
      type: 'DOUBLON' | 'CONTRADICTION';
      message: string;
      details?: Record<string, unknown>;
    }> = [];

    // 1. Doublons exacts (même type, même cibleId, même valeur)
    const groupes = new Map<string, string[]>();
    for (const c of contraintes) {
      const cle = `${c.type}:${c.cibleId}:${c.valeur}`;
      const existants = groupes.get(cle) ?? [];
      if (existants.length > 0) {
        conflits.push({
          contrainteId: c.id,
          type: 'DOUBLON',
          message: `Doublon de contrainte "${c.type}" sur la cible ${c.cibleId}`,
          details: { type: c.type, cibleId: c.cibleId, valeur: c.valeur },
        });
      }
      groupes.set(cle, [...existants, c.id]);
    }

    // 2. Contradictions : INDISPONIBILITE vs PREFERENCE_CRENEAU/CRENEAU_EVITE
    //    sur même cible et même jour/créneau.
    const indisponibilites = contraintes.filter(
      (c) => c.type === 'INDISPONIBILITE',
    );
    const preferences = contraintes.filter(
      (c) =>
        c.type === 'PREFERENCE_CRENEAU' || c.type === 'CRENEAU_EVITE',
    );

    for (const ind of indisponibilites) {
      const indVal = this.parserValeurJSON(ind.valeur);
      if (!indVal) continue;
      for (const pref of preferences) {
        if (pref.cibleId !== ind.cibleId) continue;
        const prefVal = this.parserValeurJSON(pref.valeur);
        if (!prefVal || !('day' in prefVal) || !('slot' in prefVal)) continue;
        if (
          'day' in indVal &&
          'slots' in indVal &&
          indVal.day === prefVal.day &&
          Array.isArray(indVal.slots) &&
          indVal.slots.includes(prefVal.slot)
        ) {
          conflits.push({
            contrainteId: pref.id,
            type: 'CONTRADICTION',
            message: `Contradiction : ${pref.type} en conflit avec une indisponibilité le jour ${indVal.day} créneau ${prefVal.slot}`,
            details: {
              indisponibiliteId: ind.id,
              preferenceId: pref.id,
              cibleId: ind.cibleId,
              jour: indVal.day,
              creneau: prefVal.slot,
            },
          });
        }
      }
    }

    return { conflits };
  }

  /* ------------------------------------------------------------------ */
  /* Écriture                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Crée une contrainte sur une version.
   * Endpoint : POST /api/v1/contraintes
   */
  async creer(
    donnees: {
      versionId: string;
      type: string;
      cibleId: string;
      valeur: unknown;
      poids?: number | null;
      estActif?: boolean;
    },
    utilisateurId: string,
  ) {
    // 1. Vérifier que la version existe et est en brouillon
    const version = await this.prisma.version.findUnique({
      where: { id: donnees.versionId },
      select: { id: true, etat: true },
    });
    if (!version) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Version introuvable');
    }
    if (version.etat !== 'brouillon') {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Les contraintes ne peuvent être modifiées que sur une version en brouillon',
        { versionId: donnees.versionId, etat: version.etat },
      );
    }

    // 2. Vérifier l'absence de doublon exact
    const valeurSerialisee =
      typeof donnees.valeur === 'string'
        ? donnees.valeur
        : JSON.stringify(donnees.valeur);
    const existant = await this.prisma.contrainte.findFirst({
      where: {
        versionId: donnees.versionId,
        type: donnees.type,
        cibleId: donnees.cibleId,
        valeur: valeurSerialisee,
      },
      select: { id: true },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Une contrainte identique existe déjà sur cette version et cette cible',
        {
          versionId: donnees.versionId,
          type: donnees.type,
          cibleId: donnees.cibleId,
          contrainteId: existant.id,
        },
      );
    }

    // 3. Détecter les contradictions (avertissements, non bloquant)
    const avertissements: string[] = [];
    const { conflits } = await this.detecterConflits(donnees.versionId);
    for (const c of conflits) {
      if (c.type === 'CONTRADICTION') {
        avertissements.push(c.message);
      }
    }

    // 4. Poids : valeur fournie ou poids canonique du type
    const poids = donnees.poids ?? this.POIDS_CANONIQUE[donnees.type] ?? null;

    // 5. Créer la contrainte
    const contrainte = await this.prisma.contrainte.create({
      data: {
        versionId: donnees.versionId,
        type: donnees.type,
        cibleId: donnees.cibleId,
        valeur: valeurSerialisee,
        poids,
        estActif: donnees.estActif ?? true,
      },
      select: {
        id: true,
        versionId: true,
        type: true,
        cibleId: true,
        valeur: true,
        poids: true,
        estActif: true,
        createdAt: true,
      },
    });

    // 6. Journal d'audit (GG-07) — écriture directe via Prisma
    await this.prisma.journalAudit.create({
      data: {
        action: 'CREATION',
        utilisateurId,
        entite: 'Contrainte',
        entiteId: contrainte.id,
        metadonnees: {
          versionId: donnees.versionId,
          type: donnees.type,
          cibleId: donnees.cibleId,
          poids,
          estActif: contrainte.estActif,
        },
      },
    });

    this.logger.log(
      `Contrainte ${contrainte.id} créée (version ${donnees.versionId}, type ${donnees.type})`,
    );

    return {
      contrainte,
      avertissements,
    };
  }

  /**
   * Modifie partiellement une contrainte.
   * Endpoint : PATCH /api/v1/contraintes/:id
   */
  async mettreAJour(
    params: { id: string },
    donnees: {
      type?: string;
      cibleId?: string;
      valeur?: unknown;
      poids?: number | null;
      estActif?: boolean;
    },
    utilisateurId: string,
  ) {
    // 1. Récupérer la contrainte existante
    const existant = await this.prisma.contrainte.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        versionId: true,
        type: true,
        cibleId: true,
        valeur: true,
        poids: true,
        estActif: true,
      },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Contrainte introuvable');
    }

    // 2. Vérifier que la version est en brouillon
    const version = await this.prisma.version.findUnique({
      where: { id: existant.versionId },
      select: { id: true, etat: true },
    });
    if (!version) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Version introuvable');
    }
    if (version.etat !== 'brouillon') {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Les contraintes ne peuvent être modifiées que sur une version en brouillon',
        { versionId: existant.versionId, etat: version.etat },
      );
    }

    // 3. Construire les données de mise à jour
    const data: Record<string, unknown> = {};
    if (donnees.type !== undefined) data.type = donnees.type;
    if (donnees.cibleId !== undefined) data.cibleId = donnees.cibleId;
    if (donnees.valeur !== undefined) {
      data.valeur =
        typeof donnees.valeur === 'string'
          ? donnees.valeur
          : JSON.stringify(donnees.valeur);
    }
    if (donnees.poids !== undefined) data.poids = donnees.poids;
    if (donnees.estActif !== undefined) data.estActif = donnees.estActif;

    if (Object.keys(data).length === 0) {
      // Rien à modifier — retourner l'existant
      return existant;
    }

    // 4. Vérifier l'absence de doublon (si type/cibleId/valeur changés)
    if (
      donnees.type !== undefined ||
      donnees.cibleId !== undefined ||
      donnees.valeur !== undefined
    ) {
      const doublon = await this.prisma.contrainte.findFirst({
        where: {
          id: { not: params.id },
          versionId: existant.versionId,
          type: donnees.type ?? existant.type,
          cibleId: donnees.cibleId ?? existant.cibleId,
          valeur:
            typeof donnees.valeur === 'string'
              ? donnees.valeur
              : donnees.valeur !== undefined
                ? JSON.stringify(donnees.valeur)
                : existant.valeur,
        },
        select: { id: true },
      });
      if (doublon) {
        throw new ApiError(
          CODES_ERREUR_API.CONFLICT,
          409,
          'Une contrainte identique existe déjà sur cette version et cette cible',
          {
            versionId: existant.versionId,
            contrainteId: doublon.id,
          },
        );
      }
    }

    // 5. Mettre à jour
    const contrainte = await this.prisma.contrainte.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        versionId: true,
        type: true,
        cibleId: true,
        valeur: true,
        poids: true,
        estActif: true,
        createdAt: true,
      },
    });

    // 6. Journal d'audit (GG-07)
    await this.prisma.journalAudit.create({
      data: {
        action: 'MODIFICATION',
        utilisateurId,
        entite: 'Contrainte',
        entiteId: params.id,
        metadonnees: {
          versionId: existant.versionId,
          champsModifies: Object.keys(data),
          poids: contrainte.poids,
          estActif: contrainte.estActif,
        },
      },
    });

    this.logger.log(`Contrainte ${params.id} modifiée`);

    return contrainte;
  }

  /**
   * Supprime une contrainte.
   * Endpoint : DELETE /api/v1/contraintes/:id
   */
  async supprimer(
    params: { id: string },
    utilisateurId: string,
  ): Promise<void> {
    // 1. Récupérer la contrainte existante
    const existant = await this.prisma.contrainte.findUnique({
      where: { id: params.id },
      select: { id: true, versionId: true, type: true },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Contrainte introuvable');
    }

    // 2. Vérifier que la version est en brouillon
    const version = await this.prisma.version.findUnique({
      where: { id: existant.versionId },
      select: { id: true, etat: true },
    });
    if (!version) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Version introuvable');
    }
    if (version.etat !== 'brouillon') {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Les contraintes ne peuvent être modifiées que sur une version en brouillon',
        { versionId: existant.versionId, etat: version.etat },
      );
    }

    // 3. Supprimer
    await this.prisma.contrainte.delete({
      where: { id: params.id },
    });

    // 4. Journal d'audit (GG-07)
    await this.prisma.journalAudit.create({
      data: {
        action: 'SUPPRESSION',
        utilisateurId,
        entite: 'Contrainte',
        entiteId: params.id,
        metadonnees: {
          versionId: existant.versionId,
          type: existant.type,
        },
      },
    });

    this.logger.log(`Contrainte ${params.id} supprimée`);
  }

  /* ------------------------------------------------------------------ */
  /* Privés                                                             */
  /* ------------------------------------------------------------------ */

  private parserValeurJSON(valeur: string): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(valeur);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
}
