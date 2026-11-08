// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { TitreApplication } from './TitreApplication';

describe('TitreApplication — accessibilité', () => {
  it('ne produit aucune violation axe-core', async () => {
    render(<TitreApplication />);
    const element = screen.getByRole('heading', { level: 1, name: 'TAKT' });
    await expectAccessible(element);
  });
});
