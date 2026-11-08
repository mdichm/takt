// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { create } from 'zustand';
import { queryClient } from '@/lib/queryClient';
import { EtatVersion } from '@takt/contracts';
import { type VersionCourante, type InterditMutation, estEtatImmuable } from './types';

export const versionStore = create<VersionStoreState>((set, get) => ({
  version: null,
  etat: null,
  interdits: [],

  definirVersion: (id, etat, semestreId, snapshotId) =>
    set({
      version: { id, etat, semestreId, snapshotId },
      etat,
    }),

  reinitialiser: () => set({ version: null, etat: null, interdits: [] }),

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
}));

interface VersionStoreState {
  version: VersionCourante | null;
  etat: EtatVersion | null;
  interdits: InterditMutation[];
  definirVersion: (id: string, etat: EtatVersion, semestreId?: string, snapshotId?: string) => void;
  reinitialiser: () => void;
  ajouterInterdit: (action: string, raison: string) => void;
  supprimerInterdit: (action: string) => void;
  estModifiable: () => boolean;
  interditsDeMutation: () => InterditMutation[];
}

// Le QueryClient n'est pas persistant dans le store version (pas de jeton).
// Il est disponible via le module queryClient si nécessaire.
void queryClient;
