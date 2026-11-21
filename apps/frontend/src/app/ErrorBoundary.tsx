// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  /** Enfants protégés par la limite d erreur. */
  readonly children: ReactNode;
  /** Identifiant de requête issu de l enveloppe API, quand disponible. */
  readonly requestId?: string;
  /** Gestionnaire invoque au clic sur Reessayer. */
  readonly onRetry?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
  diagnosticId: string | null;
  retryKey: number;
}

/**
 * Capture les exceptions React sans exposer de stack trace (GG-06).
 *
 * - Affiche un message d aide en francais
 * - Affiche un identifiant de diagnostic (requestId API ou identifiant local)
 * - Propose un bouton Reessayer pour remonter le sous-arbre
 * - N affiche jamais le nom de classe interne ni la pile d appel
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    error: null,
    diagnosticId: null,
    retryKey: 0,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      error,
      diagnosticId: null,
      retryKey: 0,
    };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    void _error;
    void _info;
    // Aucune stack trace ni detail technique n est consigne cote utilisateur.
    const requestId =
      this.props.requestId ??
      ((_error as { requestId?: string }).requestId ?? undefined);
    const diagnosticId = requestId ?? crypto.randomUUID();
    this.setState({ diagnosticId });
  }

  gererReessayer = (): void => {
    this.setState((etat) => ({
      error: null,
      diagnosticId: null,
      retryKey: etat.retryKey + 1,
    }));
    this.props.onRetry?.();
  };

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div data-testid="error-boundary" role="alert">
          <h2 data-testid="error-boundary-titre">
            Une erreur est survenue lors du rendu de cet écran.
          </h2>
          <p data-testid="error-boundary-diagnostic">
            Identifiant de diagnostic : {this.state.diagnosticId}
          </p>
          <button
            data-testid="error-boundary-reessayer"
            onClick={this.gererReessayer}
          >
            Reessayer
          </button>
        </div>
      );
    }
    return <>{this.props.children}</>;
  }
}
