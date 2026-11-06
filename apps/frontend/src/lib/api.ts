// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { type ZodTypeAny } from 'zod';
import {
  validerReponseApi,
  zReponseRefresh,
  type ReponseRefresh,
} from './validation';
import { mapHttpError, type ErreurApi } from './errors';
import { type MetaApi } from '@takt/contracts';

export type MethodeHTTP = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ReponseApi<T> {
  data: T | null;
  meta: MetaApi;
}

export interface OptionsRequete {
  methode: MethodeHTTP;
  chemin: string;
  corps?: unknown;
  schema?: ZodTypeAny;
  signal?: AbortSignal;
  tentativeRefresh?: boolean;
}

export interface ConfigurationApi {
  baseUrl: string;
  obtenirJeton: () => string | null;
  surSessionExpirée: () => void;
  journaliser: (evenement: EvenementJournal) => void;
}

export interface EvenementJournal {
  methode: string;
  chemin: string;
  statut: number;
  dureeMs: number;
  requestId?: string;
}

let configuration: ConfigurationApi = {
  baseUrl: '/api/v1',
  obtenirJeton: () => null,
  surSessionExpirée: () => {},
  journaliser: () => {},
};

export function configurerApi(config: Partial<ConfigurationApi>): void {
  configuration = { ...configuration, ...config };
}

let refreshEnCours: Promise<string | null> | null = null;

function purgerJeton(): void {
  // Le jeton est détenu par la closure du fournisseur (obtenirJeton). La purge
  // effective côté store est invoquée via surSessionExpirée.
}

async function rafraichirJeton(): Promise<string | null> {
  if (refreshEnCours) {
    return refreshEnCours;
  }
  refreshEnCours = (async (): Promise<string | null> => {
    try {
      const reponse = await fetch(`${configuration.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!reponse.ok) {
        return null;
      }
      const corps = (await reponse
        .json()
        .catch(() => null)) as { data: ReponseRefresh['data'] } | null;
      if (!corps || !corps.data) {
        return null;
      }
      const donnees = validerReponseApi(zReponseRefresh, corps);
      return donnees.data?.accessToken ?? null;
    } finally {
      refreshEnCours = null;
    }
  })();
  return refreshEnCours;
}

function journaliserRequete(
  methode: MethodeHTTP,
  chemin: string,
  reponse: Response,
  dureeMs: number,
  contenu: { meta?: unknown } | null,
): void {
  const requestId = contenu?.meta
    ? (contenu.meta as { requestId?: string }).requestId
    : undefined;
  const evenement: EvenementJournal = {
    methode,
    chemin,
    statut: reponse.status,
    dureeMs,
  };
  if (requestId !== undefined) {
    evenement.requestId = requestId;
  }
  configuration.journaliser(evenement);
}

async function requete<T>(
  options: OptionsRequete,
  obtenirJetonOverride?: () => string | null,
): Promise<ReponseApi<T>> {
  const {
    methode,
    chemin,
    corps,
    schema,
    signal,
    tentativeRefresh = false,
  } = options;

  const enTetes: Record<string, string> = {};
  const jeton = (obtenirJetonOverride ?? configuration.obtenirJeton)();
  if (jeton) {
    enTetes.Authorization = `Bearer ${jeton}`;
  }
  if (corps) {
    enTetes['Content-Type'] = 'application/json';
  }

  const url = `${configuration.baseUrl}${chemin}`;
  const debut = Date.now();

  const init: RequestInit = {
    method: methode,
    credentials: 'include',
    headers: enTetes,
    ...(corps ? { body: JSON.stringify(corps) } : {}),
    ...(signal ? { signal } : {}),
  };

  const reponse = await fetch(url, init);
  const dureeMs = Date.now() - debut;

  const contenu = (await reponse
    .json()
    .catch(() => null)) as { data: unknown; error: unknown; meta: unknown } | null;

  journaliserRequete(methode, chemin, reponse, dureeMs, contenu);

  if (!reponse.ok) {
    const erreur = mapHttpError(
      reponse,
      contenu?.error as
        | { code?: string; message?: string; details?: unknown; requestId?: string }
        | undefined,
    );

    if (reponse.status === 401) {
      if (tentativeRefresh) {
        // Déjà renouvelé une fois : la session est morte, on ne boucle pas.
        purgerJeton();
        configuration.surSessionExpirée();
        throw erreur;
      }
      const nouveauJeton = await rafraichirJeton();
      if (nouveauJeton) {
        return requete(
          { ...options, tentativeRefresh: true },
          () => nouveauJeton,
        );
      }
      purgerJeton();
      configuration.surSessionExpirée();
      throw erreur;
    }

    throw erreur;
  }

  if (!contenu) {
    const erreur = mapHttpError(reponse);
    throw erreur;
  }

  if (contenu.error !== null) {
    const erreur = mapHttpError(reponse, contenu.error as { code?: string; message?: string; details?: unknown; requestId?: string });
    throw erreur;
  }

  let donnees: T | null = null;
  if (schema) {
    const enveloppeValidee = validerReponseApi(schema, contenu);
    donnees = (enveloppeValidee as { data: T | null }).data;
  } else {
    donnees = (contenu.data as T) ?? null;
  }

  const meta: MetaApi = (contenu.meta as MetaApi) ?? {
    requestId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };

  return { data: donnees, meta };
}

export function get<T>(
  chemin: string,
  options: { schema?: ZodTypeAny; signal?: AbortSignal } = {},
): Promise<ReponseApi<T>> {
  return requete<T>({ methode: 'GET', chemin, ...options });
}

export function post<T>(
  chemin: string,
  corps?: unknown,
  options: { schema?: ZodTypeAny; signal?: AbortSignal } = {},
): Promise<ReponseApi<T>> {
  return requete<T>({ methode: 'POST', chemin, corps, ...options });
}

export function put<T>(
  chemin: string,
  corps?: unknown,
  options: { schema?: ZodTypeAny; signal?: AbortSignal } = {},
): Promise<ReponseApi<T>> {
  return requete<T>({ methode: 'PUT', chemin, corps, ...options });
}

export function patch<T>(
  chemin: string,
  corps?: unknown,
  options: { schema?: ZodTypeAny; signal?: AbortSignal } = {},
): Promise<ReponseApi<T>> {
  return requete<T>({ methode: 'PATCH', chemin, corps, ...options });
}

export function del<T>(
  chemin: string,
  options: { schema?: ZodTypeAny; signal?: AbortSignal } = {},
): Promise<ReponseApi<T>> {
  return requete<T>({ methode: 'DELETE', chemin, ...options });
}

export const api = {
  get,
  post,
  put,
  patch,
  del,
  configurer: configurerApi,
};

export function versPagination(meta: MetaApi): {
  page: number;
  pageSize: number;
  total: number;
} {
  return {
    page: meta.page ?? 1,
    pageSize: meta.pageSize ?? 20,
    total: meta.total ?? 0,
  };
}

export type { ErreurApi };
