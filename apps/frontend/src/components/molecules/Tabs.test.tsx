// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from './Tabs';

describe('Tabs', () => {
  const onglets = [
    { id: 'a', libelle: 'Onglet A' },
    { id: 'b', libelle: 'Onglet B' },
    { id: 'c', libelle: 'Onglet C' },
  ];

  it('rend le tablist et les onglets', () => {
    render(<Tabs onglets={onglets} valeur="a" onChange={() => {}} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Onglet A' })).toBeInTheDocument();
  });

  it("marque l'onglet actif avec aria-selected", () => {
    render(<Tabs onglets={onglets} valeur="b" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Onglet B' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Onglet A' })).toHaveAttribute('aria-selected', 'false');
  });

  it('appelle onChange quand on clique sur un onglet', () => {
    const onChange = vi.fn();
    render(<Tabs onglets={onglets} valeur="a" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Onglet C' }));
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it("navigue vers l'onglet suivant avec la fleche droite", () => {
    render(<Tabs onglets={onglets} valeur="a" onChange={() => {}} />);
    const tabA = screen.getByRole('tab', { name: 'Onglet A' });
    fireEvent.keyDown(tabA, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Onglet B' })).toHaveAttribute('tabindex', '0');
  });
});
