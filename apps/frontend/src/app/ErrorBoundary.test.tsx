// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const EnfantQuiRend = (): JSX.Element => {
  throw new Error('erreur de rendu simulée');
};

const EnfantQuiRendAvecRequestId = (): JSX.Element => {
  const erreur = new Error('erreur avec requestId');
  (erreur as { requestId?: string }).requestId = 'req-123';
  throw erreur;
};

describe('ErrorBoundary (GG-06 : pas de stack trace)', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any-justify: mock de crypto.randomUUID, le type UUID template literal est trop restrictif pour un test
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('diag-uuid-test' as any);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('affiche un fallback en français quand un enfant lève une erreur de rendu', () => {
    render(
      <ErrorBoundary>
        <EnfantQuiRend />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary-titre')).toHaveTextContent(
      'Une erreur est survenue lors du rendu de cet écran.',
    );
  });

  it('n expose aucune stack trace ni détail technique', () => {
    render(
      <ErrorBoundary>
        <EnfantQuiRend />
      </ErrorBoundary>,
    );
    expect(screen.queryByText(/erreur de rendu simulée/)).not.toBeInTheDocument();
    expect(screen.queryByText(/at /)).not.toBeInTheDocument();
    expect(screen.queryByText(/Error/)).not.toBeInTheDocument();
  });

  it('affiche un identifiant de diagnostic généré quand aucun requestId n est fourni', () => {
    render(
      <ErrorBoundary>
        <EnfantQuiRend />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary-diagnostic')).toHaveTextContent(
      'Identifiant de diagnostic : diag-uuid-test',
    );
  });

  it('affiche le requestId de l erreur quand il est disponible', () => {
    render(
      <ErrorBoundary requestId="req-existant">
        <EnfantQuiRendAvecRequestId />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary-diagnostic')).toHaveTextContent(
      'Identifiant de diagnostic : req-existant',
    );
  });

  it('permet de reessayer apres une erreur', () => {
    render(
      <ErrorBoundary>
        <EnfantQuiRend />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('error-boundary-reessayer'));
    // Le composant enfant remonte et retente le rendu -> encore une erreur
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });

  it('reste utilisable et n expose pas la pile d appel', () => {
    render(
      <ErrorBoundary>
        <EnfantQuiRend />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary-reessayer')).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('getDerivedStateFromError');
    expect(document.body.innerHTML).not.toContain('componentDidCatch');
  });
});
