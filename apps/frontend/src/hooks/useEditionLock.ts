// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

const RENOUVELLEMENT_MS = 5 * 60 * 1000; // 5 min

interface EtatBail {
  acquis: boolean;
  detenteur?: string;
  erreur423?: boolean;
  messageErreur?: string;
}

/**
 * Hook de gestion du bail d'édition (verrou de séance/version).
 *
 * - Acquisition : POST /versions/:id/bail (contrat L06-07, non livré → mocké en test)
 * - Renouvellement périodique toutes les 5 min tant que le composant est monté
 * - Libération : DELETE /versions/:id/bail au démontage ou appel explicite
 * - 423 : le bail est détenu par un autre utilisateur, son nom est exposé
 *
 * Le test utilise vi.useFakeTimers pour piloter le renouvellement.
 */
export function useEditionLock(versionId?: string) {
  const [etat, setEtat] = useState<EtatBail>({ acquis: false });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const liberer = useCallback(async () => {
    if (!versionId) return;
    try {
      await api.del(`/versions/${versionId}/bail`);
    } catch {
      // Ignore les erreurs de libération : le bail peut déjà être expiré.
    }
    setEtat({ acquis: false, erreur423: false });
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [versionId]);

  const acquerir = useCallback(async () => {
    if (!versionId) {
      setEtat({ acquis: false, erreur423: false });
      return;
    }
    try {
      const reponse = await api.post(`/versions/${versionId}/bail`, undefined);
      if (reponse.data) {
        setEtat({ acquis: true, erreur423: false });
        demarrerRenouvellement(versionId);
      }
    } catch (erreur: unknown) {
      const err = erreur as {
        statut?: number;
        code?: string;
        details?: { detenteur?: string };
        message?: string;
      };
      if (err?.statut === 423 || err?.code === 'SEANCE_LOCKED') {
        setEtat({
          acquis: false,
          erreur423: true,
          messageErreur: err?.details?.detenteur ?? 'Cette séance est verrouillée par un autre utilisateur.',
          ...(err?.details?.detenteur !== undefined
            ? { detenteur: err.details.detenteur }
            : {}),
        });
      } else {
        setEtat({ acquis: false, erreur423: false, messageErreur: String(err?.message ?? 'Erreur lors de l’acquisition du bail.') });
      }
    }
  }, [versionId]);

  const demarrerRenouvellement = useCallback((id: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(async () => {
      try {
        await api.post(`/versions/${id}/bail/renouveler`, undefined);
      } catch {
        // Échec de renouvellement : on relâche le bail.
        await liberer();
      }
    }, RENOUVELLEMENT_MS);
  }, [liberer]);

  useEffect(() => {
    if (!versionId) {
      liberer();
      return;
    }
    acquerir();
    return () => {
      liberer();
    };
  }, [versionId, acquerir, liberer]);

  return {
    ...etat,
    acquerir,
    liberer,
    estVerrouilleParAutre: etat.erreur423 && !!etat.detenteur,
  };
}