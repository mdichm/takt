// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormField } from './FormField';

describe('FormField', () => {
  it('rend un champ avec label associe', () => {
    render(<FormField label="Nom" />);
    expect(screen.getByLabelText('Nom')).toBeInTheDocument();
  });

  it('appelle onChange avec la valeur saisie', () => {
    const onChange = vi.fn();
    render(<FormField label="Nom" onChange={onChange} />);
    fireEvent.input(screen.getByLabelText('Nom'), { target: { value: 'Alice' } });
    expect(onChange).toHaveBeenCalledWith('Alice');
  });

  it('marque le champ invalide quand une erreur est presente', () => {
    render(<FormField label="Nom" messageErreur="Invalide" />);
    expect(screen.getByLabelText('Nom')).toHaveAttribute('aria-invalid', 'true');
  });
});
