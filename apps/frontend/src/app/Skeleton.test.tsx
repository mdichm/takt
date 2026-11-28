// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  afterEach(() => {
    cleanup();
  });

  it('annonce son etat de chargement via role et aria-busy', () => {
    render(<Skeleton />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(skeleton).toHaveAttribute('aria-label', 'Chargement en cours');
  });

  it('affiche des blocs de skeleton visibles', () => {
    render(<Skeleton />);
    const blocs = screen.getAllByTestId('skeleton');
    expect(blocs).toHaveLength(1);
  });
});
