// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Paginator } from './Paginator';

describe('Paginator', () => {
  it('rend la pagination avec role nav', () => {
    render(<Paginator page={1} total={5} onChange={() => {}} />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByText('Page 1 sur 5')).toBeInTheDocument();
  });

  it('desactive precedente sur la premiere page', () => {
    render(<Paginator page={1} total={5} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Précédente' })).toBeDisabled();
  });

  it('desactive suivante sur la derniere page', () => {
    render(<Paginator page={5} total={5} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Suivante' })).toBeDisabled();
  });

  it('appelle onChange quand on clique sur suivante', () => {
    const onChange = vi.fn();
    render(<Paginator page={1} total={5} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Suivante' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
