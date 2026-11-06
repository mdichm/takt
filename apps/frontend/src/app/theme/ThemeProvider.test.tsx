// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from './ThemeProvider';
import { themeStore } from './themeStore';

beforeEach(() => {
  localStorage.removeItem('takt-theme');
  themeStore.setState({ theme: 'normal' });
  document.documentElement.removeAttribute('data-theme');
});
afterEach(() => {
  localStorage.removeItem('takt-theme');
  themeStore.setState({ theme: 'normal' });
  document.documentElement.removeAttribute('data-theme');
});

const Enfant = () => <div data-testid="enfant">Enfant</div>;

describe('ThemeProvider (switch Normal/Ramadan, sans rechargement)', () => {
  it('applique le thème normal par défaut sur l élément racine', () => {
    render(
      <ThemeProvider>
        <Enfant />
      </ThemeProvider>
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('normal');
    expect(screen.getByTestId('enfant')).toBeInTheDocument();
  });

  it('passe en ramadan et met à jour l attribut data-theme sans rechargement', () => {
    const { rerender } = render(
      <ThemeProvider>
        <Enfant />
      </ThemeProvider>
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('normal');

    themeStore.setState({ theme: 'ramadan' });
    rerender(
      <ThemeProvider>
        <Enfant />
      </ThemeProvider>
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('ramadan');
    expect(screen.getByTestId('enfant')).toBeInTheDocument();
  });
});
