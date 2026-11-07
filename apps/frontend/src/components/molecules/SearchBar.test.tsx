// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('rend une zone de recherche avec role search', () => {
    render(<SearchBar value="" onChange={() => {}} onSearch={() => {}} />);
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Rechercher…')).toBeInTheDocument();
  });

  it('appelle onSearch avec la valeur quand on clique sur Rechercher', () => {
    const onSearch = vi.fn();
    render(<SearchBar value="toto" onChange={() => {}} onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }));
    expect(onSearch).toHaveBeenCalledWith('toto');
  });

  it('appelle onSearch quand Enter est presse', () => {
    const onSearch = vi.fn();
    render(<SearchBar value="toto" onChange={() => {}} onSearch={onSearch} />);
    fireEvent.keyDown(screen.getByPlaceholderText('Rechercher…'), { key: 'Enter' });
    expect(onSearch).toHaveBeenCalledWith('toto');
  });
});
