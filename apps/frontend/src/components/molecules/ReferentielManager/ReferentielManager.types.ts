// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { ZodTypeAny } from 'zod';
import { ColonneDataTable } from '../DataTable/DataTable.types';

/** Déclaration d’un champ du formulaire d’édition d’un référentiel. */
export interface ChampFormulaireReferentiel {
  /** Clé du champ (correspond à une propriété de l’entité). */
  readonly cle: string;
  /** Libellé affiché au-dessus du champ. */
  readonly libelle: string;
  /** Type de saisie. */
  readonly type: 'texte' | 'nombre' | 'select' | 'couleur' | 'boolean';
  /** Si le champ est obligatoire. */
  readonly obligatoire?: boolean;
  /** Options disponibles (uniquement pour type « select »). */
  readonly options?: readonly { readonly valeur: string; readonly libelle: string }[];
}

/** Configuration d’un référentiel géré par le CRUD générique. */
export interface ConfigurationReferentiel<T> {
  /** Clé technique du référentiel (utilisée dans les clés de requête). */
  readonly cle: string;
  /** Libellé affiché dans l’interface. */
  readonly libelle: string;
  /** Nom de la clef identifiant d’un item (défaut: « id »). */
  readonly cleId?: string;
  /** Endpoint API du référentiel (ex: /referentiels/departements). */
  readonly endpoint: string;
  /** Colonnes affichées dans le tableau. */
  readonly colonnes: readonly ColonneDataTable<T>[];
  /** Schéma de lecture d’un item. */
  readonly schemaItem: ZodTypeAny;
  /** Schéma de création. */
  readonly schemaCreation: ZodTypeAny;
  /** Schéma de modification (tous les champs optionnels). */
  readonly schemaModification: ZodTypeAny;
  /** Champs du formulaire d’édition. */
  readonly champsFormulaire: readonly ChampFormulaireReferentiel[];
  /** Libellé de succès après création (défaut générique). */
  readonly libelleSuccesCreation?: string;
  /** Libellé de succès après modification. */
  readonly libelleSuccesModification?: string;
  /** Libellé de succès après suppression. */
  readonly libelleSuccesSuppression?: string;
  /** Message affiché quand la liste est vide. */
  readonly messageVide?: string;
  /** Noms des paramètres de requête (défauts alignés sur @takt/contracts). */
  readonly paramPage?: string;
  readonly paramPageSize?: string;
  readonly paramSearch?: string;
  readonly paramTri?: string;
  readonly paramDirection?: string;
}
