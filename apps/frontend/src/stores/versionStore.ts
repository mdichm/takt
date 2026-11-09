// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { create } from 'zustand';
import { queryClient } from '@/lib/queryClient';
import { EtatVersion } from '@takt/contracts';
import { type VersionCourante, type InterditMutation, estEtatImmuable } from './types';

/** Contexte de saisie de la répartition pédagogique (ticket TAKT-L05-06). */
export interface ContexteRepartition {
  /** Identifiant de la version de planning courante. */
  versionId: string;
  /** Identifiant du semestre de la version. */
  semestreId: string;
  /** Identifiant du département en cours de saisie (périmètre rdep). */
  departementId: string;
  /** État de workflow de la version (initial, rep_pedag, brouillon, …). */
  etatVersion: EtatVersion;
}

export const versionStore = create<VersionStoreState>((set, get) => ({
  version: null,
  etat: null,
  interdits: [],
  contexteRepartition: null,

  definirVersion: (id, etat, semestreId, snapshotId) =>
    set({
      version: { id, etat, semestreId, snapshotId },
      etat,
    }),

  /** Définition du contexte de répartition (version, semestre, département, état). */
  definirContexteRepartition: (contexte: ContexteRepartition) =>
    set({ contexteRepartition: contexte }),

  /** Purge le contexte de répartition (changement de version ou déconnexion). */
  effacerContexteRepartition: () => set({ contexteRepartition: null }),

  reinitialiser: () =>
    set({
      version: null,
      etat: null,
      interdits: [],
      contexteRepartition: null,
    }),

  ajouterInterdit: (action, raison) =>
    set((etat) => ({
      interdits: [...etat.interdits.filter((i) => i.action !== action), { action, raison }],
    })),

  supprimerInterdit: (action) =>
    set((etat) => ({
      interdits: etat.interdits.filter((i) => i.action !== action),
    })),

  estModifiable: () => {
    const { etat } = get();
    return etat !== null && !estEtatImmuable(etat);
  },

  interditsDeMutation: () => get().interdits,

  /** Retourne le contexte de répartition courant (null si non défini). */
  getContexteRepartition: () => get().contexteRepartition,
}));

interface VersionStoreState {
  version: VersionCourante | null;
  etat: EtatVersion | null;
  interdits: InterditMutation[];
  contexteRepartition: ContexteRepartition | null;
  definirVersion: (id: string, etat: EtatVersion, semestreId?: string, snapshotId?: string) => void;
  definirContexteRepartition: (contexte: ContexteRepartition) => void;
  effacerContexteRepartition: () => void;
  reinitialiser: () => void;
  ajouterInterdit: (action: string, raison: string) => void;
  supprimerInterdit: (action: string) => void;
  estModifiable: () => boolean;
  interditsDeMutation: () => InterditMutation[];
  getContexteRepartition: () => ContexteRepartition | null;
}

// Le QueryClient n'est pas persistant dans le store version (pas de jeton).
// Il est disponible via le module queryClient si nécessaire.
void queryClient;
