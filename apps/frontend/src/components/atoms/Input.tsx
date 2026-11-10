// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PropsBase, VarianteInput } from '../types';

interface InputProps extends PropsBase {
  /** Libellé du champ. */
  readonly label: string;
  /** Type HTML du input. */
  readonly type?: string;
  /** Valeur courante. */
  readonly value?: string;
  /** Variante (défaut, erreur, succès). */
  readonly variante?: VarianteInput;
  /** Si le champ est desactive. */
  readonly disabled?: boolean;
  /** Si le champ est requis. */
  readonly required?: boolean;
  /** Message d'erreur affiche sous le champ. */
  readonly messageErreur?: string;
  /** Gestionnaire de changement. */
  readonly onChange?: (valeur: string) => void;
  /** Placeholder. */
  readonly placeholder?: string;
}

export function Input({
  label,
  type = 'text',
  value,
  variante = 'défaut',
  disabled = false,
  required = false,
  messageErreur,
  onChange,
  placeholder,
  id,
  className,
}: InputProps): JSX.Element {
  const champId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const estErreur = variante === 'erreur' || !!messageErreur;
  const bordure = estErreur ? 'var(--color-error)' : 'var(--color-border)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xxs)' }}>
      <label
        htmlFor={champId}
        style={{
          fontSize: 'var(--font-size-caption)',
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
        }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--color-error)', marginLeft: 'var(--space-xxs)' }}>*</span>
        )}
      </label>
      <input
        id={champId}
        type={type}
        value={value ?? ''}
        disabled={disabled}
        required={required}
        aria-invalid={estErreur}
        aria-required={required || undefined}
        aria-describedby={messageErreur ? `${champId}-erreur` : undefined}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
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
      />
      {messageErreur && (
        <span
          id={`${champId}-erreur`}
          role="alert"
          style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-error)' }}
        >
          {messageErreur}
        </span>
      )}
    </div>
  );
}
