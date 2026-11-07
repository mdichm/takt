// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EtatChargement } from './EtatChargement';

describe('EtatChargement', () => {
  it('affiche le Spinner et le libelle avec role status', () => {
    render(<EtatChargement libelle="Chargement des séances" />);
    expect(screen.getByRole('status', { name: 'Chargement des séances' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('utilise le libelle par defaut', () => {
    render(<EtatChargement />);
    expect(screen.getByRole('status', { name: 'Chargement en cours…' })).toBeInTheDocument();
  });
});
