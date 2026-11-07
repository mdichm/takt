// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('ne rend rien quand fermee', () => {
    render(<Modal ouvert={false} titre="Titre" onFermer={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('rend la dialog quand ouverte', () => {
    render(<Modal ouvert={true} titre="Ma modal" onFermer={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Ma modal')).toBeInTheDocument();
  });

  it('appelle onFermer quand on clique sur Fermer', () => {
    const onFermer = vi.fn();
    render(<Modal ouvert={true} titre="Titre" onFermer={onFermer} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onFermer).toHaveBeenCalledTimes(1);
  });

  it('ferme quand on clique sur l overlay', () => {
    const onFermer = vi.fn();
    render(<Modal ouvert={true} titre="Titre" onFermer={onFermer} />);
    // L overlay est le premier div enfant de container (role presentation)
    fireEvent.click(screen.getByRole('presentation'));
    expect(onFermer).toHaveBeenCalledTimes(1);
  });

  it('appelle onValider quand le bouton valider est clique', () => {
    const onValider = vi.fn();
    render(<Modal ouvert={true} titre="Titre" onFermer={() => {}} libelleValider="Enregistrer" onValider={onValider} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onValider).toHaveBeenCalledTimes(1);
  });

  it('affiche le contenu passe en children', () => {
    render(
      <Modal ouvert={true} titre="Titre" onFermer={() => {}}>
        <p data-testid="contenu-modal">Contenu de la modal</p>
      </Modal>,
    );
    expect(screen.getByTestId('contenu-modal')).toBeInTheDocument();
  });
});
