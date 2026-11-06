// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useNavigate } from 'react-router-dom';
import { userStore } from '@/stores/userStore';
import { themeStore } from '@/app/theme/themeStore';

interface UtilisateurAffiche {
  prenom: string;
  nom: string;
}

/**
 * En-tête applicatif : utilisateur connecté, switch de thème Normal/Ramadan
 * et déconnexion (purge le cache TanStack Query, GG-17).
 */
export function Header(): JSX.Element {
  const { session, estAuthentifie, deconnecter } = userStore((state) => ({
    session: state.session,
    estAuthentifie: state.estAuthentifie,
    deconnecter: state.deconnecter,
  }));
  const { theme, setTheme } = themeStore((state) => ({
    theme: state.theme,
    setTheme: state.setTheme,
  }));
  const navigate = useNavigate();

  const gererDeconnexion = (): void => {
    deconnecter();
    navigate('/login', { replace: true });
  };

  return (
    <header data-testid="header">
      {estAuthentifie && session ? (
        <span data-testid="header-utilisateur" className="utilisateur">
          {(session as UtilisateurAffiche).prenom} {(session as UtilisateurAffiche).nom}
        </span>
      ) : null}
      <button
        data-testid="theme-switch"
        onClick={() => setTheme(theme === 'normal' ? 'ramadan' : 'normal')}
      >
        Passer en {theme === 'normal' ? 'Ramadan' : 'Normal'}
      </button>
      {estAuthentifie ? (
        <button data-testid="deconnexion" onClick={gererDeconnexion}>
          Déconnexion
        </button>
      ) : null}
    </header>
  );
}
