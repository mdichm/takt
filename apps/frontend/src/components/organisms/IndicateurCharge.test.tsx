// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IndicateurCharge } from './IndicateurCharge';

describe('IndicateurCharge', () => {
  it('affiche le label et le pourcentage', () => {
    render(<IndicateurCharge label="Charge enseignant" valeur={65} />);
    expect(screen.getByText('Charge enseignant')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('affiche une barre de progression avec aria-valuenow', () => {
    render(<IndicateurCharge label="Charge" valeur={30} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '30');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('affiche un badge selon le niveau de charge', () => {
    render(<IndicateurCharge label="Charge" valeur={95} />);
    expect(screen.getByText('critique')).toBeInTheDocument();
  });

  it('borne le pourcentage a 0 et 100', () => {
    render(<IndicateurCharge label="Charge" valeur={150} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    render(<IndicateurCharge label="Charge" valeur={-10} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('affiche la barre complete en chargement', () => {
    render(<IndicateurCharge label="Charge" valeur={10} chargement />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('style')).toContain('width: 100%');
  });
});
