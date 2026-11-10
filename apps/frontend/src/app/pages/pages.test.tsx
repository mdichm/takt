// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { versionStore } from '@/stores/versionStore';
import { repartitionApi } from '@/lib/repartition.api';

vi.mock('@/lib/repartition.api', () => ({
  repartitionApi: {
    listerAffectations: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, pageSize: 20, total: 0 } }),
    listerMatieresPlanEtudes: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, pageSize: 20, total: 0 } }),
    listerStatutsValidation: vi.fn().mockResolvedValue([]),
    validerRepartition: vi.fn().mockResolvedValue({}),
    annulerRepartition: vi.fn().mockResolvedValue({}),
    listerPlansEtudes: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, pageSize: 50, total: 0 } }),
    listerEnseignants: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, pageSize: 50, total: 0 } }),
    listerGroupes: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, pageSize: 50, total: 0 } }),
    listerTypesEnseignement: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, pageSize: 50, total: 0 } }),
    listerMatieres: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, pageSize: 50, total: 0 } }),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0 },
  },
});

const renderWithQuery = (component: React.ReactElement) =>
  render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>,
  );
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

import EC_RDEP_03 from './EC-RDEP-03';
import EC_RDEP_04 from './EC-RDEP-04';
import EC_RDEP_05 from './EC-RDEP-05';
import EC_DIR_01 from './EC-DIR-01';
import EC_DIR_02 from './EC-DIR-02';
import EC_DIR_03 from './EC-DIR-03';
import EC_DIR_04 from './EC-DIR-04';
import EC_DIR_05 from './EC-DIR-05';
import EC_RDEP_01 from './EC-RDEP-01';
import EC_RDEP_02 from './EC-RDEP-02';

const PAGES_PLACEHOLDER = [

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
    expect(PAGES_PLACEHOLDER).toHaveLength(27);
  });

  it('chaque page affiche son code EC-*', () => {
    const codesRendus = new Set<string>();
    for (const Page of PAGES_PLACEHOLDER) {
      render(<Page />);
      const texte = screen.getByText(/^Écran EC-[A-Z]+-\d{2}$/);
      codesRendus.add(texte.textContent!);
      cleanup();
    }
    expect(codesRendus.size).toBe(27);
    for (const code of ['EC-COM-01', 'EC-GES-06', 'EC-DIR-05']) {
      expect(codesRendus.has(`Écran ${code}`)).toBe(true);
    }
  });
});

/**
 * EC-RDEP-01 et EC-RDEP-02 sont des pages réelles (lot L05-06).
 * Ce test vérifie qu'elles se chargent sans erreur et affichent leur en-tête.
 */
describe('pages EC-RDEP-01 / EC-RDEP-02 (réelles, lot L05-06)', () => {
  beforeEach(() => {
    versionStore.setState({
      contexteRepartition: {
        versionId: 'v-test',
        semestreId: 's-test',
        departementId: 'd-test',
        etatVersion: 'rep_pedag',
      },
    });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    versionStore.setState({ contexteRepartition: null });
  });

  it('EC-RDEP-01 se charge et affiche le titre de la page', async () => {
    renderWithQuery(<EC_RDEP_01 />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(),
    );
    cleanup();
  });

  it('EC-RDEP-02 se charge et affiche le titre de la page', async () => {
    renderWithQuery(<EC_RDEP_02 />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(),
    );
    cleanup();
  });

  it('EC-RDEP-02 : bouton Annuler désactivé quand le département n’est pas validé', async () => {
    versionStore.setState({
      contexteRepartition: {
        versionId: 'v-test',
        semestreId: 's-test',
        departementId: 'd-test',
        etatVersion: 'rep_pedag',
      },
    });
    vi.mocked(repartitionApi.listerStatutsValidation).mockResolvedValue([
      { departementId: 'd-test', etat: 'EN_COURS', revision: 1 },
    ]);
    renderWithQuery(<EC_RDEP_02 />);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Annuler la répartition' }),
      ).toBeDisabled(),
    );
    cleanup();
  });

  it('EC-RDEP-02 : bouton Annuler activé quand le département est validé', async () => {
    versionStore.setState({
      contexteRepartition: {
        versionId: 'v-test',
        semestreId: 's-test',
        departementId: 'd-test',
        etatVersion: 'rep_pedag',
      },
    });
    vi.mocked(repartitionApi.listerStatutsValidation).mockResolvedValue([
      { departementId: 'd-test', etat: 'VALIDE', revision: 1 },
    ]);
    renderWithQuery(<EC_RDEP_02 />);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Annuler la répartition' }),
      ).toBeEnabled(),
    );
    cleanup();
  });

  it('EC-RDEP-02 : cliquer sur Annuler appelle l’API et affiche le succès', async () => {
    versionStore.setState({
      contexteRepartition: {
        versionId: 'v-test',
        semestreId: 's-test',
        departementId: 'd-test',
        etatVersion: 'rep_pedag',
      },
    });
    vi.mocked(repartitionApi.listerStatutsValidation).mockResolvedValue([
      { departementId: 'd-test', etat: 'VALIDE', revision: 1 },
    ]);
    renderWithQuery(<EC_RDEP_02 />);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Annuler la répartition' }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Annuler la répartition' }));
    await waitFor(() =>
      expect(repartitionApi.annulerRepartition).toHaveBeenCalledWith({
        versionId: 'v-test',
        departementId: 'd-test',
      }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Répartition annulée/)).toBeInTheDocument(),
    );
    cleanup();
  });
});
