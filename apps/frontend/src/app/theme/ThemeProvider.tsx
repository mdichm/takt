// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect } from 'react';
import { themeStore } from './themeStore';

/**
 * Applique le thème sélectionné sur l élément racine via l attribut
 * data-theme. Les couleurs proviennent exclusivement des fichiers de jetons
 * design-tokens (tokens-normal.css / tokens-ramadan.css, chargés dans
 * styles.css) : 0 couleur en dur (GG-01). Le switch est instantané, sans
 * rechargement, et persistant (localStorage takt-theme).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const theme = themeStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return <>{children}</>;
}
