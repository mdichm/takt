// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { api, type ReponseApi } from '@/lib/api';
import {
  zEnvelope,
  type MetaApi,
  zProfilUtilisateur,
  type ProfilUtilisateur,
  zUuid,
  zEmail,
} from '@takt/contracts';

export const profilApi = {
  /** Récupère le profil de l'utilisateur connecté (GET /users/me). */
  async getProfil(): Promise<ReponseApi<ProfilUtilisateur>> {
    const reponse = await api.get('users/me', {
      schema: zEnvelope(zProfilUtilisateur),
    });
    return {
      data: reponse.data as ProfilUtilisateur | null,
      meta: reponse.meta as MetaApi,
    };
  },

  /** Met à jour le profil de l'utilisateur connecté (PATCH /users/me). */
  async updateProfil(
    donnees: Record<string, unknown>,
  ): Promise<ReponseApi<ProfilUtilisateur>> {
    const reponse = await api.patch('users/me', donnees, {
      schema: zEnvelope(zProfilUtilisateur),
    });
    return {
      data: reponse.data as ProfilUtilisateur | null,
      meta: reponse.meta as MetaApi,
    };
  },

  /** Change le mot de passe de l'utilisateur connecté (POST /users/me/mot-de-passe). */
  async changeMotDePasse(
    donnees: { motDePasseActuel: string; nouveauMotDePasse: string },
  ): Promise<ReponseApi<{ id: string; email: string }>> {
    const reponse = await api.post('users/me/mot-de-passe', donnees, {
      schema: zEnvelope(
        z.object({ id: zUuid, email: zEmail }),
      ),
    });
    return {
      data: reponse.data as { id: string; email: string } | null,
      meta: reponse.meta as MetaApi,
    };
  },
};

export type { ProfilUtilisateur };
