// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { DataTable } from './DataTable';
import { ColonneDataTable } from './DataTable.types';

interface Utilisateur {
  readonly id: string;
  readonly nom: string;
  readonly email: string;
}

const utilisateurs: readonly Utilisateur[] = [
  { id: '1', nom: 'Alice', email: 'alice@takt.fr' },
  { id: '2', nom: 'Bob', email: 'bob@takt.fr' },
];

const colonnes: readonly ColonneDataTable<Utilisateur>[] = [
  { cle: 'nom', libelle: 'Nom', triable: true },
  { cle: 'email', libelle: 'Email' },
];

describe('DataTable — accessibilité', () => {
  it('ne produit aucune violation axe avec des donnees', async () => {
    const { container } = render(
      <DataTable<Utilisateur> colonnes={colonnes} donnees={utilisateurs} etat="succès" />,
    );
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });

  it('ne produit aucune violation axe en etat vide', async () => {
    const { container } = render(
      <DataTable<Utilisateur> colonnes={colonnes} donnees={[]} etat="succès" />,
    );
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });

  it('ne produit aucune violation axe en etat erreur', async () => {
    const { container } = render(
      <DataTable<Utilisateur>
        colonnes={colonnes}
        donnees={[]}
        etat="erreur"
        messageErreur="Indisponible"
        surReessayer={() => {}}
      />,
    );
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });
});
