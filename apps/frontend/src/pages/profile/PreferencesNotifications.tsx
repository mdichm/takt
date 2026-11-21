// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Checkbox } from '@/components/atoms/Checkbox';
import { preferencesStore } from '@/stores/preferencesStore';
import { traduction } from '@/i18n/fr';

const DICT = (traduction('profil') as unknown) as Record<string, string>;

function t(cle: string): string {
  return DICT[cle] ?? cle;
}

/**
 * Préférences de notification (e-mail / in-app).
 *
 * Persistées côté client dans `preferencesStore` (localStorage, clé
 * `takt-preferences`) jusqu'à la persistance serveur prévue au lot L10.
 */
export function PreferencesNotifications(): JSX.Element {
  const notificationsEmail = preferencesStore(
    (state) => state.notificationsEmail,
  );
  const notificationsInApp = preferencesStore(
    (state) => state.notificationsInApp,
  );
  const setPreferences = preferencesStore((state) => state.setPreferences);

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
        {t('preferences.titre')}
      </h3>
      <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', margin: 0 }}>
        {t('preferences.description')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
        <Checkbox
          id="pref-notifications-email"
          label={t('preferences.email')}
          checked={notificationsEmail}
          onChange={(checked) => setPreferences({ notificationsEmail: checked })}
        />
        <Checkbox
          id="pref-notifications-in-app"
          label={t('preferences.inApp')}
          checked={notificationsInApp}
          onChange={(checked) => setPreferences({ notificationsInApp: checked })}
        />
      </div>
      <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', margin: 0 }}>
        {t('preferences.notePersistance')}
      </p>
    </section>
  );
}
