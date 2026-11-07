// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { themeStore } from './themeStore';

beforeEach(() => {
  localStorage.removeItem('takt-theme');
  themeStore.setState({ theme: 'normal' });
});
afterEach(() => {
  localStorage.removeItem('takt-theme');
  themeStore.setState({ theme: 'normal' });
});

describe('themeStore (thème Normal / Ramadan, persistant)', () => {
  it('démarre sur le thème normal par défaut', () => {
    expect(themeStore.getState().theme).toBe('normal');
  });

  it('passe en ramadan puis revient en normal', () => {
    expect(themeStore.getState().theme).toBe('normal');

    themeStore.getState().setTheme('ramadan');
    expect(themeStore.getState().theme).toBe('ramadan');

    themeStore.getState().setTheme('normal');
    expect(themeStore.getState().theme).toBe('normal');
  });

  it('persiste le thème choisi dans localStorage (clé takt-theme)', () => {
    themeStore.getState().setTheme('ramadan');
    const valeur = JSON.parse(localStorage.getItem('takt-theme') as string);
    expect(valeur.state.theme).toBe('ramadan');

    themeStore.getState().setTheme('normal');
    const valeur2 = JSON.parse(localStorage.getItem('takt-theme') as string);
    expect(valeur2.state.theme).toBe('normal');
  });
});
