// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Badge } from '@/components/atoms/Badge';
import { Icone } from '@/components/atoms/Icone';
import { PropsBase } from '@/components/types';
import { type IndicateurVersion } from './dashboard.types';

interface VersionStatusWidgetProps extends PropsBase {
  /** Indicateurs par état (ex: [{ etat: 'publie', nombre: 3 }, …]). */
  readonly indicateurs: readonly IndicateurVersion[];
  /** Nombre total de versions (via meta.total de l’API). */
  readonly total: number;
}

/** Widget d’état des versions : 3 indicateurs + badge total. */
export function VersionStatusWidget({
  indicateurs,
  total,
  className,
}: VersionStatusWidgetProps): JSX.Element {
  const variantePourEtat = (etat: string): 'info' | 'succès' | 'attention' | 'erreur' => {
    switch (etat) {
      case 'publie':
      case 'valide':
        return 'succès';
      case 'archive':
        return 'erreur';
      case 'generation':
      case 'edition':
        return 'attention';
      default:
        return 'info';
    }
  };

  return (
    <section
      aria-label="État des versions de planning"
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-m)',
        border: `var(--border-width) solid var(--color-border)`,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-m)',
        background: 'var(--color-surface)',
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--space-s)', flexWrap: 'wrap' }}>
        {indicateurs.map((indicateur) => {
          const variante = variantePourEtat(indicateur.etat);
          return (
            <Badge
              key={indicateur.etat}
              variante={variante}
              libelle={`${indicateur.etat} (${indicateur.nombre})`}
            />
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-s)',
          marginTop: 'var(--space-xs)',
        }}
      >
        <Icone nom="calendrier" taille={16} aria-hidden />
        <span style={{ fontSize: 'var(--font-size-body)', fontWeight: 600 }}>
          {total} version{total > 1 ? 's' : ''} au total
        </span>
      </div>
    </section>
  );
}
