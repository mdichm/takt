// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PageAccueil } from '@/pages/PageAccueil';
import '@/styles.css';

const racine = document.getElementById('root');

if (!racine) {
  throw new Error("L'élément racine #root est introuvable");
}

createRoot(racine).render(
  <StrictMode>
    <PageAccueil />
  </StrictMode>,
);
