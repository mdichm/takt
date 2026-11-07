// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PropsBase, VarianteInput } from '../types';

interface Option {
  readonly valeur: string;
  readonly libelle: string;
  readonly desactivee?: boolean;
}

interface SelectProps extends PropsBase {
  /** Libellé du champ. */
  readonly label: string;
  /** Options disponibles. */
  readonly options: readonly Option[];
  /** Valeur courante. */
  readonly value?: string;
  /** Variante. */
  readonly variante?: VarianteInput;
  /** Si le champ est desactive. */
  readonly disabled?: boolean;
  /** Si le champ est requis. */
  readonly required?: boolean;
  /** Message d'erreur affiche sous le champ. */
  readonly messageErreur?: string;
  /** Gestionnaire de changement. */
  readonly onChange?: (valeur: string) => void;
  /** Placeholder (option vide en premiere position). */
  readonly placeholder?: string;
}

export function Select({
  label,
  options,
  value,
  variante = 'défaut',
  disabled = false,
  required = false,
  messageErreur,
  onChange,
  placeholder,
  id,
  className,
}: SelectProps): JSX.Element {
  const champId = id || `select-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const estErreur = variante === 'erreur' || !!messageErreur;
  const bordure = estErreur ? 'var(--color-error)' : 'var(--color-border)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xxs)' }}>
      <label htmlFor={champId} style={{ fontSize: 'var(--font-size-caption)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        {label}
        {required && (
          <span style={{ color: 'var(--color-error)', marginLeft: 'var(--space-xxs)' }}>*</span>
        )}
      </label>
      <select
        id={champId}
        value={value ?? ''}
        disabled={disabled}
        required={required}
        aria-invalid={estErreur}
        aria-required={required || undefined}
        aria-describedby={messageErreur ? `${champId}-erreur` : undefined}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          height: 'var(--input-height)',
          padding: `0 var(--space-s)`,
          border: `var(--border-width) solid ${bordure}`,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          fontSize: 'var(--font-size-body)',
          outline: 'none',
        }}
        className={className}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.valeur} value={option.valeur} disabled={option.desactivee}>
            {option.libelle}
          </option>
        ))}
      </select>
      {messageErreur && (
        <span id={`${champId}-erreur`} role="alert" style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-error)' }}>
          {messageErreur}
        </span>
      )}
    </div>
  );
}
