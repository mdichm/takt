// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageError } from './PageError';

describe('PageError', () => {
  afterEach(() => {
    cleanup();
  });

  it('affiche le titre 404 et le message explicatif', () => {
    render(
      <MemoryRouter>
        <PageError />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('page-404-titre')).toHaveTextContent('Page introuvable (404)');
    expect(screen.getByTestId('page-404-message')).toHaveTextContent(
      'L ecran demande n existe pas ou a ete deplace.',
    );
  });

  it('propose un lien de retour vers le tableau de bord', () => {
    render(
      <MemoryRouter>
        <PageError />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('page-404-retour')).toHaveAttribute('href', '/dashboard');
  });
});
