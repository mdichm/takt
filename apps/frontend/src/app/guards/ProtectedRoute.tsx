// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userStore } from '@/stores/userStore';
import { REDIRECTION_PAR_DEFAUT } from '../routes';

interface Props {
  roles: string[];
  departement?: boolean;
  children: React.ReactNode;
}

/**
 * Garde composé AuthGuard + RoleGuard + DepartmentGuard (RB-UI-01).
 *
 * - Utilisateur non authentifié → redirection /login (EC-COM-01).
 * - Rôle non autorisé pour la route → redirection vers l écran par défaut du rôle.
 * - Portée département requise mais absente (rdep sans périmètre) → /login.
 */
export function ProtectedRoute({ roles, departement = false, children }: Props): JSX.Element | null {
  const { session, estAuthentifie } = userStore((state) => ({
    session: state.session,
    estAuthentifie: state.estAuthentifie,
  }));
  const navigate = useNavigate();

  useEffect(() => {
    if (!estAuthentifie || !session) {
      navigate('/login', { replace: true });
      return;
    }
    if (!roles.includes(session.role)) {
      navigate(REDIRECTION_PAR_DEFAUT[session.role], { replace: true });
      return;
    }
    if (departement && session.departementIds.length === 0) {
      navigate('/login', { replace: true });
      return;
    }
  }, [session, estAuthentifie, roles, departement, navigate]);

  if (!estAuthentifie || !session) {
    return null;
  }
  if (!roles.includes(session.role)) {
    return null;
  }
  if (departement && session.departementIds.length === 0) {
    return null;
  }
  return <>{children}</>;
}
