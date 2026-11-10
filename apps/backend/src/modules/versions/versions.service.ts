// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../common/http/api-error';
import { AuditService } from '../audit/audit.service';
import type { VersionInput, VersionListFilters, VersionParams } from '@takt/contracts';

/**
 * Service de gestion des versions de planning.
 *
 * Une version est liée à un semestre (et donc à une année universitaire).
 * Elle dispose de 10 états canoniques (WORKFLOW_METIER). Une version {@code publie}
 * est immuable (EX-PRI-02) et il ne peut exister qu'une seule version publiee
 * par semestre (TE-DB-05). Chaque mutation est journalisee (GG-07).
 */
@Injectable()
export class VersionsService {
  private readonly logger = new Logger(VersionsService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Verifie qu'une version n'est pas publiee (immuabilite EX-PRI-02). */
  async verifierModifiable(id: string): Promise<void> {
    const version = await this.prisma.version.findUnique({ where: { id } });
    if (!version) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Version introuvable');
    }
    if (version.etat === 'publie') {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Une version publiee est immuable',
        { versionId: id, etat: version.etat },
      );
    }
  }

  /** Cree une version pour un semestre. Etat par defaut : {@code brouillon}. */
  async creer(donnees: VersionInput, utilisateurId: string) {
    const semestre = await this.prisma.semestre.findUnique({
      where: { id: donnees.semestreId },
      select: { id: true, anneeUniversitaireId: true },
    });
    if (!semestre) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Le semestre associe n’existe pas',
        { champ: 'semestreId' },
      );
    }

    const anneeId =
      donnees.anneeId ?? semestre.anneeUniversitaireId;
    if (donnees.anneeId !== undefined && donnees.anneeId !== semestre.anneeUniversitaireId) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        "L'anneeUniversitaire associee ne correspond pas au semestre",
        { champ: 'anneeId' },
      );
    }

    // Etat par defaut : brouillon (sauf publication explicite)
    const etat = donnees.etat ?? 'brouillon';

    // Une seule version publiee par semestre (garde applicative, renforcee par l'index SQL unique partiel)
    if (etat === 'publie') {
      const dejaPubliee = await this.prisma.version.findFirst({
        where: { semestreId: donnees.semestreId, etat: 'publie' },
      });
      if (dejaPubliee) {
        throw new ApiError(
          CODES_ERREUR_API.CONFLICT,
          409,
          'Une version publiee existe deja pour ce semestre',
          { versionPublieeId: dejaPubliee.id },
        );
      }
    }

    const version = await this.prisma.version.create({
      data: {
        semestreId: donnees.semestreId,
        anneeId,
        etat,
        snapshotId: donnees.snapshotId ?? null,
        datePublication: etat === 'publie' ? new Date() : null,
        publiePar: etat === 'publie' ? utilisateurId : null,
      },
      select: {
        id: true,
        semestreId: true,
        anneeId: true,
        etat: true,
        snapshotId: true,
        datePublication: true,
        publiePar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId,
      entite: 'Version',
      entiteId: version.id,
      metadonnees: {
        semestreId: version.semestreId,
        anneeId: version.anneeId,
        etat: version.etat,
        sourceVersionId: donnees.sourceVersionId ?? null,
      },
    });

    this.logger.log(`Version creee : ${version.id} (etat=${version.etat})`);
    return version;
  }

  /** Liste paginée des versions, filtre optionnel sur semestre et etat. */
  async lister(filtres: VersionListFilters) {
    const page = filtres.page ?? 1;
    const pageSize = filtres.pageSize ?? 20;

    const where: Record<string, unknown> = {};
    if (filtres.semestreId) {
      where.semestreId = filtres.semestreId;
    }
    if (filtres.etat) {
      where.etat = filtres.etat;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.version.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          semestreId: true,
          anneeId: true,
          etat: true,
          snapshotId: true,
          datePublication: true,
          publiePar: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.version.count({ where }),
    ]);

    return {
      items,
      meta: { page, pageSize, total },
    };
  }

  /** Recupere une version par son ID. */
  async obtenir(params: VersionParams) {
    const version = await this.prisma.version.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        semestreId: true,
        anneeId: true,
        etat: true,
        snapshotId: true,
        datePublication: true,
        publiePar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!version) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Version introuvable');
    }
    return version;
  }

  /** Duplique une version archivée (etat {@code archive} -> nouvel etat {@code initial}). */
  async dupliquer(id: string, utilisateurId: string) {
    const source = await this.prisma.version.findUnique({
      where: { id },
      select: { id: true, semestreId: true, anneeId: true, etat: true },
    });
    if (!source) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Version introuvable');
    }
    if (source.etat !== 'archive') {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Seule une version archivee peut etre dupliquee',
        { versionId: id, etat: source.etat },
      );
    }

    const doublon = await this.prisma.version.findFirst({
      where: { semestreId: source.semestreId, etat: 'publie' },
    });
    if (doublon) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Une version publiee existe deja pour ce semestre',
        { versionPublieeId: doublon.id },
      );
    }

    const copie = await this.prisma.version.create({
      data: {
        semestreId: source.semestreId,
        anneeId: source.anneeId,
        etat: 'initial',
        snapshotId: null,
      },
      select: {
        id: true,
        semestreId: true,
        anneeId: true,
        etat: true,
        snapshotId: true,
        datePublication: true,
        publiePar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditService.record({
      action: 'DUPLICATION',
      utilisateurId,
      entite: 'Version',
      entiteId: copie.id,
      metadonnees: {
        sourceVersionId: source.id,
        semestreId: copie.semestreId,
        anneeId: copie.anneeId,
        etat: copie.etat,
      },
    });

    this.logger.log(`Version dupliquee : ${copie.id} depuis ${source.id}`);
    return copie;
  }
}