// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('rend un champ avec label associe', () => {
    render(<Input label="Nom" />);
    expect(screen.getByLabelText('Nom')).toBeInTheDocument();
  });

  it('appelle onChange avec la valeur saisie', () => {
    const onChange = vi.fn();
    render(<Input label="Nom" onChange={onChange} />);
    const input = screen.getByLabelText('Nom');
    fireEvent.input(input, { target: { value: 'Alice' } });
    expect(onChange).toHaveBeenCalledWith('Alice');
  });

  it('marque le champ invalide quand une erreur est presente', () => {
    render(<Input label="Nom" messageErreur="Invalide" />);
    expect(screen.getByLabelText('Nom')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Invalide');
  });

  it('applique la bordure erreur via jeton CSS', () => {
    render(<Input label="Nom" variante="erreur" />);
    const input = screen.getByLabelText('Nom');
    expect(input.getAttribute('style')).toContain('var(--color-error)');
  });

  it('desactive le champ quand disabled', () => {
    render(<Input label="Nom" disabled />);
    expect(screen.getByLabelText('Nom')).toBeDisabled();
  });
});
