// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { configurerApi, type ConfigurationApi } from './api';
import { userStore } from '../stores/userStore';

/**
 * Initialise le client API et le store utilisateur au démarrage de l'application.
 *
 * Le jeton d'accès est obtenu depuis `obtenirJeton` (mémoire, fourni par le
 * fournisseur d'authentification). Il n'est jamais stocké dans localStorage
 * (GG-17).
 */
export function amorcerApi(config: Partial<ConfigurationApi>): void {
  configurerApi(config);

  // Le store est informé pour pouvoir purger le cache de requêtes à la
  // déconnexion (surSessionExpirée est déjà géré par le client API).
  if (config.obtenirJeton) {
    userStore.setState({ obtenirJeton: config.obtenirJeton });
  }
}
