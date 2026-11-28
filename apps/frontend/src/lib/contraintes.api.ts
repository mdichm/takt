// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { type ZodTypeAny } from 'zod';
import { api, type ReponseApi } from './api';
import { validerReponseApi } from './validation';
import {
  zContrainte,
  type Contrainte,
  type ContrainteCreate,
  type ContrainteUpdate,
  type ContrainteParams,
  zConflitContrainte,
  type ConflitContrainte,
  zEnvelope,
  type MetaApi,
} from '@takt/contracts';

interface ListeNormalisee<T> {
  items: T[];
  meta: MetaApi;
}

function normaliserListe<T>(
  reponse: ReponseApi<unknown>,
  itemSchema: ZodTypeAny,
): ListeNormalisee<T> {
  const donneesBrutes = reponse.data;

  let items: unknown[];
  let meta: MetaApi;

  if (Array.isArray(donneesBrutes)) {
    items = donneesBrutes;
    meta = reponse.meta;
  } else if (
    donneesBrutes !== null &&
    typeof donneesBrutes === 'object' &&
    Array.isArray((donneesBrutes as { items?: unknown }).items)
  ) {
    const enveloppe = donneesBrutes as { items: unknown[]; meta?: MetaApi };
    items = enveloppe.items;
    meta = enveloppe.meta ?? reponse.meta;
  } else {
    throw new Error(
      'Format de liste non reconnu : attendu un tableau d’items ou { items, meta }.',
    );
  }

  const itemsValides = items.map((item) => validerReponseApi(itemSchema, item));

  return { items: itemsValides as T[], meta };
}

const zEnveloppeContraintes = zEnvelope(zContrainte);
const zEnveloppeConflits = zEnvelope(zConflitContrainte);

/*──────────────────────────────────────────────────────────────────────────────
  API Contraintes (EC-GES-03)
──────────────────────────────────────────────────────────────────────────────*/

export const contraintesApi = {
  /** Liste paginée des contraintes d’une version (GET /contraintes). */
  async lister(
    filtres: {
      versionId?: string;
      type?: string;
      cibleId?: string;
      estActif?: boolean;
      page?: number;
      pageSize?: number;
    },
  ): Promise<ListeNormalisee<Contrainte>> {
    const params = new URLSearchParams();
    if (filtres.versionId) params.set('versionId', filtres.versionId);
    if (filtres.type) params.set('type', filtres.type);
    if (filtres.cibleId) params.set('cibleId', filtres.cibleId);
    if (filtres.estActif !== undefined)
      params.set('estActif', String(filtres.estActif));
    if (filtres.page) params.set('page', String(filtres.page));
    if (filtres.pageSize) params.set('pageSize', String(filtres.pageSize));

    const reponse = await api.get<unknown>(
      `/contraintes?${params.toString()}`,
      { schema: zEnveloppeContraintes },
    );
    return normaliserListe(reponse, zContrainte);
  },

  /** Détecte les conflits de contraintes d’une version (GET /contraintes/conflits). */
  async detecterConflits(versionId: string): Promise<ConflitContrainte[]> {
    const params = new URLSearchParams({ versionId });
    const reponse = await api.get<unknown>(
      `/contraintes/conflits?${params.toString()}`,
      { schema: zEnveloppeConflits },
    );
    if (!reponse.data) return [];
    return reponse.data as ConflitContrainte[];
  },

  /** Crée une contrainte (POST /contraintes). */
  async creer(
    donnees: ContrainteCreate,
  ): Promise<{ contrainte: Contrainte; avertissements: string[] }> {
    const reponse = await api.post<{
      contrainte: Contrainte;
      avertissements: string[];
    }>('/contraintes', donnees, {
      schema: zContrainte,
    });
    if (!reponse.data) {
      throw new Error('Aucune contrainte retournée à la création.');
    }
    return reponse.data as {
      contrainte: Contrainte;
      avertissements: string[];
    };
  },

  /** Met à jour partiellement une contrainte (PATCH /contraintes/:id). */
  async mettreAJour(
    params: ContrainteParams,
    donnees: ContrainteUpdate,
  ): Promise<Contrainte> {
    const reponse = await api.patch<Contrainte>(
      `/contraintes/${params.id}`,
      donnees,
      { schema: zContrainte },
    );
    if (!reponse.data) {
      throw new Error('Aucune contrainte retournée à la mise à jour.');
    }
    return reponse.data as Contrainte;
  },

  /** Supprime une contrainte (DELETE /contraintes/:id). */
  async supprimer(params: ContrainteParams): Promise<void> {
    await api.del<void>(`/contraintes/${params.id}`);
  },
};

export type { Contrainte, ContrainteCreate, ContrainteUpdate, ContrainteParams };
