// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AffectationEditor } from './AffectationEditor';

type ReferentielSimple = { readonly id: string; readonly code: string; readonly libelle: string };

const REF_ENSEIGNANTS: ReferentielSimple[] = [
  { id: 'e1', code: 'E001', libelle: 'Dupont Jean' },
  { id: 'e2', code: 'E002', libelle: 'Martin Marie' },
];
const REF_MATIERES: ReferentielSimple[] = [
  { id: 'm1', code: 'M001', libelle: 'Mathématiques' },
];
const REF_GROUPES: ReferentielSimple[] = [
  { id: 'g1', code: 'G001', libelle: 'L1-G1' },
];
const REF_TYPES: ReferentielSimple[] = [
  { id: 't1', code: 'CM', libelle: 'Cours magistral' },
];

const props = {
  affectation: null,
  enseignants: REF_ENSEIGNANTS,
  matieres: REF_MATIERES,
  groupes: REF_GROUPES,
  typesEnseignement: REF_TYPES,
  surSoumettre: vi.fn(),
  surAnnuler: vi.fn(),
};

describe('AffectationEditor', () => {
  beforeEach(() => {
    cleanup();
    vi.mocked(props.surSoumettre).mockClear();
    vi.mocked(props.surAnnuler).mockClear();
  });

  it('rend le formulaire avec les 4 selects et le volume horaire', () => {
    render(<AffectationEditor {...props} />);
    expect(screen.getByLabelText(/Enseignant/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Matière/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Groupe/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Type d’enseignement/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Volume horaire/)).toBeInTheDocument();
  });

  it('affiche les options des référentiels dans les selects', () => {
    render(<AffectationEditor {...props} />);
    expect(screen.getByText('Dupont Jean')).toBeInTheDocument();
    expect(screen.getByText('Mathématiques')).toBeInTheDocument();
    expect(screen.getByText('L1-G1')).toBeInTheDocument();
    expect(screen.getByText('Cours magistral')).toBeInTheDocument();
  });

  it('bloque la soumission si les champs requis sont vides', async () => {
    render(<AffectationEditor {...props} />);
    const btn = screen.getByRole('button', { name: /ajouter/i });
    fireEvent.click(btn);
    expect(props.surSoumettre).not.toHaveBeenCalled();
  });

  it('appelle surAnnuler quand on clique sur Annuler', () => {
    render(<AffectationEditor {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
    expect(props.surAnnuler).toHaveBeenCalledTimes(1);
  });
});