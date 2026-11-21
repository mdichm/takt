// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { zEvenementApplicatif } from '@takt/contracts';

/** Evenement de notification extrait du flux SSE. */
export interface EvenementNotification {
  type: 'notification';
  notificationId: string;
  titre: string;
  message: string;
}

/** Etat du canal SSE expose aux composants. */
export interface CanalEvenements {
  notifications: EvenementNotification[];
  fermer: () => void;
}

interface CanalEvenementsContextValue {
  notifications: EvenementNotification[];
  fermer: () => void;
}

const CanalEvenementsContext = createContext<CanalEvenementsContextValue | null>(null);

/**
 * Hook permettant de lire le canal SSE dans les composants enfants.
 */
export function useCanalEvenements(): CanalEvenements {
  const contexte = useContext(CanalEvenementsContext);
  if (!contexte) {
    throw new Error('useCanalEvenements doit etre utilise dans un CanalEvenementsProvider');
  }
  return contexte;
}

interface CanalEvenementsProviderProps {
  actif: boolean;
  jeton: string | null;
  onNotification: (notification: EvenementNotification) => void;
  children: ReactNode;
}

/**
 * Fournisseur du canal SSE.
 *
 * - Ouvre EventSource vers GET /api/v1/events?access_token=<jeton>
 * - Valide chaque message avec zEvenementApplicatif
 * - Ignore les heartbeats et payloads invalides
 * - Ne se connecte pas sans jeton ni session active
 * - Ferme la connexion au demontage ou quand la session devient inactive
 */
export function CanalEvenementsProvider({
  actif,
  jeton,
  onNotification,
  children,
}: CanalEvenementsProviderProps): JSX.Element {
  const [notifications, setNotifications] = useState<EvenementNotification[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const ajouterNotification = useCallback(
    (notification: EvenementNotification): void => {
      setNotifications((precedents) => [...precedents, notification]);
      onNotification(notification);
    },
    [onNotification],
  );

  const fermer = useCallback((): void => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!actif || !jeton || typeof EventSource === 'undefined') {
      fermer();
      return;
    }

    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/events?access_token=${encodeURIComponent(jeton)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event: MessageEvent): void => {
      try {
        const donnees = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const valide = zEvenementApplicatif.safeParse(donnees);
        if (!valide.success) {
          return;
        }
        const evenement = valide.data;
        if (evenement.type === 'notification') {
          const notification: EvenementNotification = {
            type: 'notification',
            notificationId: evenement.notificationId,
            titre: evenement.titre,
            message: evenement.message,
          };
          ajouterNotification(notification);
        }
      } catch {
        // Payload invalide : ignore silencieusement (pas de crash)
      }
    };

    es.onerror = (): void => {
      es.close();
      eventSourceRef.current = null;
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [actif, jeton, ajouterNotification, fermer]);

  return (
    <CanalEvenementsContext.Provider value={{ notifications, fermer }}>
      {children}
    </CanalEvenementsContext.Provider>
  );
}

export default CanalEvenementsProvider;
