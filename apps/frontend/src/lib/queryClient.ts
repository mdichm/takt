// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { QueryClient } from '@tanstack/react-query';

/**
 * Client de requête partagé par l'application.
 *
 * - retry : 3 tentatives avec backoff exponentiel (1s, 2s, 4s)
 * - staleTime : 5 min (les données sont considérées fraîches)
 * - gcTime : 10 min avant purge du cache inactif
 *
 * Instancié une fois dans main.tsx et injecté aux stores via
 * userStore.configurerQueryClient / versionStore.configurerQueryClient.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (index) => Math.min(1000 * 2 ** index, 4000),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});
