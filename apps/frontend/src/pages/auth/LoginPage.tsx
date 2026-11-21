// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormulaireConnexion } from './FormulaireConnexion';
import { TitreApplication } from '@/components/atoms/TitreApplication';
import { api } from '@/lib/api';
import { zReponseLogin, type ReponseLogin } from '@/lib/validation';
import { userStore } from '@/stores/userStore';
import { construireSession, type UtilisateurLogin } from '@/stores/types';
import { REDIRECTION_PAR_DEFAUT } from '@/app/routes';

/**
 * Page EC-COM-01 : Connexion / Login.
 *
 * Header minimal (logo TAKT), formulaire centré, pied de page (version +
 * mention RGPD). Hors Layout (pas de sidebar, pas de header applicatif).
 *
 * Flux : POST /auth/login → définit la session (jeton en mémoire, GG-17) →
 * redirection vers l'écran par défaut du rôle.
 * 401 → « Identifiants incorrects. » (sans énumération de compte).
 * 429 → « Trop de tentatives, réessayez plus tard. »
 */
export function LoginPage(): JSX.Element {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const navigate = useNavigate();

  const surConnexion = async (donnees: { email: string; motDePasse: string }) => {
    setErreur(null);
    setChargement(true);
    try {
      const reponse = await api.post<ReponseLogin>('/auth/login', donnees, {
        schema: zReponseLogin,
        sansRefresh: true,
      });
      const payload = reponse?.data;
      if (!payload) {
        setErreur('Une erreur est survenue lors de la connexion.');
        return;
      }
      const { data: contenu } = payload;
      if (!contenu) {
        setErreur('Une erreur est survenue lors de la connexion.');
        return;
      }
      const { accessToken, utilisateur } = contenu;
      const session = construireSession(utilisateur as UtilisateurLogin);
      userStore.getState().definirSession(session, accessToken);
      navigate(REDIRECTION_PAR_DEFAUT[session.role], { replace: true });
    } catch (err) {
      if (err instanceof Error && 'statut' in err) {
        const statut = (err as { statut: number }).statut;
        if (statut === 401) {
          setErreur('Identifiants incorrects.');
          return;
        }
        if (statut === 429) {
          setErreur('Trop de tentatives, réessayez plus tard.');
          return;
        }
      }
      setErreur('Une erreur est survenue lors de la connexion.');
    } finally {
      setChargement(false);
    }
  };

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header
        style={{
          padding: 'var(--space-m)',
          borderBottom: 'var(--border-width) solid var(--color-border)',
        }}
      >
        <TitreApplication />
        <a
          href="#"
          style={{
            fontSize: 'var(--font-size-caption)',
            color: 'var(--color-primary)',
            textDecoration: 'underline',
          }}
        >
          Mot de passe oublié ?
        </a>
      </header>
      <section
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-m)',
        }}
      >
        <FormulaireConnexion
          chargement={chargement}
          erreur={erreur ?? undefined}
          surConnexion={surConnexion}
        />
      </section>
      <footer
        style={{
          padding: 'var(--space-s)',
          borderTop: 'var(--border-width) solid var(--color-border)',
          fontSize: 'var(--font-size-caption)',
          color: 'var(--color-text-secondary)',
          textAlign: 'center',
        }}
      >
        TAKT v0.1 &nbsp;|&nbsp;
        <a
          href="#"
          style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
        >
          Mentions RGPD
        </a>
      </footer>
    </main>
  );
}
