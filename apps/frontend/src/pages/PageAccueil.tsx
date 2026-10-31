// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { TitreApplication } from '@/components/atoms/TitreApplication';

/** Page d'accueil temporaire du squelette frontend. */
export function PageAccueil(): JSX.Element {
  return (
    <main>
      <TitreApplication />
      <p>Planification des emplois du temps pédagogiques</p>
    </main>
  );
}
