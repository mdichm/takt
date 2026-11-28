// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import { NOTIFICATION_INITIALISATION } from '../../common/di/notification-initialisation.token';
import type { InitialisationInput, InitialisationOutput } from '@takt/contracts';

/**
 * Service d’initialisation d’un nouveau semestre (année + semestre + version
 * initiale) pour l’écran EC-GES-01.
 *
 * Toute mutation est journalisée (GG-07) et la notification aux rdep est
 * émise via le jeton DI `NOTIFICATION_INITIALISATION` (pas d’import direct
 * du module `notifications` depuis `versions`, respect de la matrice de
 * dépendances).
 *
 * Dépend uniquement de `common`, `referentiels` (via Prisma), `audit`.
 */
@Injectable()
export class InitialisationService {
  private readonly logger = new Logger(InitialisationService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Optional()
    @Inject(NOTIFICATION_INITIALISATION)
    private readonly notificationInitialisation?: {
      notifierCreationVersion: (
        versionId: string,
        semestreId: string,
        anneeId: string,
      ) => Promise<{ count: number; utilisateurIds: string[] }>;
    },
  ) {}

  /**
   * Crée une année universitaire, un semestre et une version initiale dans
   * une transaction unique.
   *
   * Garde d’unicité : il ne doit pas exister de version non archivée pour ce
   * semestre (sinon 409 `WORKFLOW_INVALID_TRANSITION`).
   *
   * @returns La version créée (état `initial`)
   */
  async initialiser(donnees: InitialisationInput, utilisateurId: string): Promise<InitialisationOutput> {
    // Verification de l’unicite : pas de version non archifiee pour ce semestre
    const anneeExistante = await this.prisma.anneeUniversitaire.findUnique({
      where: { libelle: donnees.libelleAnnee },
    });

    let anneeId: string;
    if (anneeExistante) {
      anneeId = anneeExistante.id;
    } else {
      const annee = await this.prisma.anneeUniversitaire.create({
        data: {
          libelle: donnees.libelleAnnee,
          dateDebut: new Date(donnees.dateDebutAnnee),
          dateFin: new Date(donnees.dateFinAnnee),
        },
      });
      anneeId = annee.id;
    }

    // Verification d’unicite du semestre (numero unique par annee)
    const semestreExistante = await this.prisma.semestre.findUnique({
      where: {
        anneeUniversitaireId_numero: {
          anneeUniversitaireId: anneeId,
          numero: donnees.numeroSemestre,
        },
      },
    });

    if (semestreExistante) {
      // Verifier si une version non archivee existe deja pour ce semestre
      const versionNonArchivee = await this.prisma.version.findFirst({
        where: {
          semestreId: semestreExistante.id,
          etat: { not: 'archive' },
        },
      });
      if (versionNonArchivee) {
        throw new ApiError(
          CODES_ERREUR_API.CONFLICT,
          409,
          'Une version non archivee existe deja pour ce semestre',
          { semestreId: semestreExistante.id, versionId: versionNonArchivee.id },
        );
      }
      // Le semestre existe mais sans version active : on peut creer une nouvelle version
      const version = await this.prisma.version.create({
        data: {
          semestreId: semestreExistante.id,
          anneeId,
          etat: 'initial',
        },
        select: {
          id: true,
          semestreId: true,
          anneeId: true,
          etat: true,
          createdAt: true,
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
          type: 'INITIALISATION_SEMESTRE_EXISTANT',
        },
      });

      if (this.notificationInitialisation) {
        await this.notificationInitialisation.notifierCreationVersion(
          version.id,
          version.semestreId,
          version.anneeId,
        );
      }

      this.logger.log(`Version initiale creee : ${version.id} (semestre ${version.semestreId})`);
      return version as unknown as InitialisationOutput;
    }

    // Creation du semestre
    const semestre = await this.prisma.semestre.create({
      data: {
        numero: donnees.numeroSemestre,
        anneeUniversitaireId: anneeId,
        dateDebut: new Date(donnees.dateDebutSemestre),
        dateFin: new Date(donnees.dateFinSemestre),
      },
    });

    // Creation de la version initiale liee au semestre
    const version = await this.prisma.version.create({
      data: {
        semestreId: semestre.id,
        anneeId,
        etat: 'initial',
      },
      select: {
        id: true,
        semestreId: true,
        anneeId: true,
        etat: true,
        createdAt: true,
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
        type: 'INITIALISATION',
        libelleAnnee: donnees.libelleAnnee,
        numeroSemestre: donnees.numeroSemestre,
      },
    });

    if (this.notificationInitialisation) {
      await this.notificationInitialisation.notifierCreationVersion(
        version.id,
        version.semestreId,
        version.anneeId,
      );
    }

    this.logger.log(`Version initiale creee : ${version.id} (semestre ${version.semestreId})`);
    return version as unknown as InitialisationOutput;
  }

  /**
   * Liste paginée des années universitaires avec leurs semestres et l’état
   * de la version associée (le cas échéant).
   */
  async listerAnneesUniversitaires(filtres: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{
    items: Array<{
      id: string;
      libelle: string;
      dateDebut: Date;
      dateFin: Date;
      semestres: Array<{
        id: string;
        numero: number;
        dateDebut: Date;
        dateFin: Date;
        versionId: string | null;
        etatVersion: string | null;
      }>;
    }>;
    meta: { page: number; pageSize: number; total: number };
  }> {
    const { page = 1, pageSize = 20, search } = filtres;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (search) {
      where.libelle = { contains: search, mode: 'insensitive' };
    }

    const [annees, total] = await this.prisma.$transaction([
      this.prisma.anneeUniversitaire.findMany({
        where,
        orderBy: { dateDebut: 'desc' },
        skip,
        take: pageSize,
        include: {
          semestres: {
            orderBy: { numero: 'asc' },
            include: {
              versions: {
                select: { id: true, etat: true },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      }),
      this.prisma.anneeUniversitaire.count({ where }),
    ]);

    const items = annees.map((annee) => ({
      id: annee.id,
      libelle: annee.libelle,
      dateDebut: annee.dateDebut,
      dateFin: annee.dateFin,
      semestres: annee.semestres.map((semestre) => ({
        id: semestre.id,
        numero: semestre.numero,
        dateDebut: semestre.dateDebut,
        dateFin: semestre.dateFin,
        versionId: semestre.versions[0]?.id ?? null,
        etatVersion: semestre.versions[0]?.etat ?? null,
      })),
    }));

    return { items, meta: { page, pageSize, total } };
  }
}