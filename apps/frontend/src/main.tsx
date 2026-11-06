// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { amorcerApi } from '@/lib/amorcage';
import { userStore } from '@/stores/userStore';
import { PageAccueil } from '@/pages/PageAccueil';
import '@/styles.css';

// Amorçage : le jeton d'accès est obtenu depuis la mémoire (fournisseur
// d'authentification à brancher). Il n'est jamais dans localStorage (GG-17).
amorcerApi({
  obtenirJeton: () => null,
  surSessionExpirée: () => {
    userStore.getState().deconnecter();
  },
});
userStore.getState().configurerQueryClient(queryClient);

const racine = document.getElementById('root');

if (!racine) {
  throw new Error("L'élément racine #root est introuvable");
}

createRoot(racine).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PageAccueil />
    </QueryClientProvider>
  </StrictMode>,
);
