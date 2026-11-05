// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../common/di/prisma.token';
import { Prisma, PrismaClient } from '@takt/db';

/**
 * Catalogue d'actions d'audit normalisé (ticket TAKT-L03-06).
 * Combine les actions génériques du catalogue (EX-DAT-05, TE-API-05) et
 * les actions spécifiques déjà utilisées dans le codebase (utilisateurs,
 * authentification).
 */
export type ActionAudit =
  | 'CREATION'
  | 'MODIFICATION'
  | 'SUPPRESSION'
  | 'TRANSITION_ETAT'
  | 'POSE_VERROU'
  | 'LEVEE_VERROU'
  | 'EXPORT'
  | 'PUBLICATION'
  | 'CONNEXION'
  | 'FORCAGE_BAIL'
  | 'UTILISATEUR_CREE'
  | 'UTILISATEUR_MODIFIE'
  | 'UTILISATEUR_SUPPRIME'
  | 'UTILISATEUR_DESACTIVE'
  | 'UTILISATEUR_REACTIVE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'REFRESH';

export interface DonneesAudit {
  action: ActionAudit;
  utilisateurId?: string;
  entite: string;
  entiteId?: string;
  metadonnees?: Prisma.InputJsonValue;
}

/**
 * Service d'écriture du journal d'audit (GG-07).
 *
 * Toute mutation métier doit être journalisée de façon immuable.
 * record() est asynchrone : elle retourne une Promise que l'appelant
 * peut attendre (cohérence garantie) ou ignorer (mode fire-and-forget,
 * au risque de perdre l'entrée en cas d'erreur).
 *
 * Aucune donnée sensible (mot de passe, hash, jeton) ne doit figurer
 * dans les métadonnées.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /**
   * Écrit une entrée dans le journal d'audit.
   * L'entrée est immuable : aucun endpoint de modification n'est exposé.
   *
   * @throws si l'écriture en base échoue (l'appelant doit gérer)
   */
  async record(donnees: DonneesAudit): Promise<unknown> {
    return this.prisma.journalAudit.create({
      data: {
        action: donnees.action,
        utilisateurId: donnees.utilisateurId ?? null,
        entite: donnees.entite,
        entiteId: donnees.entiteId ?? null,
        metadonnees: donnees.metadonnees ?? {},
      },
    });
  }
}