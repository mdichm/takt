// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { FormulaireConnexion } from './FormulaireConnexion';

const soumissionReussie = vi.fn();

function renderFormulaire(props?: Partial<Parameters<typeof FormulaireConnexion>[0]>) {
  return render(
    <FormulaireConnexion
      chargement={false}
      surConnexion={soumissionReussie}
      {...props}
    />,
  );
}

beforeEach(() => {
  soumissionReussie.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('FormulaireConnexion (L09-01)', () => {
  it('affiche les champs email, mot de passe et le bouton de connexion', () => {
    renderFormulaire();
    expect(screen.getByLabelText(/adresse e-mail/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
  });

  it('désactive le bouton tant que le formulaire est invalide (FS-FORM-03)', () => {
    renderFormulaire();
    const bouton = screen.getByRole('button', { name: /se connecter/i });
    expect(bouton).toBeDisabled();
  });

  it('active le bouton quand les deux champs sont remplis', () => {
    renderFormulaire();
    fireEvent.change(screen.getByLabelText(/adresse e-mail/i, { selector: 'input' }), {
      target: { value: 'alice@takt.fr' },
    });
    fireEvent.change(screen.getByLabelText(/mot de passe/i, { selector: 'input' }), {
      target: { value: 'motdepasse123' },
    });
    const bouton = screen.getByRole('button', { name: /se connecter/i });
    expect(bouton).not.toBeDisabled();
  });

  it('appelle surConnexion avec les valeurs saisies au submit', async () => {
    renderFormulaire();
    fireEvent.change(screen.getByLabelText(/adresse e-mail/i, { selector: 'input' }), {
      target: { value: 'alice@takt.fr' },
    });
    fireEvent.change(screen.getByLabelText(/mot de passe/i, { selector: 'input' }), {
      target: { value: 'motdepasse123' },
    });
    const bouton = screen.getByRole('button', { name: /se connecter/i });
    await waitFor(() => expect(bouton).not.toBeDisabled());
    const form = document.getElementById('formulaire-connexion')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(soumissionReussie).toHaveBeenCalledWith({
      email: 'alice@takt.fr',
      motDePasse: 'motdepasse123',
    });
  });

  it('affiche l’erreur globale quand fournie', () => {
    renderFormulaire({ erreur: 'Identifiants incorrects.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Identifiants incorrects.');
  });

  it('désactive le bouton quand l’email est invalide (bloque la soumission)', () => {
    renderFormulaire();
    fireEvent.change(screen.getByLabelText(/adresse e-mail/i, { selector: 'input' }), {
      target: { value: 'pas-un-email' },
    });
    fireEvent.change(screen.getByLabelText(/mot de passe/i, { selector: 'input' }), {
      target: { value: 'motdepasse123' },
    });
    const bouton = screen.getByRole('button', { name: /se connecter/i });
    expect(bouton).toBeDisabled();
  });
});
