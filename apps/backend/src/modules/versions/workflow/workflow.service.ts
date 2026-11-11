// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import {
  canTransition,
  type TransitionContexte,
} from './workflow-machine';
import { type ActionTransition, type CodeErreurApi, type RoleCode } from '@takt/contracts';

/**
 * Service de transition d’état de version.
 *
 * Applique la matrice arbitrée (18 transitions), vérifie le rôle et les gardes,
 * met à jour la version et journalise la mutation (GG-07).
 * Les erreurs mappent vers le catalogue HTTP (GG-06) : 400 / 403 / 404 / 409.
 */
@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /**
   * Exécute une transition de workflow sur une version.
   *
   * @throws ApiError 404 si la version n’existe pas
   * @throws ApiError 400 si le motif est manquant pour un rejet
   * @throws ApiError 403 si le rôle n’est pas autorisé
   * @throws ApiError 409 si la transition est interdite depuis l’état courant
   */
  async transitionner(
    id: string,
    action: ActionTransition,
    role: RoleCode,
    contexte: TransitionContexte,
    utilisateurId: string,
  ) {
    const version = await this.prisma.version.findUnique({
      where: { id },
      select: {
        id: true,
        etat: true,
        semestreId: true,
        datePublication: true,
        publiePar: true,
      },
    });
    if (!version) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Version introuvable');
    }

    const resultat = canTransition(version.etat, action, role, contexte);
    if (!resultat.ok) {
      let code: CodeErreurApi = CODES_ERREUR_API.CONFLICT;
      let status = 409;
      if (resultat.raison.includes('non autorisé')) {
        code = CODES_ERREUR_API.FORBIDDEN;
        status = 403;
      } else if (resultat.raison.includes('motif est obligatoire')) {
        code = CODES_ERREUR_API.BAD_REQUEST;
        status = 400;
      }

      throw new ApiError(
        code,
        status,
        resultat.raison,
        {
          versionId: id,
          etat: version.etat,
          action,
          transitionsAutorisees: resultat.transitionsAutorisees?.map((r) => ({
            action: r.action,
            to: r.to,
            garde: r.garde,
          })) ?? [],
        },
      );
    }

    const { regle } = resultat;

    // Mise à jour de l’état et, le cas échéant, des champs de publication.
    const data: Record<string, unknown> = { etat: regle.to };
    if (regle.action === 'publier') {
      data.datePublication = new Date();
      data.publiePar = utilisateurId;
    }

    const miseAJour = await this.prisma.version.update({
      where: { id },
      data,
      select: {
        id: true,
        semestreId: true,
        etat: true,
        datePublication: true,
        publiePar: true,
        updatedAt: true,
      },
    });

    await this.auditService.record({
      action: 'TRANSITION_ETAT',
      utilisateurId,
      entite: 'Version',
      entiteId: id,
      metadonnees: {
        action,
        etatSource: version.etat,
        etatCible: regle.to,
        role,
        motif: contexte.motif ?? null,
        typeMotif: contexte.typeMotif ?? null,
        semestreId: version.semestreId,
      },
    });

    this.logger.log(
      `Transition '${action}' appliquée sur la version ${id} : ${version.etat} -> ${regle.to}`,
    );

    return miseAJour;
  }
}
