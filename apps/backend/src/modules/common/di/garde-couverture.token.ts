// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/*──────────────────────────────────────────────────────────────────────────────
  Types locaux (miroir de @takt/charge-engine) pour éviter l'import statique
  d'un package ESM depuis ce module backend CommonJS.
  ─────────────────────────────────────────────────────────────────────────────*/

export type StatutCouvertureLocal = 'CONFORME' | 'SOUS_PLANIFICATION' | 'SUR_PLANIFICATION';

export interface CouvertureAffectationLocal {
  affectationId: string;
  departementId: string;
  volumeDeclareMinutes: number;
  volumePlanifieMinutes: number;
  taux: number;
  statut: StatutCouvertureLocal;
}

export interface CouvertureDepartementLocal {
  departementId: string;
  volumeDeclareMinutes: number;
  volumePlanifieMinutes: number;
  taux: number;
}

export interface ResultatCouvertureLocal {
  parAffectation: CouvertureAffectationLocal[];
  parDepartement: CouvertureDepartementLocal[];
  tauxGlobal: number;
  estConforme: boolean;
  seancesOrphelines: string[];
}

/**
 * Jeton d'injection du garde de couverture pédagogique.
 *
 * Motif d'architecture (inversion de contrôle) : le module `versions`
 * (qui exécute la transition `soumise → valid_pedag`) ne peut pas importer
 * `planning` (matrice de dépendances, pas de cycle). Ce jeton défini dans
 * `common` est lié à l'implémentation `CouvertureService` (module `planning`,
 * déclaré `@Global()`) et injecté par `WorkflowService`.
 */
export const GARDE_COUVERTURE = Symbol('GARDE_COUVERTURE');

/**
 * Contrat du garde de couverture : vérifie qu'une version peut être soumise
 * à la validation pédagogique (couverture exactement 100 %).
 *
 * @throws si la couverture est incomplète (le service lance une ApiError 400)
 */
export interface IGardeCouverture {
  /**
   * Vérifie que la couverture pédagogique de la version est de 100 %.
   * Résolu sans effet si conforme, rejette avec une ApiError sinon.
   *
   * @param versionId - Identifiant de la version
   */
  verifierSoumission(versionId: string): Promise<void>;

  /**
   * Calcule le résultat détaillé de couverture (pour lecture, endpoint GET).
   *
   * @param versionId - Identifiant de la version
   */
  calculerCouverture(versionId: string): Promise<ResultatCouvertureLocal>;
}