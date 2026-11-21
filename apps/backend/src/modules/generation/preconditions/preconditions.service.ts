// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient, TypeVerrou } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import {
  GARDE_COUVERTURE,
  IGardeCouverture,
  ResultatCouvertureLocal,
} from '../../common/di/garde-couverture.token';
import { ConfigSystemeService } from '../../referentiels/config-systeme/config-systeme.service';
import type {
  PreconditionAvertissement,
  PreconditionViolation,
  ResultatPreconditions,
} from '@takt/contracts';

/**
 * Verrou de séance enrichi avec sa séance parente (résultat de findMany avec
 * `include: { seance }`). Utilisé pour la détection de conflits de ressource.
 */
type VerrouSeanceAvecSeance = {
  id: string;
  seanceId: string;
  type: TypeVerrou;
  valeur: string;
  seance: { id: string; jour: number; creneauDebutId: string };
};

/**
 * Préconditions de lancement de génération (TAKT-L07-07).
 *
 * Vérifie, avant tout appel au solver CP-SAT, que les prérequis métier sont
 * satisfaits et retourne un résultat structuré { satisfaites, violations,
 * avertissements } consommé par l'UI avant confirmation.
 *
 * Lecture pure : aucune écriture JournalAudit (GG-07 ne s'applique pas).
 *
 * Dépend uniquement de `common` (Prisma), `referentiels` (ConfigSysteme) et du
 * jeton global `GARDE_COUVERTURE` (CouvertureModule, @Global) — aucun cycle
 * generation → planning.
 */
@Injectable()
export class PreconditionsService {
  private readonly logger = new Logger(PreconditionsService.name);

  private static readonly ETATS_AUTORISES = ['brouillon', 'edition'];

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(ConfigSystemeService)
    private readonly configSystemeService: ConfigSystemeService,
    @Inject(GARDE_COUVERTURE)
    private readonly gardeCouverture: IGardeCouverture,
  ) {}

  /**
   * Vérifie les préconditions de lancement de génération pour une version.
   *
   * @param versionId Identifiant de la version
   * @returns Résultat structuré des contrôles
   * @throws ApiError 404 si la version n'existe pas
   */
  async checkGenerationPreconditions(
    versionId: string,
  ): Promise<ResultatPreconditions> {
    const violations: PreconditionViolation[] = [];
    const avertissements: PreconditionAvertissement[] = [];

    // 0. La version existe
    const version = await this.prisma.version.findUnique({
      where: { id: versionId },
      select: { id: true, etat: true },
    });
    if (!version) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Version introuvable',
        { versionId },
      );
    }

    // 1. État de version : brouillon ou édition uniquement
    if (!PreconditionsService.ETATS_AUTORISES.includes(version.etat)) {
      violations.push({
        code: 'ETAT_VERSION_INVALIDE',
        message: `La version doit être à l'état « brouillon » ou « édition » pour lancer une génération (état actuel : ${version.etat}).`,
        details: { versionId, etat: version.etat },
      });
    }

    // 2. Tous les départements ayant des affectations ont validé leur répartition (EX-REP-06)
    const departementsAvecAffectations =
      await this.prisma.affectationPedagogique.findMany({
        where: { versionId },
        select: { departementId: true },
        distinct: ['departementId'],
      });

    const departementsNonValides: Array<{
      id: string;
      libelle?: string | null;
    }> = [];
    for (const { departementId } of departementsAvecAffectations) {
      const validationValide =
        await this.prisma.validationRepartition.findFirst({
          where: {
            versionId,
            departementId,
            etat: 'VALIDE',
          },
          select: { id: true },
        });
      if (!validationValide) {
        const departement =
          await this.prisma.departement.findUnique({
            where: { id: departementId },
            select: { id: true, libelle: true },
          });
        departementsNonValides.push({
          id: departementId,
          libelle: departement?.libelle ?? null,
        });
      }
    }

    if (departementsNonValides.length > 0) {
      violations.push({
        code: 'DEPARTEMENT_NON_VALIDE',
        message: `Répartition pédagogique non validée pour ${departementsNonValides.length} département(s).`,
        details: {
          departementsNonValides: departementsNonValides.map((d) => ({
            id: d.id,
            libelle: d.libelle,
          })),
        },
      });
    }

    // 3. Aucun verrou incompatible avec les contraintes dures (EX-VRR-02, RB-UI-07)
    const verrous = await this.prisma.verrouSeance.findMany({
      where: { versionId },
      include: {
        seance: {
          select: {
            id: true,
            jour: true,
            creneauDebutId: true,
          },
        },
      },
    });

    for (const verrou of verrous) {
      // 3a. Référence cible inexistante
      const cibleInexistante = await this.verifierReferenceCible(verrou);
      if (cibleInexistante) {
        violations.push(cibleInexistante);
        continue;
      }

      // 3b. Conflit de ressource entre séances verrouillées (même salle/enseignant, même jour/créneau)
      const conflit = await this.verifierConflitRessource(verrou, verrous);
      if (conflit) {
        violations.push(conflit);
      }
    }

    // 4. Couverture pédagogique conforme (100 %, aucune séance orpheline) via GARDE_COUVERTURE
    try {
      const couverture: ResultatCouvertureLocal =
        await this.gardeCouverture.calculerCouverture(versionId);
      if (!couverture.estConforme) {
        violations.push({
          code: 'COUVERTURE_NON_CONFORME',
          message: `Couverture pédagogique incomplète (${couverture.tauxGlobal}% global, ${couverture.seancesOrphelines.length} séance(s) orpheline(s)).`,
          details: {
            tauxGlobal: couverture.tauxGlobal,
            seancesOrphelines: couverture.seancesOrphelines,
            parDepartement: couverture.parDepartement.map((d) => ({
              departementId: d.departementId,
              taux: d.taux,
            })),
          },
        });
      }
    } catch (err) {
      this.logger.error(
        'Échec du calcul de couverture pédagogique lors des préconditions',
        err as Error,
      );
      throw new ApiError(
        CODES_ERREUR_API.INTERNAL,
        500,
        'Échec du calcul de couverture pédagogique',
      );
    }

    // 5. Taux de verrouillage — avertissement si > seuil (EX-OUV-01, TAKT-L00-02)
    const config = await this.configSystemeService.getOrCreate();
    const totalSeances = await this.prisma.seance.count({
      where: { versionId },
    });
    let tauxVerrouillage = 0;
    let seancesVerrouillees = 0;
    if (totalSeances > 0) {
      seancesVerrouillees = await this.prisma.seance.count({
        where: { versionId, verrous: { some: {} } },
      });
      tauxVerrouillage = (seancesVerrouillees / totalSeances) * 100;
    }

    if (tauxVerrouillage > config.seuilVerrouillageGeneration) {
      avertissements.push({
        code: 'TAUX_VERROUILLAGE_ELEVE',
        message: `Taux de verrouillage trop élevé (${Math.round(
          tauxVerrouillage,
        )}% > ${config.seuilVerrouillageGeneration}%), génération risquée.`,
        details: {
          tauxVerrouillage: Math.round(tauxVerrouillage * 100) / 100,
          seuil: config.seuilVerrouillageGeneration,
          seancesVerrouillees,
          totalSeances,
        },
        bloquant: config.avertissementVerrouillageBloquant,
      });
    }

    const satisfaites =
      violations.length === 0 &&
      !avertissements.some((a) => a.bloquant);

    this.logger.log(
      `Préconditions version ${versionId}: satisfaites=${satisfaites}, violations=${violations.length}, avertissements=${avertissements.length}`,
    );

    return { satisfaites, violations, avertissements };
  }

  /* ------------------------------------------------------------------ */
  /* Privés                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Vérifie que la cible d'un verrou existe (salle / enseignant / créneau /
   * matière pour un verrou ACTIVITÉ). Retourne une violation si inexistante.
   */
  private async verifierReferenceCible(
    verrou: {
      id: string;
      seanceId: string;
      type: TypeVerrou;
      valeur: string;
    },
  ): Promise<PreconditionViolation | null> {
    let cibleExiste = false;

    switch (verrou.type) {
      case TypeVerrou.SALLE: {
        const salle = await this.prisma.salle.findUnique({
          where: { id: verrou.valeur },
          select: { id: true },
        });
        cibleExiste = !!salle;
        break;
      }
      case TypeVerrou.ENSEIGNANT: {
        const enseignant = await this.prisma.enseignant.findUnique({
          where: { id: verrou.valeur },
          select: { id: true },
        });
        cibleExiste = !!enseignant;
        break;
      }
      case TypeVerrou.CRENEAU: {
        const creneau = await this.prisma.creneau.findUnique({
          where: { id: verrou.valeur },
          select: { id: true },
        });
        cibleExiste = !!creneau;
        break;
      }
      case TypeVerrou.ACTIVITE: {
        const matiere = await this.prisma.matiere.findUnique({
          where: { id: verrou.valeur },
          select: { id: true },
        });
        cibleExiste = !!matiere;
        break;
      }
    }

    if (!cibleExiste) {
      return {
        code: 'VERROU_INCOMPATIBLE',
        message: `Le verrou ${verrou.type} de la séance ${verrou.seanceId} pointe vers une cible inexistante (${verrou.valeur}).`,
        details: {
          verrouId: verrou.id,
          seanceId: verrou.seanceId,
          type: verrou.type,
          valeur: verrou.valeur,
          motif: 'REFERENCE_INEXISTANTE',
        },
      };
    }
    return null;
  }

  /**
   * Détecte un conflit de ressource (salle ou enseignant) entre deux séances
   * de la même version verrouillées vers la même valeur au même jour/créneau.
   */
  private async verifierConflitRessource(
    verrou: VerrouSeanceAvecSeance,
    tousLesVerrous: Array<VerrouSeanceAvecSeance>,
  ): Promise<PreconditionViolation | null> {
    const seance = verrou.seance as
      | { id: string; jour: number; creneauDebutId: string }
      | undefined;
    if (!seance) return null;

    const conflit = tousLesVerrous.find((autre) => {
      if (autre.id === verrou.id) return false;
      if (verrou.id >= autre.id) return false; // evite le doublon (A-B == B-A)
      if (autre.type !== verrou.type) return false;
      if (autre.valeur !== verrou.valeur) return false;
      const autreSeance = autre.seance as
        | { jour: number; creneauDebutId: string }
        | undefined;
      if (!autreSeance) return false;
      return (
        autreSeance.jour === seance.jour &&
        autreSeance.creneauDebutId === seance.creneauDebutId
      );
    });

    if (!conflit) return null;

    return {
      code: 'VERROU_INCOMPATIBLE',
      message: `Conflit de ressource : les séances ${seance.id} et ${conflit.seanceId} sont verrouillées vers la même ${verrou.type} au même créneau.`,
      details: {
        verrouId: verrou.id,
        seanceId: verrou.seanceId,
        type: verrou.type,
        valeur: verrou.valeur,
        motif: 'CONFLIT_RESSOURCE',
        seancesEnConflit: [seance.id, conflit.seanceId],
      },
    };
  }
}