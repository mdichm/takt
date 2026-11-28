// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useQuery } from '@tanstack/react-query';
import { profilApi } from './profil.api';
import type { ProfilUtilisateur } from '@takt/contracts';

/** Clé de cache TanStack Query pour le profil utilisateur. */
export const cleProfil = ['profil', 'me'];

/**
 * Hook de lecture du profil de l'utilisateur connecté (GET /users/me).
 * Retourne les données du profil, l'état de chargement et l'éventuelle erreur.
 */
export function useProfil() {
  const { data, isLoading, error, refetch } = useQuery<ProfilUtilisateur | null, Error>({
    queryKey: cleProfil,
    queryFn: async () => {
      const reponse = await profilApi.getProfil();
      return reponse.data ?? null;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

  return {
    profil: data ?? null,
    estChargement: isLoading,
    erreur: error ?? null,
    recharger: refetch,
  };
}
