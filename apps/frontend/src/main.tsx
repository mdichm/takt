// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { amorcerApi } from '@/lib/amorcage';
import { userStore } from '@/stores/userStore';
import { Router } from '@/app/router';
import { AppProviders } from '@/app/providers';
import { declencherPurgeSessionGlobale } from '@/app/providers';
import '@/styles.css';

// Amorçage : le jeton d'accès est obtenu depuis le store Zustand (mémoire).
// Il n'est jamais dans localStorage (GG-17).
amorcerApi({
  obtenirJeton: () => userStore.getState().jetonAcces,
  surSessionExpirée: () => {
    declencherPurgeSessionGlobale();
  },
});

const racine = document.getElementById('root');

if (!racine) {
  throw new Error("L'élément racine #root est introuvable");
}

createRoot(racine).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <Router />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);
