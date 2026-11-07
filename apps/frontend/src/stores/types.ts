// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { zEtatVersion, zRoleCode, zUuid, type EtatVersion, type RoleCode } from '@takt/contracts';

/** Utilisateur authentifié, reconstruit depuis les claims JWT et la réponse /auth/login. */
export interface SessionUtilisateur {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: RoleCode;
  departementIds: string[];
}

/** Version de planning actuellement sélectionnée. */
export interface VersionCourante {
  id: string;
  etat: EtatVersion;
  semestreId: string | undefined;
  snapshotId: string | undefined;
}

/** Mot d'interdiction de mutation exposé à l'UI pour désactiver un bouton/champ. */
export interface InterditMutation {
  action: string;
  raison: string;
}

/** Droits effectifs de l'utilisateur sur la version courante. */
export interface Permissions {
  peutLire: boolean;
  peutEditer: boolean;
  peutGenerer: boolean;
  peutVerrouiller: boolean;
  peutForcerVerrou: boolean;
  peutReactiverArchive: boolean;
  peutGererDepartement: boolean;
}

/** Schéma d'une version allégée (contrat backend L06 à affiner). */
export const zVersionResumo = z.object({
  id: zUuid,
  etat: zEtatVersion,
  semestreId: zUuid.optional(),
  snapshotId: zUuid.optional(),
});

export type VersionResumo = z.infer<typeof zVersionResumo>;

/** Schéma de la charge utile de connexion, raffinée côté frontière du store. */
export const zUtilisateurLogin = z.object({
  id: zUuid,
  email: z.string().email(),
  nom: z.string().min(1),
  prenom: z.string().min(1),
  role: z.string().min(1),
});

export type UtilisateurLogin = z.infer<typeof zUtilisateurLogin>;

/**
 * Raffine le rôle reçu en chaîne (zReponseLogin de @takt/contracts) vers
 * RoleCode typé. Lève si la valeur n'appartient pas au catalogue.
 * (GG-04 : pas de cast any, validation Zod explicite.)
 */
export function raffinerRole(role: string): RoleCode {
  const resultat = zRoleCode.safeParse(role);
  if (!resultat.success) {
    throw new Error(`Rôle applicatif inconnu : ${role}`);
  }
  return resultat.data;
}

/**
 * Construit une SessionUtilisateur depuis la réponse de login valide.
 * departementIds est laissé vide tant que le décodage des claims JWT n'est
 * pas branché (écart E2, rapport L08-03).
 */
export function construireSession(utilisateur: UtilisateurLogin): SessionUtilisateur {
  return {
    id: utilisateur.id,
    email: utilisateur.email,
    nom: utilisateur.nom,
    prenom: utilisateur.prenom,
    role: raffinerRole(utilisateur.role),
    departementIds: [],
  };
}

/** Vérifie si un état de version autorise l'édition. */
export function estEtatModifiable(etat: EtatVersion | null): boolean {
  if (etat === null) {
    return false;
  }
  return ['initial', 'rep_pedag', 'brouillon', 'edition'].includes(etat);
}

/** Vérifie si un état rend la version immuable (publié / archivé). */
export function estEtatImmuable(etat: EtatVersion | null): boolean {
  return etat === 'publie' || etat === 'archive';
}