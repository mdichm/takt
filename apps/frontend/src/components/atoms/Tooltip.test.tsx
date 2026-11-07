// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('rend le declencheur et le contenu de la bulle', () => {
    render(
      <Tooltip contenu="Aide contextuelle">
        <button>Declencheur</button>
      </Tooltip>,
    );
    expect(screen.getByRole('button', { name: 'Declencheur' })).toBeInTheDocument();
  });

  it('le declencheur pointe vers la bulle via aria-describedby quand survole', () => {
    render(
      <Tooltip contenu="Aide">
        <button>Declencheur</button>
      </Tooltip>,
    );
    const declencheur = screen.getByTestId('tooltip-declencheur');
    fireEvent.mouseEnter(declencheur);
    expect(declencheur).toHaveAttribute('aria-describedby');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Aide');
  });
});
