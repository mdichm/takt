// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const EnfantQuiRend = (): JSX.Element => {
  throw new Error('erreur de rendu simulée');
};

describe('ErrorBoundary (GG-06 : pas de stack trace)', () => {
  afterEach(() => {
    cleanup();
  });

  it('affiche un fallback quand un enfant lève une erreur de rendu', () => {
    render(
      <ErrorBoundary>
        <EnfantQuiRend />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });
});
