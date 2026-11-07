// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userStore } from '@/stores/userStore';

interface Props {
  children: React.ReactNode;
}

/**
 * GuestGuard : utilisé sur /login. Redirige vers /dashboard si l utilisateur
 * est déjà authentifié (empêche d afficher la connexion à une session ouverte).
 */
export function GuestGuard({ children }: Props): JSX.Element | null {
  const estAuthentifie = userStore((state) => state.estAuthentifie);
  const navigate = useNavigate();

  useEffect(() => {
    if (estAuthentifie) {
      navigate('/dashboard', { replace: true });
    }
  }, [estAuthentifie, navigate]);

  if (estAuthentifie) {
    return null;
  }
  return <>{children}</>;
}
