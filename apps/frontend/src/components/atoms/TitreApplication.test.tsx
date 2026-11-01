// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TitreApplication } from './TitreApplication';

describe('TitreApplication', () => {
  it('affiche le titre français dans un niveau de titre principal', () => {
    render(<TitreApplication />);

    expect(screen.getByRole('heading', { level: 1, name: 'TAKT' })).toBeInTheDocument();
  });
});
