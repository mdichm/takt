// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Link } from 'react-router-dom';

/** Page 404 affichee quand aucune route ne correspond. */
export function PageError(): JSX.Element {
  return (
    <section data-testid="page-error" aria-label="Page introuvable">
      <h1 data-testid="page-404-titre">Page introuvable (404)</h1>
      <p data-testid="page-404-message">
        L ecran demande n existe pas ou a ete deplace.
      </p>
      <Link to="/dashboard" data-testid="page-404-retour">
        Retour au tableau de bord
      </Link>
    </section>
  );
}
