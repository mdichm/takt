// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { Spinner } from './Spinner';

describe('Spinner — accessibilité', () => {
  it('ne produit aucune violation axe', async () => {
    const { container } = render(<Spinner />);
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });
});
