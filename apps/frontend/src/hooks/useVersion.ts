// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useQuery } from '@tanstack/react-query';
import { api, type ReponseApi } from '@/lib/api';
import { zVersionResumo, type VersionCourante, type VersionResumo } from '@/stores/types';
import { versionStore } from '@/stores/versionStore';

/** Clé de cache TanStack Query pour une version. */
export const cleVersion = (id: string) => ['versions', id] as const;

/**
 * Hook de lecture d'une version de planning (TanStack Query).
 *
 * L'endpoint `GET /versions/:id` est prévu par le contrat L06 (non encore
 * livré). Le hook est écrit contre ce contrat et le test mocke `api.get`.
 *
 * Retourne la version courante, l'état de chargement, l'erreur et une
 * fonction de revalidation manuelle.
 */
export function useVersion(id?: string) {
  const { data, isLoading, error, refetch } = useQuery<ReponseApi<VersionResumo>, Error>({
    queryKey: cleVersion(id ?? ''),
    queryFn: async () => {
      if (!id) {
        throw new Error('Identifiant de version manquant');
      }
      return api.get<VersionResumo>(`/versions/${id}`, {
        schema: zVersionResumo,
      });
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const version = data?.data ?? null;

  // Synchronise le store Zustand avec le résultat de la requête.
  if (version) {
    versionStore
      .getState()
      .definirVersion(
        version.id,
        version.etat,
        version.semestreId ?? undefined,
        version.snapshotId ?? undefined,
      );
  }

  return {
    version: version as VersionCourante | null,
    estChargement: isLoading,
    erreur: error as Error | null,
    revalider: refetch,
  };
}
