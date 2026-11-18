// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient, Prisma, TypeVerrou } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { buildPrismaQuery, ConfigurationRequeteListe } from '../../common/pagination/build-prisma-query';
import { construireDonneesPaginees } from '../../common/pagination/pagination-normalizer';
import type { LockCreateInput, LockListFilters, Lock } from '@takt/contracts';

/** Etats de version dans lesquels la pose / levee d'un verrou reste autorisee.
 * Une version `valid_pedag` est verrouillee et immuable (GG-09). */
const ETATS_VERROUABLES = ['initial', 'rep_pedag', 'brouillon', 'generation', 'edition'];
const POIDS_DEFAUT = 100;
const ENTITE = 'VerrouSeance';

interface VerrouAvecVersion {
  id: string;
  versionId: string;
  seanceId: string;
  utilisateurId: string;
  type: TypeVerrou;
  valeur: string;
  poids: number;
  datePose: Date;
}

@Injectable()
export class VerrouService {
  private readonly logger = new Logger(VerrouService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
  ) {}

  /**
   * Pose un verrou sur une seance (individuelle) ou sur la portee indiquee
   * (en masse par groupe / enseignant / salle). Retourne un verrou par seance.
   * Leve 409 si la version est immuable ; 404 si la version/la seance est introuvable.
   */
  async poserVerrou(input: LockCreateInput, utilisateurId: string): Promise<Lock[]> {
    const version = await this.prisma.version.findUnique({
      where: { id: input.versionId },
      select: { id: true, etat: true },
    });
    if (!version) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Version introuvable');
    }
    if (!ETATS_VERROUABLES.includes(version.etat)) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Cette version est verrouillee (publiee) : aucun verrou ne peut etre pose.',
      );
    }

    const seancesCibles: Array<{ id: string }> = [];
    if (input.seanceId) {
      const seance = await this.prisma.seance.findUnique({
        where: { id: input.seanceId },
        select: { id: true, versionId: true },
      });
      if (!seance || seance.versionId !== input.versionId) {
        throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Seance introuvable dans cette version.');
      }
      seancesCibles.push({ id: seance.id });
    } else if (input.portee) {
      // Pose en masse par portee.
      switch (input.portee.cible) {
        case 'GROUPE': {
          const trouvees = await this.prisma.seance.findMany({
            where: { versionId: input.versionId, groupeId: input.portee.groupeId },
            select: { id: true },
          });
          seancesCibles.push(...trouvees);
          break;
        }
        case 'ENSEIGNANT': {
          const trouvees = await this.prisma.seance.findMany({
            where: { versionId: input.versionId, enseignantId: input.portee.enseignantId },
            select: { id: true },
          });
          seancesCibles.push(...trouvees);
          break;
        }
        case 'SALLE': {
          const trouvees = await this.prisma.seance.findMany({
            where: { versionId: input.versionId, salleId: input.portee.salleId },
            select: { id: true },
          });
          seancesCibles.push(...trouvees);
          break;
        }
        default:
          break;
      }
      if (seancesCibles.length === 0) {
        throw new ApiError(
          CODES_ERREUR_API.NOT_FOUND,
          404,
          'Aucune séance ne correspond à cette portée.',
        );
      }
    }

    // 3. Creation d'un verrou par séance (transaction).
    const poids = input.poids ?? POIDS_DEFAUT;
    const verrous = await this.prisma.$transaction(
      seancesCibles.map((s) =>
        this.prisma.verrouSeance.create({
          data: {
            versionId: input.versionId,
            seanceId: s.id,
            utilisateurId,
            type: input.type,
            valeur: input.valeur,
            poids,
          },
        }),
      ),
    );

    // 4. Audit (GG-07).
    await this.prisma.journalAudit.create({
      data: {
        action: 'POSE_VERROU',
        utilisateurId,
        entite: ENTITE,
        entiteId: input.seanceId ?? version.id,
        metadonnees: {
          type: input.type,
          valeur: input.valeur,
          poids,
          seanceIds: verrous.map((v) => v.seanceId),
          nbVerrous: verrous.length,
        },
      },
    });

    this.logger.log(`${verrous.length} verrou(x) pose(x) sur la version ${version.id}`);
    return verrous.map((v) => this.versDto(v));
  }

  /**
   * Leve un verrou par son id.
   * Seul le poseur du verrou peut le lever sur une version non verrouillee.
   */
  async leverVerrou(id: string, utilisateurId: string): Promise<Lock> {
    const verrou = await this.prisma.verrouSeance.findUnique({
      where: { id },
      include: { version: { select: { etat: true } } },
    });
    if (!verrou) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Verrou introuvable');
    }
    if (!ETATS_VERROUABLES.includes(verrou.version.etat)) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Cette version est verrouillee (publiee) : le verrou ne peut pas etre leve.',
      );
    }
    if (verrou.utilisateurId !== utilisateurId) {
      throw new ApiError(
        CODES_ERREUR_API.FORBIDDEN,
        403,
        'Seul l utilisateur qui a pose ce verrou peut le lever.',
      );
    }

    await this.prisma.verrouSeance.delete({ where: { id } });

    await this.prisma.journalAudit.create({
      data: {
        action: 'LEVEE_VERROU',
        utilisateurId,
        entite: ENTITE,
        entiteId: id,
        metadonnees: {
          versionId: verrou.versionId,
          seanceId: verrou.seanceId,
          type: verrou.type,
          valeur: verrou.valeur,
        },
      },
    });

    this.logger.log(`Verrou leve : ${id}`);
    return this.versDto(verrou);
  }

  /* ------------------------------------------------------------------ */
  /* Lecture                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Liste paginee des verrous d'une version (ou de toutes les versions).
   */
  async lister(filtres: LockListFilters): Promise<{ data: Lock[]; meta: { page: number; pageSize: number; total: number } }> {
    const { page, pageSize, sortBy, sortDirection, ...filtresMetier } = filtres;

    const pageDefaut = page ?? 1;
    const pageSizeDefaut = pageSize ?? 20;

    const configuration: ConfigurationRequeteListe<
      Record<string, unknown>,
      Partial<Prisma.VerrouSeanceOrderByWithRelationInput>
    > = {
      where: () => {
        const where: Record<string, unknown> = {};
        if (filtresMetier.versionId) where.versionId = filtresMetier.versionId;
        if (filtresMetier.seanceId) where.seanceId = filtresMetier.seanceId;
        if (filtresMetier.type) where.type = filtresMetier.type;
        if (filtresMetier.valeur) where.valeur = filtresMetier.valeur;
        return where;
      },
      searchFields: {},
      sortFields: {
        datePose: (direction: 'asc' | 'desc') => ({ datePose: direction }),
        type: (direction: 'asc' | 'desc') => ({ type: direction }),
        seanceId: (direction: 'asc' | 'desc') => ({ seanceId: direction }),
      },
      defaultSort: () => ({ datePose: 'desc' }),
    };

    const { where, orderBy, skip, take } = buildPrismaQuery(
      { page: pageDefaut, pageSize: pageSizeDefaut, sortBy, sortDirection },
      configuration,
    );

    const [items, total] = await this.prisma.$transaction([
      this.prisma.verrouSeance.findMany({ where, orderBy, skip, take }),
      this.prisma.verrouSeance.count({ where }),
    ]);

    return construireDonneesPaginees(
      items.map((v) => this.versDto(v)),
      total,
      { page: pageDefaut, pageSize: pageSizeDefaut },
    );
  }

  /** Verrou (le cas echeant) pose sur une seance. */
  async verrouSurSeance(seanceId: string) {
    return this.prisma.verrouSeance.findFirst({
      where: { seanceId },
      select: { id: true, utilisateurId: true, type: true, valeur: true, poids: true },
    });
  }

  /**
   * Verifie qu'une seance peut etre editee.
   * Leve 423 `SEANCE_LOCKED` si un verrou actif existe sur la seance et que
   * l'appelant n'en est pas le poseur.
   */
  async verifierEditionSeance(seanceId: string, utilisateurId: string): Promise<void> {
    const verrou = await this.verrouSurSeance(seanceId);
    if (verrou && verrou.utilisateurId !== utilisateurId) {
      throw new ApiError(
        CODES_ERREUR_API.LOCKED,
        423,
        'Cette séance est verrouillée et ne peut pas être modifiée.',
        {
          verrouId: verrou.id,
          type: verrou.type,
          valeur: verrou.valeur,
        },
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /* Prives                                                             */
  /* ------------------------------------------------------------------ */

  private versDto(verrou: VerrouAvecVersion): Lock {
    return {
      id: verrou.id,
      versionId: verrou.versionId,
      seanceId: verrou.seanceId,
      utilisateurId: verrou.utilisateurId,
      type: verrou.type,
      valeur: verrou.valeur,
      poids: verrou.poids,
      datePose: verrou.datePose.toISOString(),
    };
  }
}

