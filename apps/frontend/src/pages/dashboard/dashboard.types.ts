// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { type EtatVersion } from '@takt/contracts';
import { type VersionItem } from '@takt/contracts';

/** Déclinaison de l’indicateur de statut d’une version (pour le widget). */
export interface IndicateurVersion {
  readonly etat: EtatVersion;
  readonly nombre: number;
}

/** Filtres applicables à la liste des versions du tableau de bord. */
export interface FiltresVersions {
  readonly etat?: EtatVersion;
  readonly departementId?: string;
  readonly page: number;
  readonly pageSize: number;
}

/** Résultat de la requête liste des versions (contrat partagé zVersionListe). */
export interface ResultatVersions {
  readonly items: VersionItem[];
  readonly meta: { page: number; pageSize: number; total: number };
}

/** Action rapide affichée dans le bandeau d’actions du tableau de bord. */
export interface ActionRapide {
  readonly id: string;
  readonly libelle: string;
  readonly description: string;
  readonly chemin: string;
  readonly roles: readonly string[];
  readonly icone: 'accueil' | 'calendrier' | 'utilisateur' | 'alerte' | 'succès' | 'info';
}

/** Délai de rafraîchissement automatique configurable (en secondes). */
export type DelaiRafraichissement = 30 | 60 | 300;
