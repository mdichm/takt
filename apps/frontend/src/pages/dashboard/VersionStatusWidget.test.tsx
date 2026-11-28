// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VersionStatusWidget } from './VersionStatusWidget';
import type { IndicateurVersion } from './dashboard.types';

describe('VersionStatusWidget', () => {
  it('affiche le total et les indicateurs par état', () => {
    const indicateurs: readonly IndicateurVersion[] = [
      { etat: 'publie', nombre: 3 },
      { etat: 'brouillon', nombre: 2 },
      { etat: 'archive', nombre: 1 },
    ];
    render(<VersionStatusWidget indicateurs={indicateurs} total={6} />);

    expect(screen.getByText(/6 version/)).toBeInTheDocument();
    expect(screen.getByText(/publie \(3\)/)).toBeInTheDocument();
    expect(screen.getByText(/brouillon \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/archive \(1\)/)).toBeInTheDocument();
  });

  it('gère une liste d’indicateurs vide', () => {
    render(<VersionStatusWidget indicateurs={[]} total={0} />);
    expect(screen.getByText(/0 version/)).toBeInTheDocument();
  });
});
