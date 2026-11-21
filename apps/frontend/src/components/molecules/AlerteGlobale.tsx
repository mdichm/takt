// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback } from 'react';
import { Alerte } from '@/components/atoms/Alerte';
import type { EvenementNotification } from '@/app/useCanalEvenements';

interface AlerteGlobaleProps {
  /** Notifications a afficher (toasts). */
  readonly notifications: readonly EvenementNotification[];
  /** Gestionnaire de fermeture d une notification. */
  readonly onFermer: (notificationId: string) => void;
  /** Nombre maximal de toasts visibles. */
  readonly maxVisible?: number;
}

/**
 * Pile de toasts accessibles pilotee par le canal SSE.
 *
 * - Chaque toast utilise l atome Alerte (role="alert", couleur via jeton)
 * * - Les notifications sont identifiables par notificationId
 * - Fermable individuellement
 * - Nombre borne pour eviter l accumulation illimitee
 */
export function AlerteGlobale({
  notifications,
  onFermer,
  maxVisible = 5,
}: AlerteGlobaleProps): JSX.Element | null {
  const visibles = notifications.slice(0, maxVisible);

  const gererFermer = useCallback(
    (notificationId: string): void => {
      onFermer(notificationId);
    },
    [onFermer],
  );

  if (visibles.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="alerte-globale"
      role="region"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        top: 'var(--space-m)',
        right: 'var(--space-m)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-s)',
        zIndex: 999,
      }}
    >
      {visibles.map((notification) => (
        <div
          key={notification.notificationId}
          data-testid={`alerte-toast-${notification.notificationId}`}
        >
          <Alerte
            variante="info"
            titre={notification.titre}
            message={notification.message}
            fermable
            onFermer={() => gererFermer(notification.notificationId)}
          />
        </div>
      ))}
    </div>
  );
}

export default AlerteGlobale;
