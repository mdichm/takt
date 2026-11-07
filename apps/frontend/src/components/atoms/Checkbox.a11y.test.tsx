// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { Checkbox } from './Checkbox';

describe('Checkbox — accessibilité', () => {
  it('ne produit aucune violation axe (non cochee)', async () => {
    const { container } = render(<Checkbox label="Accepter" checked={false} />);
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });

  it('ne produit aucune violation axe (cochee)', async () => {
    const { container } = render(<Checkbox label="Accepter" checked />);
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });
});
