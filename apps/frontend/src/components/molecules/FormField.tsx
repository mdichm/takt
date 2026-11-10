// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Input } from '../atoms/Input';
import { PropsBase } from '../types';

interface FormFieldProps extends PropsBase {
  /** Libellé du champ. */
  readonly label: string;
  /** Valeur courante. */
  readonly value?: string;
  /** Si le champ est invalide. */
  readonly invalide?: boolean;
  /** Message d'erreur affiché sous le champ. */
  readonly messageErreur?: string;
  /** Si le champ est désactivé. */
  readonly disabled?: boolean;
  /** Gestionnaire de changement. */
  readonly onChange?: (valeur: string) => void;
}

/** Champ de formulaire complet : label + input + message d'erreur, accessible. */
export function FormField({
  label,
  value,
  invalide = false,
  messageErreur,
  disabled,
  onChange,
  id,
  className,
}: FormFieldProps): JSX.Element {
  return (
    <Input
      label={label}
      value={value ?? ''}
      variante={invalide || messageErreur ? 'erreur' : 'défaut'}
      disabled={disabled ?? false}
      {...(id !== undefined ? { id } : {})}
      {...(messageErreur !== undefined ? { messageErreur } : {})}
      {...(onChange !== undefined ? { onChange } : {})}
      {...(className !== undefined ? { className } : {})}
    />
  );
}
