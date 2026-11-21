// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Checkbox } from '@/components/atoms/Checkbox';
import { Alerte } from '@/components/atoms/Alerte';
import { themeStore } from '@/app/theme/themeStore';
import { traduction } from '@/i18n/fr';

const DICT = (traduction('profil') as unknown) as Record<string, string>;

function t(cle: string): string {
  return DICT[cle] ?? cle;
}

/**
 * Sélecteur de thème Normal / Ramadan.
 * Le choix est persistant dans localStorage via `themeStore` (clé `takt-theme`)
 * et s'applique immédiatement par `ThemeProvider`.
 */
export function ThemeSelector(): JSX.Element {
  const theme = themeStore((state) => state.theme);
  const setTheme = themeStore((state) => state.setTheme);

  const dictAlerte = (traduction('alerte') as unknown) as Record<string, string>;

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-s)',
        padding: 'var(--space-m)',
        border: `var(--border-width) solid var(--color-border)`,
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-surface)',
      }}
    >
      <h3
        style={{
          fontSize: 'var(--font-size-h3)',
          margin: 0,
          color: 'var(--color-text-primary)',
        }}
      >
        {t('theme.titre')}
      </h3>
      <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', margin: 0 }}>
        {t('theme.description')}
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-m)', alignItems: 'center' }}>
        <Checkbox
          id="theme-normal"
          label={t('theme.normal')}
          checked={theme === 'normal'}
          onChange={() => setTheme('normal')}
        />
        <Checkbox
          id="theme-ramadan"
          label={t('theme.ramadan')}
          checked={theme === 'ramadan'}
          onChange={() => setTheme('ramadan')}
        />
      </div>
      {theme === 'ramadan' && (
        <Alerte variante="info" titre={dictAlerte.information} message={t('theme.ramadanActive')} />
      )}
    </section>
  );
}
