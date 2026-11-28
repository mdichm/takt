// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Préférences de notification de l'utilisateur.
 *
 * Dans le lot L09 (EC-COM-03), ces préférences sont persistées côté client
 * (localStorage) uniquement. La persistance serveur (colonnes
 * `notificationsEmail` / `notificationsInApp` sur `Utilisateur`) est prévue
 * au lot L10 (TAKT-L10-05) avec le moteur de notifications e-mail.
 */
export interface PreferencesNotifications {
  notificationsEmail: boolean;
  notificationsInApp: boolean;
}

interface PreferencesState extends PreferencesNotifications {
  setPreferences: (preferences: Partial<PreferencesNotifications>) => void;
  reinitialiser: () => void;
}

const PREFERENCES_DEFAUT: PreferencesNotifications = {
  notificationsEmail: true,
  notificationsInApp: true,
};

/**
 * Store des préférences de notification.
 * Persisté dans localStorage sous la clé `takt-preferences`.
 */
export const preferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...PREFERENCES_DEFAUT,
      setPreferences: (modifications) =>
        set((etat) => ({ ...etat, ...modifications })),
      reinitialiser: () => set(PREFERENCES_DEFAUT),
    }),
    {
      name: 'takt-preferences',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
