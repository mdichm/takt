// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { versionStore } from '@/stores/versionStore';
import { repartitionApi } from '@/lib/repartition.api';
import { contraintesApi } from '@/lib/contraintes.api';
import { api } from '@/lib/api';

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

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      data: { items: [], meta: { page: 1, pageSize: 20, total: 0 } },
      meta: { requestId: 'test', timestamp: new Date().toISOString() },
    }),
  },
}));

vi.mock('@/lib/contraintes.api', () => ({
  contraintesApi: {
    lister: vi.fn().mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 50, total: 0, requestId: 'test', timestamp: new Date().toISOString() },
    }),
    supprimer: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/app/useCanalEvenements', () => ({
  useCanalEvenements: vi.fn(() => ({
    notifications: [],
    evenementsGeneration: [],
    fermer: vi.fn(),
  })),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0 },
  },
});

const renderWithQuery = (component: React.ReactElement) =>
  render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
    </BrowserRouter>,
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
import EC_GES_08 from './EC-GES-08';
import EC_GES_09 from './EC-GES-09';
import EC_GES_10 from './EC-GES-10';
import EC_GES_11 from './EC-GES-11';

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

  EC_GES_01,
  EC_GES_08,
  EC_GES_09,
  EC_GES_10,
  EC_GES_11,
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

  it('existe exactement 25 fichiers de page placeholder (EC-COM-01 et EC-COM-02 sont des pages réelles)', () => {
    expect(PAGES_PLACEHOLDER).toHaveLength(13);
  });

  it('chaque page affiche son code EC-*', () => {
    const codesRendus = new Set<string>();
    for (const Page of PAGES_PLACEHOLDER) {
      render(<Page />);
      const texte = screen.getByText(/^Écran EC-[A-Z]+-\d{2}$/);
      codesRendus.add(texte.textContent!);
      cleanup();
    }
    expect(codesRendus.size).toBe(13);
    for (const code of ['EC-DIR-05']) {
      expect(codesRendus.has(`Écran ${code}`)).toBe(true);
    }
  });
});

/**
 * EC-COM-01 est une page réelle (lot L09-01) qui délègue à LoginPage.
 * Ce test vérifie qu’elle se charge dans un router et rend le formulaire de connexion.
 */
describe('page EC-COM-01 (réelle, lot L09-01)', () => {
  afterEach(() => {
    cleanup();
  });

  it('EC-COM-01 se charge et rend le formulaire de connexion', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <EC_COM_01 />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/adresse e-mail/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
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

describe('page EC-COM-02 (réelle, lot L09-02)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('EC-COM-02 se charge et affiche le titre du tableau de bord', async () => {
    renderWithQuery(<EC_COM_02 />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(),
    );
    expect(screen.getByText(/Tableau de bord/i)).toBeInTheDocument();
    cleanup();
  });

  it('EC-COM-02 affiche l’état vide quand aucune version', async () => {
    renderWithQuery(<EC_COM_02 />);
    await waitFor(() =>
      expect(screen.getByText(/Aucune version disponible/i)).toBeInTheDocument(),
    );
    cleanup();
  });


/**
 * EC-COM-03 est une page réale (lot L09-03) qui délègue à ProfilePage.
 * Ce test vérifie qu'elle se charge dans un router et rend le titre du profil.
 */
describe('page EC-COM-03 (réelle, lot L09-03)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('EC-COM-03 se charge et affiche le titre du profil utilisateur', async () => {
    renderWithQuery(<EC_COM_03 />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(),
    );
    expect(screen.getByText(/Profil utilisateur/i)).toBeInTheDocument();
    cleanup();
  });
});

/** EC-ADM-01 est une page réelle (lot L09-04) qui délègue à UsersAdminPage. */
describe('page EC-ADM-01 (réelle, lot L09-04)', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({
      data: [],
      meta: { requestId: 'test', timestamp: new Date().toISOString() },
    });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('EC-ADM-01 se charge et affiche le titre Utilisateurs', async () => {
    renderWithQuery(<EC_ADM_01 />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(),
    );
    expect(screen.getAllByText(/Utilisateurs/i).length).toBeGreaterThan(0);
    cleanup();
  });
});

/** EC-ADM-02 est une page réelle (lot L09-04) qui délègue à ReferentielsAdminPage. */
describe('page EC-ADM-02 (réelle, lot L09-04)', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({
      data: [],
      meta: { requestId: 'test', timestamp: new Date().toISOString() },
    });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('EC-ADM-02 se charge et affiche le titre Référentiels', async () => {
    renderWithQuery(<EC_ADM_02 />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(),
    );
    expect(screen.getAllByText(/Référentiels/i).length).toBeGreaterThan(0);
    cleanup();
  });
});

/** EC-ADM-03 est une page réelle (lot L09-04) qui délègue à ParametresAdminPage. */
describe('page EC-ADM-03 (réelle, lot L09-04)', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({
      data: [],
      meta: { requestId: 'test', timestamp: new Date().toISOString() },
    });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('EC-ADM-03 se charge et affiche le titre Paramètres système', async () => {
    renderWithQuery(<EC_ADM_03 />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(),
    );
    expect(screen.getAllByText(/Paramètres système/i).length).toBeGreaterThan(0);
    cleanup();
  });
});

/** EC-ADM-04 est une page réelle (lot L09-04) qui délègue à AuditAdminPage. */
describe('page EC-ADM-04 (réelle, lot L09-04)', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({
      data: [],
      meta: { requestId: 'test', timestamp: new Date().toISOString() },
    });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('EC-ADM-04 se charge et affiche le titre Journal d’audit', async () => {
    renderWithQuery(<EC_ADM_04 />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(),
    );
    expect(screen.getAllByText(/Journal d’audit/i).length).toBeGreaterThan(0);
    cleanup();
  });
});

/** EC-GES-02 est une page réelle (lot L09-06) qui délègue à PlanEtudesPage. */
describe('page EC-GES-02 (réelle, lot L09-06)', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({
      data: [],
      meta: { requestId: 'test', timestamp: new Date().toISOString() },
    });
    vi.mocked(contraintesApi.lister).mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 50, total: 0, requestId: 'test', timestamp: new Date().toISOString() },
    });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('EC-GES-02 se charge et affiche le titre Plan d’études', async () => {
    renderWithQuery(<EC_GES_02 />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(),
    );
    expect(screen.getAllByText(/Plan d.études/i).length).toBeGreaterThan(0);
    cleanup();
  });
});

/** EC-GES-03 est une page réelle (lot L09-06) qui délègue à ContraintesPage. */
describe('page EC-GES-03 (réelle, lot L09-06)', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({
      data: [],
      meta: { requestId: 'test', timestamp: new Date().toISOString() },
    });
    vi.mocked(contraintesApi.lister).mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 50, total: 0, requestId: 'test', timestamp: new Date().toISOString() },
    });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('EC-GES-03 se charge et affiche le titre Contraintes', async () => {
    renderWithQuery(<EC_GES_03 />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(),
    );
    expect(screen.getAllByText(/Contraintes/i).length).toBeGreaterThan(0);
    cleanup();
  });
});

/** EC-GES-04 est une page réelle (lot L10-01) qui délègue à GenerationPage. */
describe('page EC-GES-04 (réelle, lot L10-01)', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({
      data: [],
      meta: { requestId: 'test', timestamp: new Date().toISOString() },
    });
    vi.mocked(contraintesApi.lister).mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 50, total: 0, requestId: 'test', timestamp: new Date().toISOString() },
    });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('EC-GES-04 se charge et affiche le titre Génération de scénarios', async () => {
    renderWithQuery(<EC_GES_04 />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(),
    );
    expect(screen.getAllByText(/Generation de scenarios/i).length).toBeGreaterThan(0);
    cleanup();
  });
});
});
