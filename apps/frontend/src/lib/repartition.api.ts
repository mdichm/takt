// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { type ZodTypeAny } from 'zod';
import { api, type ReponseApi } from './api';
import { validerReponseApi } from './validation';
import {
  zAffectationPedagogique,
  type AffectationPedagogique,
  type AffectationPedagogiqueCreate,
  type AffectationPedagogiqueUpdate,
  zEnseignant,
  type Enseignant,
  zGroupe,
  type Groupe,
  zMatiere,
  type Matiere,
  zPlanEtudes,
  type PlanEtudes,
  zPlanEtudesMatiere,
  type PlanEtudesMatiere,
  zRepartitionValider,
  type RepartitionValiderInput,
  zRepartitionAnnuler,
  type RepartitionAnnulerInput,
  zStatutValidationRepartition,
  type StatutValidationRepartition,
  type RevalidationDetecterInput,
  zRevalidationDetecterReponse,
  type RevalidationDetecterReponse,
  type RevalidationValiderInput,
  zRevalidationValiderReponse,
  type RevalidationValiderReponse,
  zTypeEnseignement,
  type TypeEnseignement,
  zEnvelope,
  type MetaApi,
} from '@takt/contracts';

/*──────────────────────────────────────────────────────────────────────────────
  Normalisation des enveloppes de liste hétérogènes (C8)

  Certains endpoints retournent { data: T[], meta } directement (affectations,
  groupes, départements) alors que d'autres retournent
  { data: { items: T[], meta } } (enseignants, matières, types d'enseignement,
  plans d'études). Ce normalisateur accepte les deux formats.
──────────────────────────────────────────────────────────────────────────────*/

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

/*──────────────────────────────────────────────────────────────────────────────
  Schémas de réponse d'enveloppe (pour validation via api.get/post)
──────────────────────────────────────────────────────────────────────────────*/

const zEnveloppeAffectations = zEnvelope(zAffectationPedagogique);
const zEnveloppePlanEtudesMatieres = zEnvelope(zPlanEtudesMatiere);
const zEnveloppeValider = zEnvelope(zRepartitionValider);
const zEnveloppeAnnuler = zEnvelope(zRepartitionAnnuler);
const zEnveloppeStatutValidation = zEnvelope(zStatutValidationRepartition);
const zEnveloppeRevalidationDetecter = zEnvelope(zRevalidationDetecterReponse);
const zEnveloppeRevalidationValider = zEnvelope(zRevalidationValiderReponse);
const zEnveloppePlanEtudes = zEnvelope(zPlanEtudes);
const zEnveloppeEnseignants = zEnvelope(zEnseignant);
const zEnveloppeGroupes = zEnvelope(zGroupe);
const zEnveloppeTypesEnseignement = zEnvelope(zTypeEnseignement);
const zEnveloppeMatieres = zEnvelope(zMatiere);

/*──────────────────────────────────────────────────────────────────────────────
  Client API typé — Répartition (TAKT-L05-06)
──────────────────────────────────────────────────────────────────────────────*/

export const repartitionApi = {
  /*───── Affectations pédagogiques ─────*/

  /** Liste paginée des affectations d'une version/semestre/département. */
  async listerAffectations(
    versionId: string,
    departementId: string,
    page = 1,
    pageSize = 50,
  ): Promise<ListeNormalisee<AffectationPedagogique>> {
    const params = new URLSearchParams({
      versionId,
      departementId,
      page: String(page),
      pageSize: String(pageSize),
    });
    const reponse = await api.get<unknown>(
      `/affectations?${params.toString()}`,
      { schema: zEnveloppeAffectations },
    );
    return normaliserListe(reponse, zAffectationPedagogique);
  },

  /** Crée une affectation pédagogique (POST /affectations). */
  async creerAffectation(
    donnees: AffectationPedagogiqueCreate,
  ): Promise<AffectationPedagogique> {
    const reponse = await api.post<AffectationPedagogique>(
      '/affectations',
      donnees,
      { schema: zEnveloppeAffectations },
    );
    if (!reponse.data) {
      throw new Error('Aucune donnée retournée à la création d’affectation.');
    }
    return reponse.data as AffectationPedagogique;
  },

  /** Met à jour une affectation pédagogique (PATCH /affectations/:id). */
  async mettreAJourAffectation(
    id: string,
    donnees: AffectationPedagogiqueUpdate,
  ): Promise<AffectationPedagogique> {
    const reponse = await api.patch<AffectationPedagogique>(
      `/affectations/${id}`,
      donnees,
      { schema: zEnveloppeAffectations },
    );
    if (!reponse.data) {
      throw new Error('Aucune donnée retournée à la mise à jour d’affectation.');
    }
    return reponse.data as AffectationPedagogique;
  },

  /** Supprime une affectation pédagogique (DELETE /affectations/:id). */
  async supprimerAffectation(id: string): Promise<void> {
    await api.del(`/affectations/${id}`);
  },

  /*───── Plan d'études — matières ─────*/
  /** Liste les matières d'un plan d'études (GET /plans-etudes/:id/matieres). */
  async listerMatieresPlanEtudes(planEtudesId: string): Promise<{
    items: PlanEtudesMatiere[];
    meta: MetaApi;
  }> {
    const reponse = await api.get<unknown>(
      `/plans-etudes/${planEtudesId}/matieres`,
      { schema: zEnveloppePlanEtudesMatieres },
    );
    return normaliserListe(reponse, zPlanEtudesMatiere);
  },

  /*───── Plans d'études ─────*/
  /** Liste les plans d'études d'un département/semestre (GET /plans-etudes). */
  async listerPlansEtudes(
    filtres: { departementId: string; semestreId: string },
  ): Promise<ListeNormalisee<PlanEtudes>> {
    const params = new URLSearchParams({
      departementId: filtres.departementId,
      semestreId: filtres.semestreId,
      page: '1',
      pageSize: '50',
    });
    const reponse = await api.get<unknown>(
      `/plans-etudes?${params.toString()}`,
      { schema: zEnveloppePlanEtudes },
    );
    return normaliserListe(reponse, zPlanEtudes);
  },

  /*───── Référentiels — enseignants ─────*/
  /** Liste les enseignants du périmètre du département connecté. */
  async listerEnseignants(): Promise<ListeNormalisee<Enseignant>> {
    const reponse = await api.get<unknown>(
      '/referentiels/enseignants',
      { schema: zEnveloppeEnseignants },
    );
    return normaliserListe(reponse, zEnseignant);
  },

  /*───── Référentiels — groupes ─────*/
  /** Liste les groupes. */
  async listerGroupes(): Promise<ListeNormalisee<Groupe>> {
    const reponse = await api.get<unknown>(
      '/referentiels/groupes',
      { schema: zEnveloppeGroupes },
    );
    return normaliserListe(reponse, zGroupe);
  },

  /*───── Référentiels — types d'enseignement ─────*/
  /** Liste les types d'enseignement (CM, TD, TP, …). */
  async listerTypesEnseignement(): Promise<ListeNormalisee<TypeEnseignement>> {
    const reponse = await api.get<unknown>(
      '/referentiels/type-enseignements',
      { schema: zEnveloppeTypesEnseignement },
    );
    return normaliserListe(reponse, zTypeEnseignement);
  },

  /*───── Référentiels — matières ─────*/
  /** Liste les matières. */
  async listerMatieres(): Promise<ListeNormalisee<Matiere>> {
    const reponse = await api.get<unknown>(
      '/referentiels/matieres',
      { schema: zEnveloppeMatieres },
    );
    return normaliserListe(reponse, zMatiere);
  },

  /*───── Validation de répartition ─────*/
  /** Valide la répartition pédagogique d'un département (POST /repartition/valider). */
  async validerRepartition(
    donnees: RepartitionValiderInput,
  ): Promise<unknown> {
    return api.post<unknown>('/repartition/valider', donnees, {
      schema: zEnveloppeValider,
    });
  },

  /*───── Annulation de répartition (EX-REP-05) — D5-bis ─────*/
  /** Annule la répartition d'un département (retour à initial). */
  async annulerRepartition(
    donnees: RepartitionAnnulerInput,
  ): Promise<unknown> {
    return api.post<unknown>('/repartition/annuler', donnees, {
      schema: zEnveloppeAnnuler,
    });
  },

  /*───── États de validation ─────*/
  /** Détecte les départements impactés (POST /repartition/revalidation/detecter). */
  async detecterRevalidation(
    donnees: RevalidationDetecterInput,
  ): Promise<RevalidationDetecterReponse> {
    const reponse = await api.post<RevalidationDetecterReponse>(
      '/repartition/revalidation/detecter',
      donnees,
      { schema: zEnveloppeRevalidationDetecter },
    );
    if (!reponse.data) {
      throw new Error('Aucune donnée retournée à la détection d’impacts.');
    }
    return reponse.data as RevalidationDetecterReponse;
  },

  /** Liste les statuts de validation par département (GET /repartition/revalidation/statuts). */
  async listerStatutsValidation(
    versionId: string,
  ): Promise<StatutValidationRepartition[]> {
    const params = new URLSearchParams({ versionId });
    const reponse = await api.get<unknown>(
      `/repartition/revalidation/statuts?${params.toString()}`,
      { schema: zEnveloppeStatutValidation },
    );
    if (!reponse.data) {
      return [] as StatutValidationRepartition[];
    }
    return reponse.data as StatutValidationRepartition[];
  },

  /** Revalide un département (POST /repartition/revalidation/valider). */
  async revaliderDepartement(
    donnees: RevalidationValiderInput,
  ): Promise<RevalidationValiderReponse> {
    const reponse = await api.post<RevalidationValiderReponse>(
      '/repartition/revalidation/valider',
      donnees,
      { schema: zEnveloppeRevalidationValider },
    );
    if (!reponse.data) {
      throw new Error('Aucune donnée retournée à la revalidation.');
    }
    return reponse.data as RevalidationValiderReponse;
  },
};

export type { ListeNormalisee };
export type {
  AffectationPedagogique,
  AffectationPedagogiqueCreate,
  AffectationPedagogiqueUpdate,
  Enseignant,
  Groupe,
  Matiere,
  PlanEtudes,
  PlanEtudesMatiere,
  RepartitionValiderInput,
  RepartitionAnnulerInput,
  StatutValidationRepartition,
  TypeEnseignement,
};
