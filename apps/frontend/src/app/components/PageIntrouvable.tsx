// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/** Page 404 affichée quand aucune route ne correspond. */
export function PageIntrouvable(): JSX.Element {
  return (
    <section>
      <h1 data-testid="page-404">Page introuvable (404)</h1>
      <p>L écran demandé n existe pas.</p>
    </section>
  );
}
