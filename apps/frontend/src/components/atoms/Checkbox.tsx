// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PropsBase } from '../types';

interface CheckboxProps extends PropsBase {
  /** Libellé de la case à cocher. */
  readonly label: string;
  /** Si la case est cochée. */
  readonly checked: boolean;
  /** Si le champ est desactive. */
  readonly disabled?: boolean;
  /** Si le champ est requis. */
  readonly required?: boolean;
  /** Gestionnaire de changement. */
  readonly onChange?: (checked: boolean) => void;
}

export function Checkbox({
  label,
  checked,
  disabled = false,
  required = false,
  onChange,
  id,
  className,
}: CheckboxProps): JSX.Element {
  const boxId = id || `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-s)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 'var(--font-size-body)',
        color: 'var(--color-text-primary)',
      }}
    >
      <input
        type="checkbox"
        id={boxId}
        checked={checked}
        disabled={disabled}
        required={required}
        aria-checked={checked}
        aria-required={required || undefined}
        onChange={() => onChange?.(!checked)}
        style={{
          width: 'var(--space-m)',
          height: 'var(--space-m)',
          border: `var(--border-width) solid var(--color-border)`,
          borderRadius: 'var(--radius-sm)',
          background: checked ? 'var(--color-primary)' : 'var(--color-surface)',
          color: 'var(--color-surface)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          appearance: 'none',
          display: 'grid',
          placeItems: 'center',
        }}
        className={className}
      />
      <span>{label}</span>
    </label>
  );
}
