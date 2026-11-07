// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { expect, test, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportAssistant from './ImportAssistant';

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn().mockResolvedValue({ data: [], meta: { requestId: 'x', timestamp: 't' } }),
  },
}));

import { api } from '@/lib/api';

const mockPost = api.post as ReturnType<typeof vi.fn>;

const donneesApercu = {
  type: 'site' as const,
  empreinte: 'a'.repeat(64),
  totalLignes: 3,
  lignesValides: 2,
  lignesInvalides: 1,
  erreurs: [
    { ligne: 3, champ: 'code', valeur: '', motif: 'Le code est requis' },
  ],
  apercuLignes: [
    { ligne: 2, code: 'S1', libelle: 'Site 1' },
  ],
};

const donneesRapport = {
  type: 'site' as const,
  empreinte: 'a'.repeat(64),
  importes: 2,
  rejets: 1,
  erreurs: [
    { ligne: 3, champ: 'code', valeur: '', motif: 'Le code est requis' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPost.mockReset();
});

test('bouton aperçu désactivé sans contenu CSV', () => {
  render(<ImportAssistant />);
  expect(screen.getByRole('button', { name: 'Aperçu avant import' })).toBeDisabled();
});

test('saisir du contenu active le bouton et affiche l’aperçu', async () => {
  mockPost.mockResolvedValue({
    data: donneesApercu,
    meta: { requestId: 'x', timestamp: 't' },
  });
  render(<ImportAssistant />);
  const textarea = screen.getByLabelText('Contenu CSV');
  fireEvent.change(textarea, {
    target: { value: 'code;libelle\nS1;Site 1\nS2;Site 2\n' },
  });
  expect(screen.getByRole('button', { name: 'Aperçu avant import' })).not.toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Aperçu avant import' }));
  await waitFor(() => {
    expect(screen.getByText('Lignes totales')).toBeInTheDocument();
  });
  expect(mockPost).toHaveBeenCalledWith('/referentiels/import/apercu', {
    type: 'site',
    contenu: 'code;libelle\nS1;Site 1\nS2;Site 2\n',
  });
  expect(screen.getByText('2')).toBeInTheDocument();
});

test('confirmer l’import affiche le rapport', async () => {
  mockPost
    .mockResolvedValueOnce({
      data: donneesApercu,
      meta: { requestId: 'x', timestamp: 't' },
    })
    .mockResolvedValueOnce({
      data: donneesRapport,
      meta: { requestId: 'y', timestamp: 't' },
    });
  render(<ImportAssistant />);
  const textarea = screen.getByLabelText('Contenu CSV');
  fireEvent.change(textarea, { target: { value: 'code;libelle\nS1;Site 1\n' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aperçu avant import' }));
  await waitFor(() => {
    expect(screen.getByText('Confirmer l’import')).toBeInTheDocument();
  });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’import' }));
  await waitFor(() => {
    expect(screen.getByText('Import terminé avec succès.')).toBeInTheDocument();
  });
  expect(mockPost).toHaveBeenLastCalledWith('/referentiels/import/executer', {
    type: 'site',
    contenu: 'code;libelle\nS1;Site 1\n',
    empreinte: 'a'.repeat(64),
  });
});
