// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { type ZodTypeAny } from 'zod';
import { api, type ReponseApi } from './api';
import { validerReponseApi } from './validation';
import {
  zGeneration,
  type GenerationItem,
  zGenerationList,
  type GenerationList,
  type GenerationStatut,
  zGenerationAnnuler,
  zScenario,
  type Scenario,
  zScenarioSelectReponse,
  type ScenarioSelectReponse,
} from '@takt/contracts';

interface ListeNormalisee<T> {
  items: T[];
  meta: { page: number; pageSize: number; total: number };
}

function normaliserListe<T>(
  reponse: ReponseApi<unknown>,
  itemSchema: ZodTypeAny,
): ListeNormalisee<T> {
  const donneesBrutes = reponse.data;

  let items: unknown[];
  let meta: { page: number; pageSize: number; total: number };

  if (Array.isArray(donneesBrutes)) {
    items = donneesBrutes;
    meta = reponse.meta as { page: number; pageSize: number; total: number };
  } else if (
    donneesBrutes !== null &&
    typeof donneesBrutes === 'object' &&
    Array.isArray((donneesBrutes as { items?: unknown }).items)
  ) {
    const enveloppe = donneesBrutes as { items: unknown[]; meta?: unknown };
    items = enveloppe.items;
    meta =
      (enveloppe.meta as { page: number; pageSize: number; total: number }) ??
      (reponse.meta as { page: number; pageSize: number; total: number });
  } else {
    throw new Error(
      'Format de liste non reconnu : attendu un tableau d’items ou { items, meta }.',
    );
  }

  const itemsValides = items.map((item) => validerReponseApi(itemSchema, item));

  return { items: itemsValides as T[], meta };
}

/*──────────────────────────────────────────────────────────────────────────────
  API Générations (EC-GES-04)
──────────────────────────────────────────────────────────────────────────────*/

export const generationApi = {
  /** Vérifie les préconditions de lancement (GET /generations/preconditions). */
  async verifierPreconditions(versionId: string): Promise<{
    satisfaites: boolean;
    violations: unknown[];
    avertissements: unknown[];
  }> {
    const reponse = await api.get<unknown>(
      `/generations/preconditions?versionId=${encodeURIComponent(versionId)}`,
    );
    return reponse.data as {
      satisfaites: boolean;
      violations: unknown[];
      avertissements: unknown[];
    };
  },

  /** Lance une génération (POST /generations, 202 ACCEPTED). */
  async lancer(versionId: string): Promise<GenerationItem> {
    const reponse = await api.post<GenerationItem>(
      '/generations',
      { versionId },
      { schema: zGeneration },
    );
    if (!reponse.data) {
      throw new Error('Aucune génération retournée au lancement.');
    }
    return reponse.data as GenerationItem;
  },

  /** Liste des générations d'une version (GET /generations). */
  async lister(versionId: string): Promise<ListeNormalisee<GenerationItem>> {
    const reponse = await api.get<unknown>(
      `/generations?versionId=${encodeURIComponent(versionId)}`,
      { schema: zGenerationList },
    );
    return normaliserListe(reponse, zGeneration);
  },

  /** Scénarios d'une génération (GET /generations/:id/scenarios). */
  async listerScenarios(generationId: string): Promise<{
    items: Scenario[];
    statut: GenerationStatut;
  }> {
    const reponse = await api.get<unknown>(
      `/generations/${encodeURIComponent(generationId)}/scenarios`,
    );
    const data = reponse.data as {
      items: unknown[];
      statut: GenerationStatut;
    };
    return {
      items: data.items.map((item) => validerReponseApi(zScenario, item)) as Scenario[],
      statut: data.statut,
    };
  },

  /** Annule une génération en cours (POST /generations/:id/annuler). */
  async annuler(generationId: string): Promise<void> {
    await api.post(`/generations/${encodeURIComponent(generationId)}/annuler`, {}, {
      schema: zGenerationAnnuler,
    });
  },

  /** Adopte un scénario et passe la version en édition (POST /generations/:id/select). */
  async adopterScenario(
    generationId: string,
    scenarioId: string,
  ): Promise<ScenarioSelectReponse> {
    const reponse = await api.post<ScenarioSelectReponse>(
      `/generations/${encodeURIComponent(generationId)}/select`,
      { scenarioId },
      { schema: zScenarioSelectReponse },
    );
    if (!reponse.data) {
      throw new Error('Aucune donnée retournée à l’adoption du scénario.');
    }
    return reponse.data as ScenarioSelectReponse;
  },
};

export type {
  GenerationItem,
  GenerationList,
  GenerationStatut,
  Scenario,
  ScenarioSelectReponse,
};
