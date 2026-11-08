// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import EC_COM_01 from './EC-COM-01';
import EC_COM_02 from './EC-COM-02';
import EC_COM_03 from './EC-COM-03';
import EC_ADM_01 from './EC-ADM-01';
import EC_ADM_02 from './EC-ADM-02';
import EC_ADM_03 from './EC-ADM-03';
import EC_ADM_04 from './EC-ADM-04';
import EC_GES_01 from './EC-GES-01';
import EC_GES_02 from './EC-GES-02';
import EC_GES_03 from './EC-GES-03';
import EC_GES_04 from './EC-GES-04';
import EC_GES_05 from './EC-GES-05';
import EC_GES_06 from './EC-GES-06';
import EC_GES_07 from './EC-GES-07';
import EC_GES_08 from './EC-GES-08';
import EC_GES_09 from './EC-GES-09';
import EC_GES_10 from './EC-GES-10';
import EC_GES_11 from './EC-GES-11';
import EC_GES_12 from './EC-GES-12';
import EC_RDEP_01 from './EC-RDEP-01';
import EC_RDEP_02 from './EC-RDEP-02';
import EC_RDEP_03 from './EC-RDEP-03';
import EC_RDEP_04 from './EC-RDEP-04';
import EC_RDEP_05 from './EC-RDEP-05';
import EC_DIR_01 from './EC-DIR-01';
import EC_DIR_02 from './EC-DIR-02';
import EC_DIR_03 from './EC-DIR-03';
import EC_DIR_04 from './EC-DIR-04';
import EC_DIR_05 from './EC-DIR-05';

const PAGES = [
  EC_COM_01,
  EC_COM_02,
  EC_COM_03,
  EC_ADM_01,
  EC_ADM_02,
  EC_ADM_03,
  EC_ADM_04,
  EC_GES_01,
  EC_GES_02,
  EC_GES_03,
  EC_GES_04,
  EC_GES_05,
  EC_GES_06,
  EC_GES_07,
  EC_GES_08,
  EC_GES_09,
  EC_GES_10,
  EC_GES_11,
  EC_GES_12,
  EC_RDEP_01,
  EC_RDEP_02,
  EC_RDEP_03,
  EC_RDEP_04,
  EC_RDEP_05,
  EC_DIR_01,
  EC_DIR_02,
  EC_DIR_03,
  EC_DIR_04,
  EC_DIR_05,
];

/**
 * Tous les écrans EC-* sont des placeholders (lot L09) qui rendent EcranPlaceholder
 * avec leur code. Ce test vérifie que chacun des 29 fichiers de page se charge et
 * affiche son code.
 */
describe('pages EC-* (placeholders, lot L09)', () => {
  afterEach(() => {
    cleanup();
  });

  it('existe exactement 29 fichiers de page', () => {
    expect(PAGES).toHaveLength(29);
  });

  it('chaque page affiche son code EC-*', () => {
    const codesRendus = new Set<string>();
    for (const Page of PAGES) {
      render(<Page />);
      const texte = screen.getByText(/^Écran EC-[A-Z]+-\d{2}$/);
      codesRendus.add(texte.textContent!);
      cleanup();
    }
    expect(codesRendus.size).toBe(29);
    for (const code of ['EC-COM-01', 'EC-GES-06', 'EC-RDEP-01', 'EC-DIR-05']) {
      expect(codesRendus.has(`Écran ${code}`)).toBe(true);
    }
  });
});
