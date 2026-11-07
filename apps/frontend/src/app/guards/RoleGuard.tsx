// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userStore } from '@/stores/userStore';
import { REDIRECTION_PAR_DEFAUT } from '../routes';
import type { RoleCode } from '@takt/contracts';

interface Props {
  roles: RoleCode[];
  children: React.ReactNode;
}

/**
 * RoleGuard : vérifie que le rôle de l utilisateur figure parmi les rôles
 * autorisés. Sinon, redirige vers l écran par défaut de son rôle.
 */
export function RoleGuard({ roles, children }: Props): JSX.Element | null {
  const { session, estAuthentifie } = userStore((state) => ({
    session: state.session,
    estAuthentifie: state.estAuthentifie,
  }));
  const navigate = useNavigate();

  useEffect(() => {
    if (!estAuthentifie || !session) {
      return;
    }
    if (!roles.includes(session.role)) {
      navigate(REDIRECTION_PAR_DEFAUT[session.role], { replace: true });
    }
  }, [session, estAuthentifie, roles, navigate]);

  if (!estAuthentifie || !session) {
    return null;
  }
  return roles.includes(session.role) ? <>{children}</> : null;
}
