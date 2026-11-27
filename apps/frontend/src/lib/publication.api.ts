// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z, type ZodTypeAny } from 'zod';
import { api, type ReponseApi, versPagination } from './api';
import { validerReponseApi } from './validation';
import {
  zVersionItem,
  zVersionListe,
  type ActionTransition,
  type EtatVersion,
  type ExportInput,
  type VersionItem,
} from '@takt/contracts';

/**
 * Client API pour les écrans EC-GES-09 (Publication), EC-GES-10 (Archivage)
 * et EC-GES-11 (Exports).
 *
 * Les endpoints utilisés existent déjà côté backend (liste/détail des versions,
 * transition d'état, duplication d'une archive). Les endpoints d'export
 * (/exports) sont prévus par les contrats Zod (zExport) mais leur implémentation
 * backend dépend des tickets L10-01 à L10-05. Ce client est donc écrit contre
 * les contrats attendus et testé avec des réponses mockées.
 *
 * Aucun schéma de réponse d'export n'existe encore dans @takt/contracts
 * (dépend de L10-02…L10-04). Un schéma local minimal est utilisé en attendant,
 * avec justification GG-04 ci-dessous.
 */

// any-justify: schéma local temporaire en attendant le contrat d'export partagé (L10).
const zExportItem = z.object({
  id: z.string().uuid(),
  versionId: z.string().uuid(),
  format: z.enum(['xlsx', 'pdf', 'ics']),
  cheminFichier: z.string(),
  dateGeneration: z.string().datetime(),
  url: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
  tailleOctets: z.number().int().nonnegative().optional(),
  statut: z.enum(['en_cours', 'pret', 'echec', 'expire']).optional(),
});

const zExportListe = z.object({
  items: z.array(zExportItem),
  meta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive().max(200),
    total: z.number().int().nonnegative(),
  }),
});

const zEnveloppeExport = (schema: ZodTypeAny) =>
  z.object({
    data: schema.nullable(),
    error: z.nullable(z.object({ code: z.string(), message: z.string().optional() })),
    meta: z.object({
      requestId: z.string(),
      timestamp: z.string(),
      page: z.number().int().positive().optional(),
      pageSize: z.number().int().positive().max(200).optional(),
      total: z.number().int().nonnegative().optional(),
    }),
  });

interface ListePaginee<T> {
  items: T[];
  meta: { page: number; pageSize: number; total: number };
}

function normaliserVersionListe(
  reponse: ReponseApi<unknown>,
): ListePaginee<VersionItem> {
  const donnees = validerReponseApi(zEnveloppeExport(zVersionListe), reponse);
  const items = (donnees.data?.items ?? []).map((item: unknown) =>
    validerReponseApi(zVersionItem, item),
  );
  const meta = donnees.data?.meta ?? reponse.meta;
  return {
    items,
    meta: versPagination(meta),
  };
}

export const publicationApi = {
  /*───── Versions ─────*/

  /** Liste paginée des versions (GET /api/v1/versions). */
  async listerVersions(
    filtres?: {
      page?: number;
      pageSize?: number;
      etat?: EtatVersion;
      search?: string;
      sortBy?: 'etat' | 'createdAt' | 'updatedAt';
      sortDirection?: 'asc' | 'desc';
    },
  ): Promise<ListePaginee<VersionItem>> {
    const params = new URLSearchParams();
    if (filtres?.page) params.set('page', String(filtres.page));
    if (filtres?.pageSize) params.set('pageSize', String(filtres.pageSize));
    if (filtres?.etat) params.set('etat', filtres.etat);
    if (filtres?.search) params.set('search', filtres.search);
    if (filtres?.sortBy) params.set('sortBy', filtres.sortBy);
    if (filtres?.sortDirection) params.set('sortDirection', filtres.sortDirection);

    const reponse = await api.get<unknown>(`/versions?${params.toString()}`, {
      schema: zEnveloppeExport(zVersionListe),
    });
    return normaliserVersionListe(reponse);
  },

  /** Détail d'une version (GET /api/v1/versions/:id). */
  async obtenirVersion(id: string): Promise<VersionItem> {
    const reponse = await api.get<VersionItem>(
      `/versions/${encodeURIComponent(id)}`,
      { schema: zEnveloppeExport(zVersionItem) },
    );
    if (!reponse.data) {
      throw new Error('Version introuvable.');
    }
    return validerReponseApi(zVersionItem, reponse.data);
  },

  /** Applique une transition de workflow (POST /api/v1/versions/:id/transition). */
  async transitionnerVersion(
    id: string,
    action: ActionTransition,
    motif?: string,
    typeMotif?: 'pedagogique' | 'planning' | 'autre',
  ): Promise<VersionItem> {
    const reponse = await api.post<VersionItem>(
      `/versions/${encodeURIComponent(id)}/transition`,
      {
        action,
        ...(motif !== undefined ? { motif } : {}),
        ...(typeMotif !== undefined ? { typeMotif } : {}),
      },
      {
        schema: zEnveloppeExport(zVersionItem),
      },
    );
    if (!reponse.data) {
      throw new Error('Aucune version retournée par la transition.');
    }
    return validerReponseApi(zVersionItem, reponse.data);
  },

  /** Duplique une version archivée en nouvel état initial (POST /api/v1/versions/:id/dupliquer). */
  async dupliquerVersionArchivee(id: string): Promise<VersionItem> {
    const reponse = await api.post<VersionItem>(
      `/versions/${encodeURIComponent(id)}/dupliquer`,
      {},
      { schema: zEnveloppeExport(zVersionItem) },
    );
    if (!reponse.data) {
      throw new Error('Aucune version retournée par la duplication.');
    }
    return validerReponseApi(zVersionItem, reponse.data);
  },

  /*───── Exports ─────*/

  /** Demande la génération d'un export (POST /api/v1/exports). */
  async preparerExport(donnees: ExportInput): Promise<{
    exportId: string;
    url: string;
    expiresAt: string;
  }> {
    const reponse = await api.post<unknown>('/exports', donnees, {
      schema: zEnveloppeExport(zExportItem),
    });
    if (!reponse.data) {
      throw new Error('Aucun export retourné.');
    }
    const exporte = validerReponseApi(zExportItem, reponse.data);
    return {
      exportId: exporte.id,
      url: exporte.url ?? '',
      expiresAt: exporte.expiresAt ?? '',
    };
  },

  /** Historique paginé des exports (GET /api/v1/exports). */
  async listerExports(
    filtres?: {
      page?: number;
      pageSize?: number;
      format?: 'xlsx' | 'pdf' | 'ics';
    },
  ): Promise<
    ListePaginee<{
      id: string;
      versionId: string;
      format: string;
      dateGeneration: string;
      url?: string;
      expiresAt?: string;
      tailleOctets?: number;
      statut?: string;
    }>
  > {
    const params = new URLSearchParams();
    if (filtres?.page) params.set('page', String(filtres.page));
    if (filtres?.pageSize) params.set('pageSize', String(filtres.pageSize));
    if (filtres?.format) params.set('format', filtres.format);

    const reponse = await api.get<unknown>(`/exports?${params.toString()}`, {
      schema: zEnveloppeExport(zExportListe),
    });
    const donnees = validerReponseApi(zEnveloppeExport(zExportListe), reponse);
    const itemsList = (donnees.data as { items: unknown[] } | null)?.items ?? [];
    const items = itemsList.map((item: unknown) =>
      validerReponseApi(zExportItem, item),
    );
    const meta = donnees.data?.meta ?? reponse.meta;
    return {
      items: items.map((i) => ({
        id: i.id,
        versionId: i.versionId,
        format: i.format,
        dateGeneration: i.dateGeneration,
        url: i.url ?? undefined,
        expiresAt: i.expiresAt ?? undefined,
        tailleOctets: i.tailleOctets ?? undefined,
        statut: i.statut ?? undefined,
      })),
      meta: versPagination(meta),
    };
  },
};

export type { VersionItem, ExportInput, ActionTransition, EtatVersion };
