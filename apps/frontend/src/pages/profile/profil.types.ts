// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import type { RoleCode } from '@takt/contracts';

/**
 * Profil utilisateur tel que renvoyé par `GET /users/me`.
 * Les préférences de notification sont gérées côté client (voir preferencesStore)
 * jusqu'à la persistance serveur prévue au lot L10 (TAKT-L10-05).
 */
export interface ProfilUtilisateur {
  readonly id: string;
  readonly email: string;
  readonly nom: string;
  readonly prenom: string;
  readonly role: RoleCode;
  readonly departementId: string | null;
  readonly departementCode: string | null;
  readonly estActif: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Données de mise à jour du profil envoyées à `PATCH /users/me`.
 * Le rôle et le mot de passe ne sont jamais modifiables par cet endpoint.
 */
export interface DonneesProfilUpdate {
  readonly nom?: string;
  readonly prenom?: string;
  readonly email?: string;
  readonly departementId?: string | null;
}

/**
 * Données de changement de mot de passe envoyées à
 * `POST /users/me/mot-de-passe`.
 */
export interface DonneesMotDePasseChange {
  readonly motDePasseActuel: string;
  readonly nouveauMotDePasse: string;
}

/**
 * Résultat d'un changement de mot de passe.
 */
export interface ResultatMotDePasseChange {
  readonly id: string;
  readonly email: string;
}

/**
 * Option d'un sélecteur de département.
 */
export interface OptionDepartement {
  readonly valeur: string;
  readonly libelle: string;
}
