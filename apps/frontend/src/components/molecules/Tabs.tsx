// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useState } from 'react';
import { PropsBase } from '../types';

interface Onglet {
  readonly id: string;
  readonly libelle: string;
}

interface TabsProps extends PropsBase {
  /** Liste des onglets. */
  readonly onglets: readonly Onglet[];
  /** ID de l'onglet activement sélectionné. */
  readonly valeur: string;
  /** Gestionnaire de changement d'onglet. */
  readonly onChange: (id: string) => void;
}

/** Onglets accessibles : roving tabindex, navigation aux flèches gauche/droite. */
export function Tabs({ onglets, valeur, onChange, className }: TabsProps): JSX.Element {
  const [indexActive, setIndexActive] = useState(onglets.findIndex((o) => o.id === valeur));

  const activerOnglet = useCallback(
    (index: number) => {
      if (index >= 0 && index < onglets.length) {
        const cible = onglets[index];
        if (cible) {
          setIndexActive(index);
          onChange(cible.id);
        }
      }
    },
    [onglets, onChange],
  );

  const handleKeydown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        activerOnglet((index + 1) % onglets.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        activerOnglet((index - 1 + onglets.length) % onglets.length);
      } else if (e.key === 'Home') {
        e.preventDefault();
        activerOnglet(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        activerOnglet(onglets.length - 1);
      }
    },
    [activerOnglet, onglets.length],
  );

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Onglets"
        style={{
          display: 'flex',
          gap: 'var(--space-xxs)',
          borderBottom: 'var(--border-width) solid var(--color-divider)',
          marginBottom: 'var(--space-m)',
        }}
      >
        {onglets.map((onglet, index) => {
          const estActif = index === indexActive;
          const controlsId = 'tabpanel-' + onglet.id;
          const tabId = 'tab-' + onglet.id;
          return (
            <button
              key={onglet.id}
              role="tab"
              aria-selected={estActif}
              aria-controls={controlsId}
              id={tabId}
              tabIndex={estActif ? 0 : -1}
              onClick={() => activerOnglet(index)}
              onKeyDown={(e) => handleKeydown(e, index)}
              style={{
                padding: 'var(--space-s) var(--space-m)',
                borderBottom: estActif
                  ? 'var(--border-width) solid var(--color-primary)'
                  : 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderRadius: '0',
                background: 'transparent',
                color: estActif ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-button)',
                fontWeight: estActif ? 600 : 400,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {onglet.libelle}
            </button>
          );
        })}
      </div>
      {onglets.map((onglet, index) => {
        const tabId = 'tab-' + onglet.id;
        const panelId = 'tabpanel-' + onglet.id;
        return (
          <div
            key={onglet.id}
            role="tabpanel"
            aria-labelledby={tabId}
            id={panelId}
            tabIndex={0}
            hidden={index !== indexActive}
            style={{ display: index === indexActive ? 'block' : 'none' }}
          />
        );
      })}
    </div>
  );
}
