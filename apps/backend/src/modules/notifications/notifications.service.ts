// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { EventsHubService } from '../events/events-hub.service';

/** Types d’événements de notification liés à la revalidation ciblée (TAKT-L05-05). */
export const NOTIFICATION_TYPE_REVALIDATION_DEMANDEE = 'REVALIDATION_DEMANDEE';
export const NOTIFICATION_TYPE_REVALIDATION_VALIDEE = 'REVALIDATION_VALIDEE';

/**
 * Service des notifications in-app.
 *
 * Écrit une ligne `Notification` (persistée) et diffuse un événement SSE
 * `notification` vers l’utilisateur cible via l’`EventsHubService`.
 *
 * Le module `notifications` importe `events` (autorisé par
 * `DEPENDANCES_AUTORISEES`) ; aucun import direct de `prisma`/`pg` n’est fait
 * depuis l’extérieur de ce module (GG-16).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(EventsHubService) private readonly eventsHub: EventsHubService,
  ) {}

  /**
   * Notifie les responsables de département (rdep) actifs d’un département
   * qu’une revalidation de sa répartition est requise.
   *
   * @returns le nombre de notifications créées et les ids des utilisateurs notifiés
   */
  async notifierRevalidationDemandee(
    departementId: string,
    versionId: string,
  ): Promise<{ count: number; utilisateurIds: string[] }> {
    return this.notifierRdepsDepartement(
      departementId,
      NOTIFICATION_TYPE_REVALIDATION_DEMANDEE,
      'Revalidation de la répartition requise',
      `La répartition pédagogique du département doit être revalidée suite à une modification (version ${versionId}).`,
    );
  }

  /**
   * Notifie les responsables de département (rdep) actifs d’un département
   * que sa revalidation a été prise en compte (répartition à nouveau valide).
   *
   * @returns le nombre de notifications créées et les ids des utilisateurs notifiés
   */
  async notifierRevalidationValidee(
    departementId: string,
    versionId: string,
  ): Promise<{ count: number; utilisateurIds: string[] }> {
    return this.notifierRdepsDepartement(
      departementId,
      NOTIFICATION_TYPE_REVALIDATION_VALIDEE,
      'Revalidation de la répartition effectuée',
      `La répartition pédagogique du département a été revalidée (version ${versionId}).`,
    );
  }

  /**
   * Crée une notification `type` pour chaque rdep actif du département et la
   * diffuse en SSE vers chacun.
   */
  private async notifierRdepsDepartement(
    departementId: string,
    type: string,
    titre: string,
    message: string,
  ): Promise<{ count: number; utilisateurIds: string[] }> {
    const rdeps = await this.prisma.utilisateur.findMany({
      where: {
        departementId,
        estActif: true,
        role: { code: 'rdep' },
      },
      select: { id: true },
    });

    const utilisateurIds: string[] = [];
    for (const rdep of rdeps) {
      const notification = await this.prisma.notification.create({
        data: { utilisateurId: rdep.id, type, titre, message },
      });

      this.eventsHub.publier(rdep.id, {
        type: 'notification',
        notificationId: notification.id,
        titre,
        message,
      });

      utilisateurIds.push(rdep.id);
    }

    this.logger.log(
      `Notification ${type} : ${utilisateurIds.length} utilisateur(s) notifie(s) pour le departement ${departementId}`,
    );

    return { count: utilisateurIds.length, utilisateurIds };
  }

  /**
   * Crée une notification générique pour un utilisateur et la diffuse en SSE.
   */
  async creerNotification(utilisateurId: string, type: string, titre: string, message: string) {
    const notification = await this.prisma.notification.create({
      data: { utilisateurId, type, titre, message },
    });

    this.eventsHub.publier(utilisateurId, {
      type: 'notification',
      notificationId: notification.id,
      titre,
      message,
    });

    return notification;
  }
}
