// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z, type ZodTypeAny } from 'zod';
import { api, type ReponseApi } from './api';
import { validerReponseApi } from './validation';
import {
  zConflitsListe,
  type ConflitsListe,
  zCreneau,
  type Creneau,
  zLock,
  type Lock,
  type LockListFilters,
  zBail,
  type Bail,
  zErreurApi,
  zMetaApi,
  zSeance,
  type Seance,
  zEnvelope,
  type SeanceListFilters,
  type SeanceUpdateInput,
  type SimulationRequete,
  zSimulationReponse,
  type SimulationReponse,
  type LockCreateInput,
  type CreneauListFilters,
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
  Schémas d'enveloppe de reponse (validation Zod, GG-05)
──────────────────────────────────────────────────────────────────────────────*/

const zEnveloppeSeances = zEnvelope(z.array(zSeance));
const zEnveloppeCreneaux = zEnvelope(z.array(zCreneau));
const zEnveloppeVerrous = zEnvelope(z.array(zLock));
const zEnveloppeConflits = zEnvelope(zConflitsListe);
const zEnveloppeBail = zEnvelope(zBail);

/*──────────────────────────────────────────────────────────────────────────────
  Client API typé — Planning / EDT (TAKT-L09-09)
──────────────────────────────────────────────────────────────────────────────*/

export const planningApi = {
  /*───── Seances ─────*/

  /** Liste paginee des seances d'une version (GET /api/v1/seances). */
  async listerSeances(
    filtres: SeanceListFilters,
  ): Promise<ListeNormalisee<Seance>> {
    const params = new URLSearchParams();
    if (filtres.versionId) params.set('versionId', filtres.versionId);
    if (filtres.jour !== undefined) params.set('jour', String(filtres.jour));
    if (filtres.salleId) params.set('salleId', filtres.salleId);
    if (filtres.enseignantId) params.set('enseignantId', filtres.enseignantId);
    if (filtres.groupeId) params.set('groupeId', filtres.groupeId);
    if (filtres.matiereId) params.set('matiereId', filtres.matiereId);
    if (filtres.typeEnseignementId)
      params.set('typeEnseignementId', filtres.typeEnseignementId);
    if (filtres.affectationId) params.set('affectationId', filtres.affectationId);
    if (filtres.estVerrouillee !== undefined)
      params.set('estVerrouillee', String(filtres.estVerrouillee));
    if (filtres.page) params.set('page', String(filtres.page));
    if (filtres.pageSize) params.set('pageSize', String(filtres.pageSize));
    if (filtres.sortBy) params.set('sortBy', filtres.sortBy);
    if (filtres.sortDirection)
      params.set('sortDirection', filtres.sortDirection);

    const reponse = await api.get<unknown>(
      `/seances?${params.toString()}`,
      { schema: zEnveloppeSeances },
    );
    return normaliserListe(reponse, zSeance);
  },

  /** Detail d'une seance (GET /api/v1/seances/:id). */
  async obtenirSeance(id: string): Promise<Seance> {
    const reponse = await api.get<Seance>(
      `/seances/${encodeURIComponent(id)}`,
      { schema: zEnvelope(zSeance) },
    );
    if (!reponse.data) {
      throw new Error('Aucune seance retournee.');
    }
    return reponse.data;
  },

  /** Deplace/modifie partiellement une seance (PATCH /api/v1/seances/:id). */
  async deplacerSeance(
    id: string,
    donnees: SeanceUpdateInput,
  ): Promise<Seance> {
    const reponse = await api.patch<Seance>(
      `/seances/${encodeURIComponent(id)}`,
      donnees,
      { schema: zEnvelope(zSeance) },
    );
    if (!reponse.data) {
      throw new Error('Aucune seance retournee au deplacement.');
    }
    return reponse.data;
  },
  /*───── Conflits ─────*/

  /** Detecte les conflits d'une seance projetee sur une version (GET /api/v1/versions/:id/conflits). */
  async detecterConflits(
    versionId: string,
    query: {
      jour: number;
      creneauDebutId: string;
      nbCreneaux: number;
      salleId?: string;
      enseignantId?: string;
      groupeId?: string;
    },
  ): Promise<ConflitsListe> {
    const params = new URLSearchParams({
      jour: String(query.jour),
      creneauDebutId: query.creneauDebutId,
      nbCreneaux: String(query.nbCreneaux),
    });
    if (query.salleId) params.set('salleId', query.salleId);
    if (query.enseignantId) params.set('enseignantId', query.enseignantId);
    if (query.groupeId) params.set('groupeId', query.groupeId);

    const reponse = await api.get<ConflitsListe>(
      `/versions/${encodeURIComponent(versionId)}/conflits?${params.toString()}`,
      { schema: zEnveloppeConflits },
    );
    if (!reponse.data) {
      throw new Error('Aucune donnee retournee pour la detection de conflits.');
    }
    return reponse.data;
  },

  /*───── Simulation d'alternatives ─────*/

  /** Simule des alternatives de placement pour une seance (POST /api/v1/seances/:id/simuler). */
  async simuler(
    seanceId: string,
    body: SimulationRequete,
  ): Promise<SimulationReponse> {
    const reponse = await api.post<SimulationReponse>(
      `/seances/${encodeURIComponent(seanceId)}/simuler`,
      body,
      { schema: zSimulationReponse },
    );
    if (!reponse.data) {
      throw new Error('Aucune alternative retournee par la simulation.');
    }
    return reponse.data;
  },

  /*───── Verrous ─────*/

  /** Liste des verrous (GET /api/v1/locks). */
  async listerVerrous(
    filtres: LockListFilters = { page: 1, pageSize: 100 },
  ): Promise<ListeNormalisee<Lock>> {
    const params = new URLSearchParams();
    if (filtres.versionId) params.set('versionId', filtres.versionId);
    if (filtres.seanceId) params.set('seanceId', filtres.seanceId);
    if (filtres.type) params.set('type', filtres.type);
    if (filtres.valeur) params.set('valeur', filtres.valeur);
    if (filtres.page) params.set('page', String(filtres.page));
    if (filtres.pageSize) params.set('pageSize', String(filtres.pageSize));
    if (filtres.sortBy) params.set('sortBy', filtres.sortBy);
    if (filtres.sortDirection) params.set('sortDirection', filtres.sortDirection);

    const reponse = await api.get<unknown>(
      `/locks?${params.toString()}`,
      { schema: zEnveloppeVerrous },
    );
    return normaliserListe(reponse, zLock);
  },

  /** Pose un verrou (individuel ou en masse) (POST /api/v1/locks). */
  async poserVerrou(donnees: LockCreateInput): Promise<Lock> {


    const reponse = await api.post<Lock>('/locks', donnees, {
      schema: z.object({
        data: zLock.nullable(),
        error: zErreurApi.nullable(),
        meta: zMetaApi,
      }),
    });
    if (!reponse.data) {
      throw new Error('Aucun verrou retourne a la pose.');
    }
    return reponse.data;
  },

  /** Leve un verrou (DELETE /api/v1/locks/:id). */
  async leverVerrou(id: string): Promise<void> {
    await api.del(`/locks/${encodeURIComponent(id)}`);
  },

  /*───── Bail d'edition ─────*/

  /** Acquiert le bail d'edition sur une version (POST /api/v1/versions/:id/bail). */
  async acquerirBail(versionId: string): Promise<Bail> {
    const reponse = await api.post<Bail>(
      `/versions/${encodeURIComponent(versionId)}/bail`,
      {},
      { schema: zEnveloppeBail },
    );
    if (!reponse.data) {
      throw new Error('Aucun bail retourne a l acquisition.');
    }
    return reponse.data;
  },

  /** Renouvelle le bail d'edition (POST /api/v1/versions/:id/bail/renouveler). */
  async renouvelerBail(versionId: string): Promise<Bail> {
    const reponse = await api.post<Bail>(
      `/versions/${encodeURIComponent(versionId)}/bail/renouveler`,
      {},
      { schema: zEnveloppeBail },
    );
    if (!reponse.data) {
      throw new Error('Aucun bail retourne au renouvellement.');
    }
    return reponse.data;
  },

  /** Liber le bail d'edition (DELETE /api/v1/versions/:id/bail). */
  async libererBail(versionId: string): Promise<void> {
    await api.del(`/versions/${encodeURIComponent(versionId)}/bail`);
  },

  /** Force la liberation d'un bail par un administrateur (DELETE /api/v1/bails/:id). */
  async forcerBail(bailId: string): Promise<void> {
    await api.del(`/bails/${encodeURIComponent(bailId)}`);
  },

  /*───── Referentiels — creneaux ─────*/

  /** Liste les creneaux de la grille (GET /api/v1/referentiels/creneaux). */
  async listerCreneaux(
    filtres: CreneauListFilters = { page: 1, pageSize: 100 },
  ): Promise<ListeNormalisee<Creneau>> {
    const params = new URLSearchParams();
    if (filtres.jour !== undefined) params.set('jour', String(filtres.jour));
    if (filtres.page) params.set('page', String(filtres.page));
    if (filtres.pageSize) params.set('pageSize', String(filtres.pageSize));
    if (filtres.sortBy) params.set('sortBy', filtres.sortBy);
    if (filtres.sortDirection) params.set('sortDirection', filtres.sortDirection);

    const reponse = await api.get<unknown>(
      `/referentiels/creneaux?${params.toString()}`,
      { schema: zEnveloppeCreneaux },
    );
    return normaliserListe(reponse, zCreneau);
  },
};

export type {
  Seance,
  SeanceListFilters,
  SeanceUpdateInput,
  Lock,
  LockCreateInput,
  LockListFilters,
  Bail,
  Creneau,
  CreneauListFilters,
  ConflitsListe,
  SimulationReponse,
  SimulationRequete,
  ListeNormalisee,
};