// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

describe('Select', () => {
  const options = [
    { valeur: 'a', libelle: 'Option A' },
    { valeur: 'b', libelle: 'Option B' },
  ];

  it('rend un select avec label associe', () => {
    render(<Select label="Choix" options={options} />);
    expect(screen.getByLabelText('Choix')).toBeInTheDocument();
    expect(screen.getByText('Option A')).toBeInTheDocument();
  });

  it('appelle onChange avec la valeur selectionnee', () => {
    const onChange = vi.fn();
    render(<Select label="Choix" options={options} onChange={onChange} />);
    const select = screen.getByLabelText('Choix');
    fireEvent.change(select, { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('marque le champ invalide quand une erreur est presente', () => {
    render(<Select label="Choix" options={options} messageErreur="Requis" />);
    expect(screen.getByLabelText('Choix')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Requis');
  });

  it('applique la bordure erreur via jeton CSS', () => {
    render(<Select label="Choix" options={options} variante="erreur" />);
    const select = screen.getByLabelText('Choix');
    expect(select.getAttribute('style')).toContain('var(--color-error)');
  });
});
