// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/** Étapes du flux d’import. */
export type EtapeImport = 'saisie' | 'aperçu' | 'rapport';

/** Propriétés du composant ImportAssistant. */
export interface ImportAssistantProps {
  /** Fournisseur optionnel du jeton d’accès (intégration avec le store d’auth). */
  readonly obtenirJeton?: () => string | null;
}
