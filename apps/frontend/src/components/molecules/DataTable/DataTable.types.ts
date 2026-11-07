// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/** Métadonnées de pagination d'une liste (enveloppe { data, error, meta }). */
export interface MetaPagination {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

/** Tri courant d'une colonne. */
export interface TriDataTable {
  readonly cle: string;
  readonly direction: 'asc' | 'desc';
}

/** Définition d'une colonne de DataTable. */
export interface ColonneDataTable<T> {
  /** Clé de la colonne (utilisée comme acceseur par défaut sur l'item). */
  readonly cle: string;
  /** Libellé affiché dans l'en-tête. */
  readonly libelle: string;
  /** Si la colonne est triable. */
  readonly triable?: boolean;
  /** Acceseur personnalisé pour extraire la valeur affichée d'une ligne. */
  readonly acceseur?: (item: T) => string | number;
  /** Alignement de la colonne. */
  readonly alignement?: 'gauche' | 'centre' | 'droite';
}
