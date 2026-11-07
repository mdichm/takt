// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from './DataTable';
import { ColonneDataTable } from './DataTable.types';

interface Utilisateur {
  readonly id: string;
  readonly nom: string;
  readonly email: string;
  readonly role: string;
}

const utilisateurs: readonly Utilisateur[] = [
  { id: '1', nom: 'Alice', email: 'alice@takt.fr', role: 'enseignant' },
  { id: '2', nom: 'Bob', email: 'bob@takt.fr', role: 'gestionnaire' },
  { id: '3', nom: 'Carole', email: 'carole@takt.fr', role: 'enseignant' },
];

const colonnes: readonly ColonneDataTable<Utilisateur>[] = [
  { cle: 'nom', libelle: 'Nom', triable: true },
  { cle: 'email', libelle: 'Email', triable: false },
  { cle: 'role', libelle: 'Rôle', triable: true, alignement: 'centre' },
];

function Renderer(props: Partial<React.ComponentProps<typeof DataTable<Utilisateur>>> = {}) {
  return (
    <DataTable<Utilisateur>
      colonnes={colonnes}
      donnees={utilisateurs}
      etat="succès"
      meta={{ page: 1, pageSize: 20, total: 3 }}
      {...props}
    />
  );
}

describe('DataTable', () => {
  it('rend un tableau role grid avec une ligne par donnée', () => {
    render(<Renderer />);
    const table = screen.getByRole('grid');
    expect(table).toBeInTheDocument();
    expect(table).toHaveAttribute('aria-rowcount', '3');
    expect(screen.getAllByRole('row')).toHaveLength(4); // en-tête + 3 lignes
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carole')).toBeInTheDocument();
  });

  it('rend les cellules avec les bonnes colonnes', () => {
    render(<Renderer />);
    expect(screen.getByText('alice@takt.fr')).toBeInTheDocument();
    expect(screen.getAllByText('enseignant')).toHaveLength(2);
    expect(screen.getByText('gestionnaire')).toBeInTheDocument();
  });

  it('affiche l etat chargement', () => {
    const { rerender } = render(<Renderer etat="chargement" donnees={[]} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<Renderer etat="succès" donnees={utilisateurs} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('affiche l etat erreur avec role alert et message', () => {
    render(<Renderer etat="erreur" donnees={[]} messageErreur="Indisponible" surReessayer={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Indisponible')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });

  it('affiche l etat vide quand aucune donnee', () => {
    render(<Renderer etat="succès" donnees={[]} libelleVide="Aucun utilisateur" />);
    expect(screen.getByText('Aucun utilisateur')).toBeInTheDocument();
  });

  it('affiche le message de succes non bloquant', () => {
    render(<Renderer messageSucces="Utilisateur créé." />);
    expect(screen.getByRole('alert', { name: /Succès: Utilisateur créé\./ })).toBeInTheDocument();
  });

  it('cycle le tri ascendant puis descendant puis supprime le tri', () => {
    const surTri = vi.fn();
    render(<Renderer surTri={surTri} />);
    const boutonTriNom = () => screen.getAllByRole('button', { name: /^Trier par Nom/ })[0]!;
    fireEvent.click(boutonTriNom());
    expect(surTri).toHaveBeenLastCalledWith('nom', 'asc');
    fireEvent.click(boutonTriNom());
    expect(surTri).toHaveBeenLastCalledWith('nom', 'desc');
    fireEvent.click(boutonTriNom());
    expect(surTri).toHaveBeenLastCalledWith('nom', null);
  });

  it('ne propose pas de tri sur les colonnes non triables', () => {
    render(<Renderer />);
    expect(screen.queryByRole('button', { name: 'Trier par Email' })).not.toBeInTheDocument();
  });

  it('appelle surChangementPage quand on change de page', () => {
    const surChangementPage = vi.fn();
    render(<Renderer meta={{ page: 1, pageSize: 20, total: 45 }} surChangementPage={surChangementPage} />);
    fireEvent.click(screen.getByRole('button', { name: 'Suivante' }));
    expect(surChangementPage).toHaveBeenCalledWith(2);
  });

  it('affiche la pagination avec le total des elements', () => {
    render(<Renderer meta={{ page: 1, pageSize: 20, total: 45 }} />);
    expect(screen.getByText(/Page 1 sur 3 \(45 éléments\)/)).toBeInTheDocument();
  });

  it('filtre localement quand filtrerLocalement est active', () => {
    render(<Renderer filtrerLocalement surRecherche={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Rechercher…'), { target: { value: 'Bob' } });
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.queryByText('Carole')).not.toBeInTheDocument();
  });

  it('rend les cellules d actions quand la fonction actions est fournie', () => {
    const actions = vi.fn((item: Utilisateur) => <button key={item.id} type="button" name={`modifier-${item.id}`}>Modifier</button>);
    render(<Renderer actions={actions} />);
    expect(screen.getAllByRole('button', { name: 'Modifier' })).toHaveLength(3);
    expect(actions).toHaveBeenCalledTimes(3);
  });
});
