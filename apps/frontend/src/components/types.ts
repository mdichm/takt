// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/** Contrats partagés du design system TAKT (atomes, molécules, organismes). */

/** État de chargement d'une donnée ou d'un formulaire. */
export type EtatDonnees = 'vide' | 'chargement' | 'erreur' | 'succès';

/** Variantes de bouton (mappées sur les jetons design-tokens, 0 couleur en dur). */
export type VarianteBouton = 'primaire' | 'secondaire' | 'contour' | 'fantome' | 'danger';

/** Variantes d'alerte. */
export type VarianteAlerte = 'info' | 'succès' | 'attention' | 'erreur';

/** Variantes de champ de saisie. */
export type VarianteInput = 'défaut' | 'erreur' | 'succès';

/** Tailles de composant. */
export type TailleComposant = 'petite' | 'moyenne' | 'grande';

/** Props communes à tout composant du design system. */
export interface PropsBase {
  /** Identifiant HTML pour l'accessibilité (label for / aria-labelledby). */
  readonly id?: string;
  /** Classe CSS additionnelle (Tailwind). */
  readonly className?: string;
}

/** Résultat de validation d'un champ. */
export interface ChampValidation {
  readonly estValide: boolean;
  readonly message?: string;
}

/** Données chargées avec état. */
export interface DonneesAvecEtat<T> {
  readonly etat: EtatDonnees;
  readonly donnees: T | null;
  readonly erreur?: string;
}
