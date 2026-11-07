// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userStore } from '@/stores/userStore';

interface Props {
  children: React.ReactNode;
}

/**
 * DepartmentGuard (RB-UI-01) : vérifie que l utilisateur dispose d un
 * périmètre département (rdep). Sans périmètre, l accès est refusé.
 */
export function DepartmentGuard({ children }: Props): JSX.Element | null {
  const { session, estAuthentifie } = userStore((state) => ({
    session: state.session,
    estAuthentifie: state.estAuthentifie,
  }));
  const navigate = useNavigate();

  useEffect(() => {
    if (!estAuthentifie || !session) {
      return;
    }
    if (session.departementIds.length === 0) {
      navigate('/login', { replace: true });
    }
  }, [session, estAuthentifie, navigate]);

  if (!estAuthentifie || !session || session.departementIds.length === 0) {
    return null;
  }
  return <>{children}</>;
}
