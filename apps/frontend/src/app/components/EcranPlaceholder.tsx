// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { TitreApplication } from '@/components/atoms/TitreApplication';

/** Placeholder générique pour un écran EC-* dont l implémentation métier est différée (lot L09). */
export function EcranPlaceholder({ code }: { code: string }): JSX.Element {
  return (
    <section>
      <TitreApplication />
      <h2>Écran {code}</h2>
      <p>Cet écran sera implémenté dans le lot L09 (frontend métier).</p>
    </section>
  );
}
