// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

afterEach(() => {
  cleanup();
});

describe('LoginPage — accessibilité (WCAG AA)', () => {
  it('ne produit aucune violation axe-core', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    );
    await expect(container).toHaveNoViolations();
  });
});
