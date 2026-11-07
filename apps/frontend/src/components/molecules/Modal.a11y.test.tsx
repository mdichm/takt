// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { Modal } from './Modal';

describe('Modal — accessibilité', () => {
  it('ne produit aucune violation axe (ouverte)', async () => {
    const { container } = render(
      <Modal ouvert={true} titre="Titre" onFermer={() => {}}>
        <p>Contenu</p>
      </Modal>,
    );
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });
});
