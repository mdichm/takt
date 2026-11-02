// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/** Contenu binaire stocké par le collaborateur de fichiers. */
export interface ContenuFichier {
  readonly donnees: Uint8Array;
  readonly typeMime: string;
}

/** Contrat minimal du stockage des exports et fichiers dérivés. */
export interface StockageFichiers {
  ecrire(chemin: string, contenu: ContenuFichier): Promise<void>;
  lire(chemin: string): Promise<ContenuFichier>;
}

/** Token d’injection du stockage de fichiers, remplaçable par un double en test. */
export const STOCKAGE_FICHIERS = Symbol('STOCKAGE_FICHIERS');
