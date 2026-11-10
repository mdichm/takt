// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type ThemeNom = 'normal' | 'ramadan';

interface ThemeState {
  theme: ThemeNom;
  setTheme: (theme: ThemeNom) => void;
}

export const themeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'normal',
      setTheme: (theme: ThemeNom) => set({ theme }),
    }),
    {
      name: 'takt-theme',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
