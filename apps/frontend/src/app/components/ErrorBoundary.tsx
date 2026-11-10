// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/** Capture les erreurs de rendu sans exposer de stack trace (GG-06). */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo) {
    void _error;
    void _info;
    // Aucune stack trace affichée côté utilisateur.
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">Une erreur est survenue lors du rendu de cet écran.</div>
      );
    }
    return this.props.children;
  }
}
