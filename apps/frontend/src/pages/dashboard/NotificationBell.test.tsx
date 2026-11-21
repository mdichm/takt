// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { NotificationBell } from './NotificationBell';
import { dashboardNotificationStore } from './dashboardNotificationStore';
import type { EvenementNotification } from '@/app/useCanalEvenements';

const notification: EvenementNotification = {
  type: 'notification',
  notificationId: 'n-1',
  titre: 'Nouvelle notification',
  message: 'Un message de test',
};

describe('NotificationBell', () => {
  beforeEach(() => {
    dashboardNotificationStore.setState({ notifications: [] });
  });

  afterEach(() => {
    dashboardNotificationStore.setState({ notifications: [] });
  });

  it('affiche un badge à 0 quand aucune notification', () => {
    render(<NotificationBell aria-label="Notifications" />);
    expect(screen.getByRole('button', { name: /Notifications/i })).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('affiche le compteur quand des notifications sont présentes', () => {
    dashboardNotificationStore.getState().ajouter(notification);
    render(<NotificationBell aria-label="Notifications" />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Notifications/i })).toHaveAttribute('aria-expanded', 'true');
  });

  it('met à jour le compteur après ajout', () => {
    render(<NotificationBell aria-label="Notifications" />);
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    act(() => {
      dashboardNotificationStore.getState().ajouter(notification);
    });
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
