// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { api } from './api';
import { validerReponseApi } from './validation';
import {
  zEnvelope,
  zVersionItem,
  type TransitionInput,
  type VersionItem,
} from '@takt/contracts';

const zEnveloppeTransition = zEnvelope(zVersionItem);

/**
 * Client API typé — Transitions de version de planning (workflow).
 * Endpoint : POST /api/v1/versions/:id/transition
 */
export const versionsApi = {
  /**
   * Déclenche une transition d'état de version.
   * Retourne un VersionItem complet (9 champs du contrat zVersionItem).
   * Ex. : `transmettreDirection`, `rejeterPedagogique`, …
   *
   * @throws ErreurApi si la transition est interdite (409) ou le motif manquant (400).
   */
  async transitionner(
    versionId: string,
    donnees: TransitionInput,
  ): Promise<VersionItem> {
    const reponse = await api.post<unknown>(
      `/versions/${encodeURIComponent(versionId)}/transition`,
      donnees,
      { schema: zEnveloppeTransition },
    );
    if (!reponse.data) {
      throw new Error('Aucune donnée retournée par la transition de version.');
    }
    return validerReponseApi(zVersionItem, reponse.data);
  },
};

export type { TransitionInput, VersionItem };
