// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient, Prisma } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import { creerHashSHA256 } from '../../common/crypto/hash';
import { RepartitionService } from '../repartition/repartition.service';
import { NotificationsService } from '../../notifications/notifications.service';
import type { EtatValidationRepartition, StatutValidationRepartition } from '@takt/contracts';

const ETAT_VALIDE: EtatValidationRepartition = 'VALIDE';
const ETAT_REVALIDATION_REQUISE: EtatValidationRepartition = 'REVALIDATION_REQUISE';

/**
 * Détection des impacts et revalidation ciblée d’un département (TAKT-L05-05).
 *
 * Lorsqu’une modification pédagogique affecte les affectations d’un département
 * déjà validé, ce département est marqué `REVALIDATION_REQUISE` et son
 * responsable (rdep) est notifié. La revalidation recrée un snapshot à
 * révision incrémentée sans muter l’état global de la version (D4, dépendance
 * TAKT-L06-02 non livrée).
 */
@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(RepartitionService)
    private readonly repartitionService: RepartitionService,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Détecte les départements d’une version dont les affectations ont évolué
   * depuis leur validation initiale, les marque `REVALIDATION_REQUISE` et
   * notifie leurs responsables de département.
   *
   * Seuls les départements actuellement `VALIDE` sont réévalués.
   */
  async detecterImpacts(
    versionId: string,
    utilisateurId: string,
  ): Promise<{
    versionId: string;
    departementsImpactes: StatutValidationRepartition[];
    notificationsCrees: number;
  }> {
    const version = await this.prisma.version.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Version introuvable', {
        champ: 'versionId',
      });
    }

    const validations = await this.prisma.validationRepartition.findMany({
      where: { versionId },
      orderBy: { departementId: 'asc' },
    });

    const departementsImpactes: StatutValidationRepartition[] = [];
    let notificationsCrees = 0;

    for (const validation of validations) {
      if (validation.etat !== ETAT_VALIDE) {
        departementsImpactes.push(this.mapStatut(validation));
        continue;
      }

      const affectations = await this.prisma.affectationPedagogique.findMany({
        where: { versionId, departementId: validation.departementId },
        select: {
          id: true,
          enseignantId: true,
          matiereId: true,
          groupeId: true,
          typeEnseignementId: true,
          volumeHebdo: true,
          dureeCreneaux: true,
        },
      });

      const hashAffectations = creerHashSHA256({
        versionId,
        departementId: validation.departementId,
        affectations: [...affectations].sort((a, b) => a.id.localeCompare(b.id)),
      });

      if (hashAffectations === validation.hashAffectations) {
        departementsImpactes.push(this.mapStatut(validation));
        continue;
      }

      await this.prisma.validationRepartition.update({
        where: { id: validation.id },
        data: {
          etat: ETAT_REVALIDATION_REQUISE,
          motif: 'Modification des affectations pédagogiques détectée',
          revalidationDemandeeLe: new Date(),
          revalidationDemandeePar: utilisateurId,
          snapshotPrecedentId: validation.snapshotCourantId,
        },
      });

      await this.auditService.record({
        action: 'TRANSITION_ETAT',
        utilisateurId,
        entite: 'ValidationRepartition',
        entiteId: validation.id,
        metadonnees: {
          versionId,
          departementId: validation.departementId,
          transition: 'VALIDE -> REVALIDATION_REQUISE',
        },
      });

      departementsImpactes.push({
        ...this.mapStatut(validation),
        etat: ETAT_REVALIDATION_REQUISE,
      });

      const { count } = await this.notificationsService.notifierRevalidationDemandee(
        validation.departementId,
        versionId,
      );
      notificationsCrees += count;

      this.logger.log(
        `Departement impacte : ${validation.departementId} (version ${versionId}) marque REVALIDATION_REQUISE`,
      );
    }

    return { versionId, departementsImpactes, notificationsCrees };
  }
  /**
   * Revalide un département marqué `REVALIDATION_REQUISE`.
   *
   * - Recrée un snapshot à révision incrémentée ; l’ancien snapshot courant
   *   passe en historique (`estCourant = false`).
   * - Passe la validation du département à `VALIDE`.
   * - Notifie le responsable de département.
   * - Ne mutera jamais `Version.etat` (dépendance TAKT-L06-02).
   */
  async revalider(
    versionId: string,
    departementId: string,
    utilisateurId: string,
  ): Promise<{
    departementId: string;
    etat: EtatValidationRepartition;
    revision: number;
    snapshotId: string;
    snapshotPrecedentId: string | null;
    tousDepartementsValides: boolean;
  }> {
    const validation = await this.prisma.validationRepartition.findFirst({
      where: { versionId, departementId },
    });

    if (!validation) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Aucune validation de répartition trouvée pour ce département',
        { versionId, departementId },
      );
    }

    if (validation.etat !== ETAT_REVALIDATION_REQUISE) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Aucune demande de revalidation en cours pour ce département',
        { versionId, departementId, etatActuel: validation.etat },
      );
    }

    const perimetre = await this.repartitionService.validerPerimetre(versionId, departementId);

    if (validation.snapshotCourantId) {
      await this.prisma.snapshot.update({
        where: { id: validation.snapshotCourantId },
        data: { estCourant: false },
      });
    }

    const donneesSnapshot = {
      versionId,
      departementId,
      type: 'REPARTITION' as const,
      affectations: perimetre.affectationsPourSnapshot,
      charge: perimetre.resultatCharge,
      reglesCharge: perimetre.reglesCharge,
      validePar: utilisateurId,
      valideLe: new Date().toISOString(),
    };

    const hash = creerHashSHA256(donneesSnapshot);

    const nouveauSnapshot = await this.prisma.snapshot.create({
      data: {
        versionId,
        departementId,
        revision: (validation.revision ?? 1) + 1,
        estCourant: true,
        donnees: donneesSnapshot as unknown as Prisma.InputJsonValue,
        hash,
      },
    });

    const miseAJour = await this.prisma.validationRepartition.update({
      where: { id: validation.id },
      data: {
        etat: ETAT_VALIDE,
        revision: nouveauSnapshot.revision,
        hashAffectations: perimetre.hashAffectations,
        snapshotCourantId: nouveauSnapshot.id,
        snapshotPrecedentId: validation.snapshotCourantId,
        valideLe: new Date(),
        validePar: utilisateurId,
      },
    });

    await this.auditService.record({
      action: 'TRANSITION_ETAT',
      utilisateurId,
      entite: 'Snapshot',
      entiteId: nouveauSnapshot.id,
      metadonnees: {
        versionId,
        departementId,
        type: 'REPARTITION',
        action: 'REVALIDATION_REPARTITION',
        revision: nouveauSnapshot.revision,
        snapshotPrecedentId: validation.snapshotCourantId,
      },
    });
    await this.auditService.record({
      action: 'TRANSITION_ETAT',
      utilisateurId,
      entite: 'ValidationRepartition',
      entiteId: validation.id,
      metadonnees: {
        versionId,
        departementId,
        transition: 'REVALIDATION_REQUISE -> VALIDE',
        revision: miseAJour.revision,
      },
    });

    await this.notificationsService.notifierRevalidationValidee(departementId, versionId);

    const toutesValidations = await this.prisma.validationRepartition.findMany({
      where: { versionId },
      select: { etat: true },
    });
    const tousDepartementsValides = toutesValidations.every((v) => v.etat === ETAT_VALIDE);

    this.logger.log(
      `Revalidation effectuee : dep ${departementId}, ver ${versionId}, snap ${nouveauSnapshot.id}, rev ${nouveauSnapshot.revision}`,
    );

    return {
      departementId,
      etat: miseAJour.etat as EtatValidationRepartition,
      revision: miseAJour.revision,
      snapshotId: nouveauSnapshot.id,
      snapshotPrecedentId: validation.snapshotCourantId,
      tousDepartementsValides,
    };
  }

  /**
   * Lit les états de validation d’une version (tableau de bord).
   */
  async lireStatuts(versionId: string): Promise<StatutValidationRepartition[]> {
    const validations = await this.prisma.validationRepartition.findMany({
      where: { versionId },
      orderBy: { departementId: 'asc' },
    });
    return validations.map((v) => this.mapStatut(v));
  }

  private mapStatut(validation: {
    id: string;
    departementId: string;
    etat: string;
    revision: number;
    hashAffectations: string | null;
    motif: string | null;
    revalidationDemandeeLe: Date | null;
    revalidationDemandeePar: string | null;
    valideLe: Date | null;
    validePar: string | null;
    snapshotCourantId: string | null;
    snapshotPrecedentId: string | null;
  }): StatutValidationRepartition {
    return {
      departementId: validation.departementId,
      etat: validation.etat as EtatValidationRepartition,
      revision: validation.revision,
      hashAffectations: validation.hashAffectations ?? undefined,
      motif: validation.motif ?? undefined,
      revalidationDemandeeLe: validation.revalidationDemandeeLe
        ? validation.revalidationDemandeeLe.toISOString()
        : undefined,
      revalidationDemandeePar: validation.revalidationDemandeePar ?? undefined,
      valideLe: validation.valideLe ? validation.valideLe.toISOString() : undefined,
      validePar: validation.validePar ?? undefined,
      snapshotCourantId: validation.snapshotCourantId ?? undefined,
      snapshotPrecedentId: validation.snapshotPrecedentId ?? undefined,
    };
  }
}
