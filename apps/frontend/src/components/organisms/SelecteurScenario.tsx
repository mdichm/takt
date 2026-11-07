// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Badge } from '../atoms/Badge';

interface Scenario {
  readonly id: string;
  readonly nom: string;
  readonly description: string;
  readonly score: number; // 0-100
  readonly conflits: number;
  readonly selected?: boolean;
}

interface SelecteurScenarioProps {
  readonly scenarios: readonly Scenario[];
  readonly onSelect: (id: string) => void;
  readonly chargement?: boolean;
}

const LIBELLE_SCORE = (score: number): string => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Bon';
  if (score >= 40) return 'Moyen';
  return 'Faible';
};

const VARIANTE_SCORE = (score: number): 'succès' | 'attention' | 'erreur' => {
  if (score >= 80) return 'succès';
  if (score >= 60) return 'attention';
  return 'erreur';
};

/** Sélecteur de scénarios : cartes comparatives avec score et nombre de conflits. */
export function SelecteurScenario({ scenarios, onSelect, chargement = false }: SelecteurScenarioProps): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-m)' }}>
        {scenarios.map((s) => {
          const estSelectionne = !!s.selected;
          return (
            <div
              key={s.id}
              role="radio"
              aria-checked={estSelectionne}
              aria-label={`Scénario ${s.nom}, score ${s.score}, ${s.conflits} conflit${s.conflits > 1 ? 's' : ''}`}
              tabIndex={estSelectionne ? 0 : -1}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-s)',
                padding: 'var(--space-m)',
                border: `var(--border-width) solid ${estSelectionne ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-lg)',
                background: estSelectionne ? 'var(--color-surface-variant)' : 'var(--color-surface)',
                cursor: chargement ? 'not-allowed' : 'pointer',
                outline: 'none',
              }}
              onClick={() => !chargement && onSelect(s.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 'var(--font-size-body)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.nom}</span>
                <Badge variante={VARIANTE_SCORE(s.score)} libelle={LIBELLE_SCORE(s.score)} />
              </div>
              <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-body)' }}>{s.description}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>{s.conflits} conflit{s.conflits > 1 ? 's' : ''}</span>
                <span style={{ fontSize: 'var(--font-size-body)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.score} / 100</span>
              </div>
            </div>
          );
        })}
      </div>
      {chargement && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', padding: 'var(--space-s)' }}>
          <span style={{ width: '16px', height: '16px', border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
          <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>Chargement des scénarios…</span>
        </div>
      )}
    </div>
  );
}