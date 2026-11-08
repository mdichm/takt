// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormulaireEntite } from './FormulaireEntite';

describe('FormulaireEntite', () => {
  const onSubmit = vi.fn();
  const onAnnuler = vi.fn();

  beforeEach(() => {
    onSubmit.mockReset();
    onAnnuler.mockReset();
  });

  it('rend tous les champs du formulaire', () => {
    render(<FormulaireEntite onSubmit={onSubmit} onAnnuler={onAnnuler} />);
    expect(screen.getByText('Nom')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Rôle')).toBeInTheDocument();
    expect(screen.getByText('Département')).toBeInTheDocument();
    expect(screen.getByText('Compte actif')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument();
  });

  it('pré-remplit les champs quand une entite est fournie', () => {
    render(
      <FormulaireEntite
        entite={{
          id: '1',
          nom: 'Dupont',
          email: 'd@ex.fr',
          role: 'enseignant',
          departement: 'info',
          actif: true,
        }}
        onSubmit={onSubmit}
        onAnnuler={onAnnuler}
      />,
    );
    expect(screen.getByDisplayValue('Dupont')).toBeInTheDocument();
    expect(screen.getByDisplayValue('d@ex.fr')).toBeInTheDocument();
  });

  it('affiche une erreur quand un champ obligatoire est vide', () => {
    render(<FormulaireEntite onSubmit={onSubmit} onAnnuler={onAnnuler} />);
    fireEvent.submit(screen.getByRole('form'));
    expect(screen.getAllByText('Ce champ est obligatoire').length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('appelle onSubmit quand le formulaire est valide', () => {
    render(<FormulaireEntite onSubmit={onSubmit} onAnnuler={onAnnuler} />);
    const nomInput = screen.getByLabelText(/Nom/);
    const emailInput = screen.getByLabelText(/Email/);
    const roleSelect = screen.getByLabelText(/Rôle/);
    const deptSelect = screen.getByLabelText(/Département/);
    fireEvent.change(nomInput, { target: { value: 'Martin' } });
    fireEvent.change(emailInput, { target: { value: 'm@ex.fr' } });
    fireEvent.change(roleSelect, { target: { value: 'enseignant' } });
    fireEvent.change(deptSelect, { target: { value: 'info' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('appelle onAnnuler quand on clique sur Annuler', () => {
    render(<FormulaireEntite onSubmit={onSubmit} onAnnuler={onAnnuler} />);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onAnnuler).toHaveBeenCalledTimes(1);
  });

  it('desactive le bouton Enregistrer en chargement', () => {
    render(<FormulaireEntite onSubmit={onSubmit} onAnnuler={onAnnuler} chargement />);
    const btn = screen.getByRole('button', { name: 'Chargement : Enregistrer' });
    expect(btn).toHaveAttribute('disabled');
    expect(btn).toBeDisabled();
  });
});
