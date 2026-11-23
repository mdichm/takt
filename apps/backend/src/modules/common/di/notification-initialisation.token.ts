// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Jeton d’injection du service de notification d’initialisation de version.
 *
 * Motif d’architecture (inversion de contrôle) : le module `versions`
 * (qui exécute l’initialisation année/semestre/version) ne peut pas importer
 * `notifications` (matrice de dépendances, pas de cycle). Ce jeton défini
 * dans `common` est lié à l’implémentation `NotificationsService` (module
 * `notifications`, déclaré `@Global()`) et injecté par
 * `InitialisationService`.
 */
export const NOTIFICATION_INITIALISATION = Symbol('NOTIFICATION_INITIALISATION');

/**
 * Contrat de notification d’initialisation de version.
 *
 * @throws si l’envoi de notification échoue (le service lance une ApiError)
 */
export interface INotificationInitialisation {
  /**
   * Notifie tous les responsables de département (rdep) actifs qu’une
   * nouvelle version initiale a été créée pour un semestre.
   *
   * @param versionId - Identifiant de la version créée
   * @param semestreId - Identifiant du semestre
   * @param anneeId - Identifiant de l’année universitaire
   * @returns Nombre de notifications créées et ids des utilisateurs notifiés
   */
  notifierCreationVersion(
    versionId: string,
    semestreId: string,
    anneeId: string,
  ): Promise<{ count: number; utilisateurIds: string[] }>;
}