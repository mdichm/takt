// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { Prisma, PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import { creerHashSHA256 } from '../../common/crypto/hash';
import { construireDonneesSnapshot, type DonneesEntreeSnapshot } from './snapshot-builder';

/**
 * Service de création de snapshots de version (TAKT-L06-10).
 *
 * Un snapshot fige l'état complet des données pédagogiques d'une version
 * à un instant T. Il sert de base d'entrée déterministe à la génération
 * CP-SAT (EX-DAT-01, EX-PRI-06).
 *
 * Règles :
 * - Une version {@code publie} est immuable : toute création de snapshot
 *   est refusée (409) et journalisée (GG-07).
 * - Le hash d'intégrité est calculé sur les données sérialisées de façon
 *   déterministe (aucun horodatage ni UUID aléatoire dans le payload).
 * - Un snapshot existant n'est jamais supprimé ni modifié (EX-DAT-03).
 */
@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /**
   * Crée un snapshot de version à l'état courant.
   *
   * @param versionId Identifiant de la version à snapshoter
   * @param utilisateurId Utilisateur à l'origine de la demande
   * @returns Le snapshot créé (id, hash, createdAt, revision)
   *
   * @throws ApiError 404 si la version n'existe pas
   * @throws ApiError 409 si la version est publiée (immuabilité EX-PRI-02)
   */
  async creerSnapshot(versionId: string, utilisateurId?: string) {
    // 1. Récupère la version (vérifie existence + immuabilité)
    const version = await this.prisma.version.findUnique({
      where: { id: versionId },
      select: { id: true, etat: true, semestreId: true },
    });
    if (!version) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Version introuvable');
    }

    if (version.etat === 'publie') {
      // Audit de la tentative refusée (GG-07)
      await this.auditService.record({
        action: 'CREATION',
        utilisateurId: undefined,
        entite: 'Snapshot',
        entiteId: undefined,
        metadonnees: {
          versionId,
          etat: version.etat,
          motif: 'Version publiée — immuable (EX-PRI-02)',
          refus: true,
        },
      });
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Une version publiée est immuable : création de snapshot interdite',
        { versionId, etat: version.etat },
      );
    }

    // 2. Récupère toutes les données de la version (sélects ciblés, GG-16)
    const [
      semestre,
      affectations,
      seances,
      verrous,
      contraintes,
      groupes,
      enseignants,
      salles,
      creneaux,
      departements,
    ] = await Promise.all([
      this.prisma.semestre.findUnique({
        where: { id: version.semestreId },
        select: { id: true, numero: true, dateDebut: true, dateFin: true, anneeUniversitaireId: true },
      }),
      this.prisma.affectationPedagogique.findMany({
        where: { versionId },
        orderBy: { id: 'asc' },
        select: {
          id: true, enseignantId: true, matiereId: true, groupeId: true,
          typeEnseignementId: true, volumeHebdo: true, dureeCreneaux: true,
        },
      }),
      this.prisma.seance.findMany({
        where: { versionId },
        orderBy: { id: 'asc' },
        select: {
          id: true, jour: true, creneauDebutId: true, nbCreneaux: true,
          salleId: true, enseignantId: true, groupeId: true, matiereId: true,
          typeEnseignementId: true, affectationId: true, estVerrouillee: true,
        },
      }),
      this.prisma.verrouSeance.findMany({
        where: { versionId },
        orderBy: { id: 'asc' },
        select: {
          id: true, seanceId: true, utilisateurId: true, type: true,
          valeur: true, poids: true,
        },
      }),
      this.prisma.contrainte.findMany({
        where: { versionId },
        orderBy: { id: 'asc' },
        select: { id: true, type: true, cibleId: true, valeur: true },
      }),
      this.prisma.groupe.findMany({
        where: {
          niveau: {
            planEtudes: {
              some: { semestreId: version.semestreId },
            },
          },
        },
        orderBy: { id: 'asc' },
        select: { id: true, code: true, libelle: true, niveauId: true },
      }),
      this.prisma.enseignant.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, matricule: true, nom: true, prenom: true, email: true },
      }),
      this.prisma.salle.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, code: true, libelle: true, typeSalleId: true, siteId: true, capacite: true },
      }),
      this.prisma.creneau.findMany({
        orderBy: [{ jour: 'asc' }, { ordre: 'asc' }],
        select: { id: true, jour: true, ordre: true, heureDebut: true, heureFin: true, dureeMinutes: true },
      }),
      this.prisma.departement.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, code: true, libelle: true },
      }),
    ]);

    if (!semestre) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Semestre introuvable');
    }

    // 3. Construit les données déterministes du snapshot
    const entrees: DonneesEntreeSnapshot = {
      versionId,
      semestre,
      affectations: affectations as never[],
      seances: seances as never[],
      verrous: verrous as never[],
      contraintes: contraintes as never[],
      groupes: groupes as never[],
      enseignants: enseignants as never[],
      salles: salles as never[],
      creneaux: creneaux as never[],
      departements: departements as never[],
    };

    const donnees: Prisma.InputJsonValue = construireDonneesSnapshot(entrees) as Prisma.InputJsonValue;

    // 4. Calcule le hash d'intégrité (EX-DAT-01)
    const hash = creerHashSHA256(donnees);

    // 5. Vérifie si un snapshot existe déjà pour cette version (un seul snapshot
    //    de publication par version — contrainte SQL Snapshot_versionId_publication_unique)
    const existant = await this.prisma.snapshot.findFirst({
      where: { versionId, type: 'VERSION', departementId: null },
      select: { id: true, hash: true, revision: true, donnees: true, createdAt: true },
    });
    if (existant) {
      // Snapshot existant : on le retourne (immutabilité EX-DAT-03)
      this.logger.log(
        `Snapshot déjà existant pour la version ${versionId} (hash ${existant.hash.slice(0, 16)}…)`,
      );
      return {
        id: existant.id,
        versionId,
        type: 'VERSION',
        revision: existant.revision,
        estCourant: true,
        hash: existant.hash,
        createdAt: existant.createdAt,
      };
    }

    // 6. Calcule la révision suivante (toujours 1 pour un snapshot de publication)
    const revision = 1;

    // 7. Crée le snapshot (type VERSION, departementId = null)
    const snapshot = await this.prisma.snapshot.create({
      data: {
        versionId,
        departementId: null,
        type: 'VERSION',
        revision,
        estCourant: true,
        donnees,
        hash,
      },
      select: {
        id: true,
        versionId: true,
        type: true,
        revision: true,
        estCourant: true,
        hash: true,
        createdAt: true,
      },
    });

    // 7. Journalise la création (GG-07)
    await this.auditService.record({
      action: 'CREATION',
      utilisateurId,
      entite: 'Snapshot',
      entiteId: snapshot.id,
      metadonnees: {
        versionId,
        type: 'VERSION',
        revision,
        hash,
        nombreAffectations: affectations.length,
        nombreSeances: seances.length,
        nombreVerrous: verrous.length,
        nombreContraintes: contraintes.length,
      },
    });

    this.logger.log(
      `Snapshot v${revision} créé pour la version ${versionId} (hash ${hash.slice(0, 16)}…)`,
    );

    return snapshot;
  }

  /**
   * Récupère le snapshot courant d'une version (type VERSION).
   */
  async obtenirSnapshotCourant(versionId: string) {
    const snapshot = await this.prisma.snapshot.findFirst({
      where: { versionId, type: 'VERSION', estCourant: true },
      orderBy: { revision: 'desc' },
      select: {
        id: true, versionId: true, type: true, revision: true,
        estCourant: true, donnees: true, hash: true, createdAt: true,
      },
    });
    if (!snapshot) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Aucun snapshot de version trouvé');
    }
    return snapshot;
  }

  /**
   * Vérifie l'intégrité d'un snapshot (recalcule le hash et compare).
   */
  verifierIntegrite(snapshot: { donnees: unknown; hash: string }): boolean {
    return creerHashSHA256(snapshot.donnees) === snapshot.hash;
  }
}
