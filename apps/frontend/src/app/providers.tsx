// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { userStore } from '@/stores/userStore';
import { ThemeProvider } from './theme/ThemeProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { EtatReseauProvider } from './useEtatReseau';
import { CanalEvenementsProvider } from './useCanalEvenements';
import { AlerteGlobale } from '@/components/molecules/AlerteGlobale';
import type { EvenementNotification } from './useCanalEvenements';

/** Fonction de navigation vers une URL, definie par le routeur racine. */
let naviguerVers: ((url: string) => void) | null = null;

/**
 * Enregistre la fonction de navigation du routeur pour les redirections globales (401).
 */
export function configurerNavigation(handler: (url: string) => void): void {
  naviguerVers = handler;
}

/** Gestionnaire de purge de session, defini par AppProviders et appele par le client API en cas de 401. */
let purgerSessionGlobale: (() => void) | null = null;

/**
 * Permet au client API de declencher la purge globale (deconnexion + redirection)
 * quand une réponse 401 definitive est reçue.
 */
export function configurerPurgerSessionGlobale(handler: () => void): void {
  purgerSessionGlobale = handler;
}

/**
 * Declenche la purge de session (utile pour les tests et pour le client API).
 */
export function declencherPurgeSessionGlobale(): void {
  purgerSessionGlobale?.();
}

interface AppProvidersProps {
  readonly children: ReactNode;
}

/**
 * Fournisseurs applicatifs racines.
 *
 * Compose :
 * - QueryClientProvider (cache TanStack Query)
 * - ThemeProvider (theme Normal / Ramadan)
 * - ErrorBoundary (limite d'erreur, pas de stack trace, GG-06)
 * - EtatReseauProvider (connectivite online/offline)
 * - CanalEvenementsProvider (SSE, token dans query param uniquement, GG-17)
 * - AlerteGlobale (toasts de notification issus du SSE)
 *
 * Configure egalement le gestionnaire global de 401 expose au client API.
 */
export function AppProviders({ children }: AppProvidersProps): JSX.Element {
  const purgeInProgress = useRef(false);
  const [notificationsGlobales, setNotificationsGlobales] = useState<EvenementNotification[]>([]);

  const purgerEtRediriger = useCallback((): void => {
    if (purgeInProgress.current) {
      return; // Idempotent : evite plusieurs redirections simultanees
    }
    purgeInProgress.current = true;

    // 1. Purge le store utilisateur et le cache TanStack Query (GG-17)
    userStore.getState().deconnecter();
    queryClient.clear();

    // 2. Vide les notifications en attente
    setNotificationsGlobales([]);

    // 3. Redirection vers la connexion via le routeur (si enregistre)
    naviguerVers?.('/login');
  }, []);

  // Expose le gestionnaire au client API (appelable depuis api.ts, hors React)
  useEffect(() => {
    configurerPurgerSessionGlobale(purgerEtRediriger);
    return () => {
      configurerPurgerSessionGlobale(() => {});
    };
  }, [purgerEtRediriger]);

  const estAuthentifie = userStore.getState().estAuthentifie;
  const jeton = userStore.getState().jetonAcces;

  const gererNotification = useCallback(
    (notification: EvenementNotification): void => {
      setNotificationsGlobales((precedents) => [...precedents, notification]);
    },
    [],
  );

  const gererFermerAlerte = useCallback(
    (notificationId: string): void => {
      setNotificationsGlobales((precedents) =>
        precedents.filter((n) => n.notificationId !== notificationId),
      );
    },
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <EtatReseauProvider>
            <CanalEvenementsProvider
              actif={estAuthentifie && !!jeton}
              jeton={jeton}
              onNotification={gererNotification}
            >
              {notificationsGlobales.length > 0 && (
                <AlerteGlobale
                  notifications={notificationsGlobales}
                  onFermer={gererFermerAlerte}
                />
              )}
              {children}
            </CanalEvenementsProvider>
          </EtatReseauProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default AppProviders;
