// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('rend une case avec label associe', () => {
    render(<Checkbox label="Accepter" checked={false} />);
    expect(screen.getByLabelText('Accepter')).toBeInTheDocument();
  });

  it('reflete l etat coche via aria-checked', () => {
    render(<Checkbox label="Accepter" checked />);
    expect(screen.getByLabelText('Accepter')).toHaveAttribute('aria-checked', 'true');
  });

  it('inverse l etat au clic et appelle onChange', () => {
    const onChange = vi.fn();
    render(<Checkbox label="Accepter" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Accepter'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('desactive la case quand disabled', () => {
    render(<Checkbox label="Accepter" checked disabled />);
    expect(screen.getByLabelText('Accepter')).toBeDisabled();
  });

  it('utilise le fond primaire quand cochee', () => {
    render(<Checkbox label="Accepter" checked />);
    const input = screen.getByLabelText('Accepter');
    expect(input).toHaveStyle({ background: 'var(--color-primary)' });
  });
});
