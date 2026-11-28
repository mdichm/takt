// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Icone } from '@/components/atoms/Icone';
import { PropsBase } from '@/components/types';
import { dashboardNotificationStore } from './dashboardNotificationStore';

interface NotificationBellProps extends PropsBase {
  /** Libellé d’accessibilité pour la cloche. */
  readonly ariaLabel?: string;
}

/** Cloche de notifications avec badge de compteur (SSE branché). */
export function NotificationBell({
  ariaLabel = 'Notifications',
  className,
}: NotificationBellProps): JSX.Element {
  const compteur = dashboardNotificationStore((state) => state.compteur());
  const notifications = dashboardNotificationStore((state) => state.notifications);

  const dernier = notifications[notifications.length - 1];

  return (
    <button
      aria-label={ariaLabel}
      aria-expanded={compteur > 0}
      aria-haspopup="listbox"
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'var(--input-height)',
        height: 'var(--input-height)',
        border: 'none',
        borderRadius: 'var(--radius-lg)',
        background: 'transparent',
        color: 'var(--color-text-primary)',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <Icone nom="alerte" taille={20} aria-label="Icône de notifications" />
      {compteur > 0 && (
        <span
          role="status"
          aria-label={`${compteur} notification${compteur > 1 ? 's' : ''} non lue${compteur > 1 ? 's' : ''}`}
          style={{
            position: 'absolute',
            top: 'var(--space-xxs)',
            right: 'var(--space-xxs)',
            minWidth: 'var(--space-xs)',
            minHeight: 'var(--space-xs)',
            padding: `0 var(--space-xxs)`,
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-error)',
            color: 'var(--color-surface)',
            fontSize: 'var(--font-size-caption)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          {compteur}
        </span>
      )}
      {dernier && (
        <span style={{ position: 'absolute', top: '-4px', right: '-4px' }} />
      )}
    </button>
  );
}
