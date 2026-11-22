// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useMemo } from 'react';
import { ReferentielManager } from '@/components/molecules/ReferentielManager/ReferentielManager';
import { ConfigurationReferentiel } from '@/components/molecules/ReferentielManager/ReferentielManager.types';
import { ColonneDataTable } from '@/components/molecules/DataTable/DataTable.types';
import {
  zUtilisateurAdmin,
  zUtilisateurAdminCreate,
  zUtilisateurAdminUpdate,
  type UtilisateurAdmin,
} from '@takt/contracts';
import { FormulaireUtilisateur } from './FormulaireUtilisateur';
import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';

const dictAdmin = traduction('admin') as (typeof DICTIONNAIRE_FR)['admin'];
const dictUtilisateurs = dictAdmin.utilisateurs;

export default function UsersAdminPage(): JSX.Element {
  const colonnes: readonly ColonneDataTable<UtilisateurAdmin>[] = useMemo(
    () => [
      { cle: 'email', libelle: dictUtilisateurs.champ.email, triable: true },
      { cle: 'nom', libelle: dictUtilisateurs.champ.nom, triable: true },
      { cle: 'prenom', libelle: dictUtilisateurs.champ.prenom, triable: true },
      {
        cle: 'roleId',
        libelle: dictUtilisateurs.champ.role,
        triable: false,
        acceseur: (item) => String(item.roleId),
      },
      {
        cle: 'departementId',
        libelle: dictUtilisateurs.champ.departement,
        triable: false,
        acceseur: (item) => String(item.departementId ?? '—'),
      },
      {
        cle: 'estActif',
        libelle: dictUtilisateurs.champ.estActif,
        triable: false,
        acceseur: (item) =>
          item.estActif ? dictAdmin.libelle.actif : dictAdmin.libelle.inactif,
        alignement: 'centre',
      },
    ],
    [dictAdmin, dictUtilisateurs],
  );

  const configuration: ConfigurationReferentiel<UtilisateurAdmin> = {
    cle: 'utilisateurs-admin',
    libelle: dictUtilisateurs.titre,
    endpoint: '/users',
    cleId: 'id',
    colonnes,
    schemaItem: zUtilisateurAdmin,
    schemaCreation: zUtilisateurAdminCreate,
    schemaModification: zUtilisateurAdminUpdate,
    composantFormulaire: FormulaireUtilisateur,
    surReactivation: () => void 0,
    suppressionPossible: (item) => item.estActif !== false,
    libelleSuccesCreation: dictUtilisateurs.message.creationSucces,
    libelleSuccesModification: dictUtilisateurs.message.modificationSucces,
    libelleSuccesSuppression: dictUtilisateurs.message.desactivationSucces,
    messageVide: 'Aucun utilisateur.',
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)' }}>
        <h1 style={{ fontSize: 'var(--font-size-h1)', margin: 0 }}>{dictAdmin.titre}</h1>
        <h2 style={{ fontSize: 'var(--font-size-h2)', margin: 0, opacity: 0.8 }}>{dictUtilisateurs.titre}</h2>
      </header>
      <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{dictUtilisateurs.sousTitre}</p>
      <ReferentielManager<UtilisateurAdmin> configuration={configuration} />
    </section>
  );
}
