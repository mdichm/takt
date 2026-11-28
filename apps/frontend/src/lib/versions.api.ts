// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { api } from './api';
import {
  zEnvelope,
  zTransition,
  type TransitionInput,
} from '@takt/contracts';

const zEnveloppeTransition = zEnvelope(zTransition);

/**
 * Client API typé — Transitions de version de planning (workflow).
 * Endpoint : POST /api/v1/versions/:id/transition
 */
export const versionsApi = {
  /**
   * Déclenche une transition d'état de version.
   * Ex. : `transmettreDirection`, `rejeterPedagogique`, …
   *
   * @throws ErreurApi si la transition est interdite (409) ou le motif manquant (400).
   */
  async transitionner(
    versionId: string,
    donnees: TransitionInput,
  ): Promise<unknown> {
    const reponse = await api.post<unknown>(
      `/versions/${encodeURIComponent(versionId)}/transition`,
      donnees,
      { schema: zEnveloppeTransition },
    );
    if (!reponse.data) {
      throw new Error('Aucune donnée retournée par la transition de version.');
    }
    return reponse.data;
  },
};

export type { TransitionInput };
