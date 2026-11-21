// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { zVersionListe, type VersionListe } from '@takt/contracts';
import type { FiltresVersions, ResultatVersions } from './dashboard.types';

/** Clé de cache TanStack Query pour les versions du tableau de bord. */
export const cleVersionsDashboard = (filtres: FiltresVersions) =>
  ['versions', 'dashboard', filtres.etat ?? null, filtres.departementId ?? null, filtres.page, filtres.pageSize] as const;

/**
 * Hook de lecture des versions pour le tableau de bord (EC-COM-02).
 *
 * Consomme `GET /api/v1/versions` avec les filtres état + département +
 * pagination. La réponse est validée par le schéma partagé `zVersionListe`
 * (GG-05). Le rafraîchissement automatique est configurable (30 s / 60 s /
 * 5 min) via l’option `delaiRafraichissementSecondes`.
 */
export function useDashboardVersions(filtres: FiltresVersions, delaiRafraichissementSecondes = 30) {
  const { data, isLoading, error, refetch } = useQuery<VersionListe, Error>({
    queryKey: cleVersionsDashboard(filtres),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(filtres.page));
      params.set('pageSize', String(filtres.pageSize));
      if (filtres.etat) {
        params.set('etat', filtres.etat);
      }
      if (filtres.departementId) {
        params.set('departementId', filtres.departementId);
      }
      const reponse = await api.get<VersionListe>(
        `/versions?${params.toString()}`,
        { schema: zVersionListe },
      );
      if (!reponse.data) {
        throw new Error('Aucune donnée retournée par l’API des versions.');
      }
      return reponse.data;
    },
    enabled: true,
    staleTime: 0,
    refetchInterval: delaiRafraichissementSecondes * 1000,
  });

  const resultat: ResultatVersions = {
    items: data?.items ?? [],
    meta: data?.meta ?? { page: filtres.page, pageSize: filtres.pageSize, total: 0 },
  };

  return {
    versions: resultat.items,
    total: resultat.meta.total,
    page: resultat.meta.page,
    pageSize: resultat.meta.pageSize,
    estChargement: isLoading,
    erreur: error ?? null,
    revalider: refetch,
  };
}
