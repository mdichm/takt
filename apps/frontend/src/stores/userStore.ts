// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { queryClient } from '@/lib/queryClient';
import type { SessionUtilisateur } from './types';

/** Fonction fournie par le fournisseur d'authentification (mémoire uniquement). */
type ObtenirJeton = () => string | null;

interface UtilisateurStoreState {
  session: SessionUtilisateur | null;
  jetonAcces: string | null; // Mémoire seule, jamais persisté (GG-17)
  obtenirJeton: ObtenirJeton | null;
  estAuthentifie: boolean;
  definirSession: (utilisateur: SessionUtilisateur, jeton: string | null) => void;
  setJeton: (jeton: string | null) => void;
  configurerQueryClient: (client: typeof queryClient) => void;
  deconnecter: () => void;
}

const createUtilisateurStore = (): UtilisateurStoreState => ({
  session: null,
  jetonAcces: null,
  obtenirJeton: null,
  estAuthentifie: false,

  definirSession: (utilisateur, jeton) => {
    userStore.setState({
      session: utilisateur,
      jetonAcces: jeton ?? null,
      estAuthentifie: true,
    });
  },

  setJeton: (jeton) => {
    userStore.setState({ jetonAcces: jeton ?? null });
  },

  configurerQueryClient: (_client) => {
    // Le QueryClient est importé au niveau module et utilisé directement par
    // deconnecter(). Cette méthode existe pour l'appel explicite depuis
    // main.tsx et une future injectation de client personnalisé.
    void _client;
  },

  deconnecter: () => {
    userStore.setState({
      session: null,
      jetonAcces: null,
      estAuthentifie: false,
    });
    // Purge le cache de requêtes TanStack Query (GG-17 : pas de jeton résiduel).
    queryClient.clear();
  },
});

export const userStore = create<UtilisateurStoreState>()(
  persist(() => createUtilisateurStore(), {
    name: 'takt-utilisateur',
    storage: createJSONStorage(() => localStorage),
    // Le jeton d'accès n'est JAMAIS persistant (GG-17).
    partialize: (etat) => ({
      session: etat.session,
      estAuthentifie: etat.estAuthentifie,
    }),
  }),
);
