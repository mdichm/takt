// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient, Prisma } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import { creerHashSHA256 } from '../../common/crypto/hash';

// Type local pour le ruleSet Prisma (différent de ChargeEngineRuleSet)
interface PrismaChargeRuleSet {
  id: string;
  code: string;
  libelle: string;
  version: number;
  estActive: boolean;
  seuilAlerte: number;
  plafondHebdomadaire: number;
  arrondi: string;
  dureeJournee: number;
  dureeDemiJournee: number;
  coefficientsParType: Prisma.JsonValue;
  cibleHebdomadaireParGrade: Prisma.JsonValue;
  toleranceEquilibrage: number;
  createdAt: Date;
  updatedAt: Date;
}

// Types locaux du moteur de charge (mirroir de @takt/charge-engine pour éviter l'import ESM depuis du CJS).
interface ChargeEngineRuleSet {
  id: string;
  code: string;
  libelle: string;
  version: number;
  estActive: boolean;
  seuilAlerte: number;
  plafondHebdomadaire: number;
  arrondi: 'UNITAIRE' | 'DEMI_JOURNEE' | 'JOURNEE';
  dureeJournee: number;
  dureeDemiJournee: number;
  coefficientsParTypeEnseignement: Record<string, number>;
  cibleHebdomadaireParGrade: Record<string, number>;
  toleranceEquilibrage: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ChargeEngineAffectation {
  id: string;
  enseignantId: string;
  departementId: string;
  gradeCode?: string;
  typeEnseignementCode?: string;
  volumeHebdo: number;
}

interface ChargeEngineResultat {
  parEnseignant: Array<{
    enseignantId: string;
    chargeBrute: number;
    chargeArrondie: number;
    cible: number;
    taux: number;
    depassePlafond: boolean;
    statut: 'CONFORME' | 'AVERTISSEMENT' | 'BLOQUANT';
  }>;
  parDepartement: Array<{
    departementId: string;
    totalCharge: number;
    moyenne: number;
    max: number;
    min: number;
    ecart: number;
    nombreEnseignants: number;
  }>;
  tauxDepassement: number;
  ecartsEquilibrage: Array<{ departementId: string; ecart: number; depasseTolerance: boolean }>;
  alertes: Array<{
    type: string;
    severite: 'AVERTISSEMENT' | 'BLOQUANT';
    enseignantId?: string;
    departementId?: string;
    message: string;
    details: Record<string, unknown>;
  }>;
}

/**
 * Service de validation de la répartition pédagogique et création de snapshot immuable.
 *
 * Règles (TAKT-L05-04) :
 * - La version doit être en état `rep_pedag` (sinon 409 WORKFLOW_INVALID_TRANSITION).
 * - Le département doit avoir des affectations complètes par rapport au plan d'études (sinon 400).
 * - Le calcul de charge ne doit pas produire d'alerte bloquante (sinon 400).
 * - Un snapshot de répartition existant pour (versionId, departementId) rend la validation idempotente : 409.
 * - Toute mutation est journalisée (GG-07).
 * - Pas d'émission d'événement SSE depuis ce module (dépendance `repartition → events` interdite par GG-13).
 */
@Injectable()
export class RepartitionService {
  private readonly logger = new Logger(RepartitionService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async validerRepartition(
    versionId: string,
    departementId: string,
    utilisateurId: string,
  ): Promise<{
    snapshotId: string;
    charge: ChargeEngineResultat;
    reglesChargeSource: 'CHARGE_RULE_SET' | 'DEFAUT';
    transitionVersBrouillon: boolean;
  }> {
    const version = await this.prisma.version.findUnique({
      where: { id: versionId },
      select: { id: true, etat: true, semestreId: true },
    });

    if (!version) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Version introuvable', { champ: 'versionId' });
    }

    if (version.etat !== 'rep_pedag') {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Validation impossible : la version doit etre en etat rep_pedag (etat actuel: ' + version.etat + ')',
        { etatActuel: version.etat },
      );
    }

    // Immuabilité : un snapshot de répartition existe déjà pour ce département sur cette version.
    const snapshotExistant = await this.prisma.snapshot.findFirst({
      where: { versionId, departementId },
    });
    if (snapshotExistant) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Répartition déjà validée pour ce département (snapshot existant)',
        { snapshotId: snapshotExistant.id },
      );
    }

    const affectations = await this.prisma.affectationPedagogique.findMany({
      where: { versionId, departementId },
      include: {
        enseignant: { select: { id: true, grade: { select: { code: true } } } },
        matiere: { select: { id: true, code: true } },
        typeEnseignement: { select: { id: true, code: true } },
        groupe: { select: { id: true, niveau: { select: { parcours: { select: { departementId: true } } } } } },
      },
    });

    if (affectations.length === 0) {
      throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Aucune affectation trouvee', { departementId });
    }

    const planEtudes = await this.prisma.planEtudes.findFirst({
      where: { semestreId: version.semestreId, departementId },
      include: { planEtudesMatieres: { select: { matiereId: true } } },
    });

    if (!planEtudes) {
      throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Aucun plan d etudes trouve', { departementId });
    }

    const matieresPlan = new Set(planEtudes.planEtudesMatieres.map((m) => m.matiereId));
    const matieresAffectees = new Set(affectations.map((a) => a.matiereId));
    const matieresManquantes = [...matieresPlan].filter((m) => !matieresAffectees.has(m));

    if (matieresManquantes.length > 0) {
      throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Repartition incomplete', { matieresManquantes });
    }

    const { ruleSet, source } = await this.obtenirChargeRuleSetActifOuDefaut();

    const affectationsCharge: ChargeEngineAffectation[] = affectations.map((a) => ({
      id: a.id,
      enseignantId: a.enseignantId,
      departementId: a.departementId,
      gradeCode: a.enseignant.grade?.code,
      typeEnseignementCode: a.typeEnseignement?.code,
      volumeHebdo: a.volumeHebdo,
    }));

    // Import dynamique du moteur de charge (package ESM, backend CommonJS).
    const chargeEngine = await import('@takt/charge-engine');
    const resultatCharge: ChargeEngineResultat = chargeEngine.computeCharge(affectationsCharge, ruleSet);

    const alertesBloquantes = resultatCharge.alertes.filter((a: { severite: string }) => a.severite === 'BLOQUANT');
    if (alertesBloquantes.length > 0) {
      throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Depassement plafond de charge', { alertes: alertesBloquantes });
    }

    const donneesSnapshot = {
      versionId,
      departementId,
      type: 'REPARTITION' as const,
      affectations: affectations.map((a) => ({
        id: a.id,
        enseignantId: a.enseignantId,
        matiereId: a.matiereId,
        groupeId: a.groupeId,
        typeEnseignementId: a.typeEnseignementId,
        volumeHebdo: a.volumeHebdo,
        dureeCreneaux: a.dureeCreneaux,
      })),
      charge: resultatCharge,
      reglesCharge: { id: ruleSet.id, code: ruleSet.code, version: ruleSet.version, source },
      validePar: utilisateurId,
      valideLe: new Date().toISOString(),
    };

    const hash = creerHashSHA256(donneesSnapshot);

    const snapshot = await this.prisma.snapshot.create({
      data: {
        versionId,
        departementId,
        donnees: (donneesSnapshot as unknown) as Prisma.InputJsonValue,
        hash,
      },
    });

    // Audit écrit après la création (AuditService utilise sa propre instance PrismaClient, hors transaction).
    await this.auditService.record({
      action: 'TRANSITION_ETAT',
      utilisateurId,
      entite: 'Snapshot',
      entiteId: snapshot.id,
      metadonnees: { versionId, departementId, type: 'REPARTITION', action: 'VALIDATION_REPARTITION' },
    });

    const transitionVersBrouillon = await this.verifierEtTransitionnerVersBrouillon(versionId, version.semestreId, utilisateurId);

    this.logger.log('Répartition validée: dep ' + departementId + ', ver ' + versionId + ', snap ' + snapshot.id + ', brouillon: ' + transitionVersBrouillon);

    return { snapshotId: snapshot.id, charge: resultatCharge, reglesChargeSource: source, transitionVersBrouillon };
  }

  private async obtenirChargeRuleSetActifOuDefaut(): Promise<{
    ruleSet: ChargeEngineRuleSet;
    source: 'CHARGE_RULE_SET' | 'DEFAUT';
  }> {
    const ruleSetActif = await this.prisma.chargeRuleSet.findFirst({ where: { estActive: true } });

    if (ruleSetActif) {
      return { ruleSet: this.mapPrismaToChargeEngineRuleSet(ruleSetActif), source: 'CHARGE_RULE_SET' };
    }

    const ruleSetDefaut: ChargeEngineRuleSet = {
      id: 'DEFAUT',
      code: 'DEFAUT',
      libelle: 'Regles par defaut (modele Prisma)',
      version: 1,
      estActive: false,
      seuilAlerte: 90,
      plafondHebdomadaire: 20,
      arrondi: 'UNITAIRE',
      dureeJournee: 7,
      dureeDemiJournee: 3.5,
      coefficientsParTypeEnseignement: {},
      cibleHebdomadaireParGrade: {},
      toleranceEquilibrage: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.logger.warn('Aucun ChargeRuleSet actif trouve - utilisation des valeurs par defaut du modele Prisma');
    return { ruleSet: ruleSetDefaut, source: 'DEFAUT' };
  }

  private mapPrismaToChargeEngineRuleSet(rs: PrismaChargeRuleSet): ChargeEngineRuleSet {
    const coefs = rs.coefficientsParType as Prisma.JsonObject | null;
    const cibles = rs.cibleHebdomadaireParGrade as Prisma.JsonObject | null;

    return {
      id: rs.id,
      code: rs.code,
      libelle: rs.libelle,
      version: rs.version,
      estActive: rs.estActive,
      seuilAlerte: rs.seuilAlerte,
      plafondHebdomadaire: rs.plafondHebdomadaire,
      arrondi: rs.arrondi as 'UNITAIRE' | 'DEMI_JOURNEE' | 'JOURNEE',
      dureeJournee: rs.dureeJournee,
      dureeDemiJournee: rs.dureeDemiJournee,
      coefficientsParTypeEnseignement: (coefs as Record<string, number>) ?? {},
      cibleHebdomadaireParGrade: (cibles as Record<string, number>) ?? {},
      toleranceEquilibrage: rs.toleranceEquilibrage,
      createdAt: rs.createdAt,
      updatedAt: rs.updatedAt,
    };
  }

  private async verifierEtTransitionnerVersBrouillon(
    versionId: string,
    semestreId: string,
    utilisateurId: string,
  ): Promise<boolean> {
    const departementsAvecAffectations = await this.prisma.affectationPedagogique.findMany({
      where: { versionId },
      select: { departementId: true },
      distinct: ['departementId'],
    });

    const departementIds = departementsAvecAffectations.map((a) => a.departementId);

    if (departementIds.length === 0) return false;

    const snapshotsCount = await this.prisma.snapshot.count({
      where: { versionId, departementId: { in: departementIds } },
    });

    if (snapshotsCount === departementIds.length) {
      await this.prisma.$transaction(async (tx) => {
        await tx.version.update({ where: { id: versionId }, data: { etat: 'brouillon' } });
        await this.auditService.record({
          action: 'TRANSITION_ETAT',
          utilisateurId,
          entite: 'Version',
          entiteId: versionId,
          metadonnees: { transition: 'rep_pedag -> brouillon', declencheur: 'DERNIER_DEPARTEMENT_VALIDE', departementsValides: departementIds },
        });
      });
      this.logger.log('Version ' + versionId + ' transitionnee vers brouillon : tous les ' + departementIds.length + ' departements ont valide');
      return true;
    }
    return false;
  }
}