// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { create } from 'zustand';
import type { EvenementNotification } from '@/app/useCanalEvenements';

interface DashboardNotificationState {
  notifications: EvenementNotification[];
  ajouter: (notification: EvenementNotification) => void;
  vider: () => void;
  compteur: () => number;
}

export const dashboardNotificationStore = create<DashboardNotificationState>((set, get) => ({
  notifications: [],

  ajouter: (notification) =>
    set((etat) => ({
      notifications: [...etat.notifications, notification],
    })),

  vider: () => set({ notifications: [] }),

  compteur: () => get().notifications.length,
}));
