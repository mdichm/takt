// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { userStore } from '@/stores/userStore';
import { Bouton } from '@/components/atoms/Bouton';
import { EtatChargement } from '@/components/molecules/EtatChargement';
import { EtatErreur } from '@/components/molecules/EtatErreur';
import { DICTIONNAIRE_FR } from '@/i18n/fr';
import { useProfil } from './useProfil';
import { ThemeSelector } from './ThemeSelector';
import { PreferencesNotifications } from './PreferencesNotifications';
import { ChangementMotDePasse } from './ChangementMotDePasse';
import { ProfilFormulaire } from './ProfilFormulaire';
import type { OptionDepartement } from './profil.types';

const DICT = (DICTIONNAIRE_FR.profil as unknown) as Record<string, string>;

function t(cle: string): string {
  return DICT[cle] ?? cle;
}

const DEPARTEMENTS_DEMO: readonly OptionDepartement[] = [
  { valeur: 'dep-math-info', libelle: 'Mathématiques-Informatique' },
  { valeur: 'dep-physique', libelle: 'Physique' },
  { valeur: 'dep-langues', libelle: 'Langues et cultures' },
  { valeur: 'dep-droit', libelle: 'Droit' },
  { valeur: 'dep-medecine', libelle: 'Médecine' },
];

export default function ProfilePage(): JSX.Element {
  const navigate = useNavigate();
  const { session } = userStore((state) => ({
    session: state.session,
  }));

  const { profil, estChargement, erreur, recharger } = useProfil();

  const optionsDepartement = useMemo(() => DEPARTEMENTS_DEMO, []);

  const gererDeconnexion = useCallback((): void => {
    userStore.getState().deconnecter();
    navigate('/login');
  }, [navigate]);

  if (estChargement) {
    return <EtatChargement libelle={t('chargement')} />;
  }

  if (erreur) {
    return (
      <EtatErreur
        message={t('erreurChargement')}
        onReessayer={recharger}
      />
    );
  }

  if (!profil) {
    return <EtatErreur message={t('profilIntrouvable')} />;
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-l)', padding: 'var(--space-l)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-m)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', margin: 0, color: 'var(--color-text-primary)' }}>
            {t('titre')}
          </h1>
          <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-secondary)', margin: 'var(--space-xxs) 0 0 0' }}>
            {t('sousTitre')}
          </p>
        </div>
        <Bouton
          libelle={t('bouton.deconnexion')}
          variante="danger"
          taille="petite"
          onClick={gererDeconnexion}
        />
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-l)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-l)' }}>
          <ProfilFormulaire
            profil={profil}
            optionsDepartement={optionsDepartement}
          />
          <ChangementMotDePasse />
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-l)' }}>
          <ThemeSelector />
          <PreferencesNotifications />
        </aside>
      </section>

      <footer
        style={
          {
            marginTop: 'var(--space-m)',
            paddingTop: 'var(--space-s)',
            borderTop: `var(--border-width) solid var(--color-border)`,
            fontSize: 'var(--font-size-caption)',
            color: 'var(--color-text-secondary)',
          }
        }
      >
        {t('role')} {session?.email}
      </footer>
    </main>
  );
}
