// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { type TypeImportArchive } from '@takt/contracts';

/** Représente un enregistrement source candidat à l'import d'archive.
 * Les champs optionnels sont les clés étrangères de l'enregistrement source,
 * renseignées selon le type (départementId pour Parcours, niveauId pour Groupe,
 * moduleId pour Matière, etc.).
 */
export type SourceReferentielArchive = {
  type: TypeImportArchive;
  id: string;
  code: string;
  libelle: string | null;
  originId: string; // identifiant de l'enregistrement source (jamais modifié)
  departementId?: string;
  niveauId?: string;
  typeEnseignementId?: string;
  gradeId?: string;
  moduleId?: string;
  typeSalleId?: string;
  siteId?: string;
  capacite?: number;
};
