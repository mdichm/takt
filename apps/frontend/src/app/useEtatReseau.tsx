// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

/** Etat de connectivite reseau de l application. */
export interface EtatReseau {
  estEnLigne: boolean;
}

const ReseauContext = createContext<EtatReseau>({ estEnLigne: true });

/** Hook permettant de lire l etat reseau dans les composants enfants. */
export function useEtatReseau(): EtatReseau {
  return useContext(ReseauContext);
}

/**
 * Fournisseur de l etat reseau.
 *
 * - Valeur initiale issue de navigator.onLine
 * - Abonne aux evenements window online / offline
 * - Desabonne au demontage
 * - Fonctionne meme si navigator est indisponible (mode test/SSR)
 */
export function EtatReseauProvider({ children }: { children: ReactNode }): JSX.Element {
  const [estEnLigne, setEstEnLigne] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  const gererOnline = useCallback(() => setEstEnLigne(true), []);
  const gererOffline = useCallback(() => setEstEnLigne(false), []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) {
      return;
    }
    window.addEventListener('online', gererOnline);
    window.addEventListener('offline', gererOffline);
    return () => {
      window.removeEventListener('online', gererOnline);
      window.removeEventListener('offline', gererOffline);
    };
  }, [gererOnline, gererOffline]);

  return (
    <ReseauContext.Provider value={{ estEnLigne }}>
      {children}
    </ReseauContext.Provider>
  );
}

export { ReseauContext };
export default ReseauContext;
