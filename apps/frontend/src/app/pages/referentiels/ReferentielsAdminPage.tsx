// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useMemo, useState } from 'react';
import { Tabs } from '@/components/molecules/Tabs';
import { ReferentielManager } from '@/components/molecules/ReferentielManager/ReferentielManager';
import { ConfigurationReferentiel } from '@/components/molecules/ReferentielManager/ReferentielManager.types';
import {
  zDepartement,
  zDepartementCreate,
  zDepartementUpdate,
  type Departement,
  zSite,
  zSiteCreate,
  zSiteUpdate,
  type Site,
  zSalle,
  zSalleCreate,
  zSalleUpdate,
  type Salle,
  zTypeEnseignement,
  zTypeEnseignementCreate,
  zTypeEnseignementUpdate,
  type TypeEnseignement,
  zEnseignant,
  zEnseignantCreate,
  zEnseignantUpdate,
  type Enseignant,
} from '@takt/contracts';
import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';

const dictAdmin = traduction('admin') as (typeof DICTIONNAIRE_FR)['admin'];

function configDepartement(): ConfigurationReferentiel<Departement> {
  return {
    cle: 'referentiel-departement',
    libelle: 'Départements',
    endpoint: '/referentiels/departements',
    cleId: 'id',
    colonnes: [
      { cle: 'code', libelle: 'Code', triable: true },
      { cle: 'libelle', libelle: 'Libellé', triable: true },
    ],
    schemaItem: zDepartement,
    schemaCreation: zDepartementCreate,
    schemaModification: zDepartementUpdate,
    champsFormulaire: [
      { cle: 'code', libelle: 'Code', type: 'texte', obligatoire: true },
      { cle: 'libelle', libelle: 'Libellé', type: 'texte', obligatoire: true },
    ],
    libelleSuccesCreation: 'Département créé.',
    libelleSuccesModification: 'Département modifié.',
    libelleSuccesSuppression: 'Département supprimé.',
    suppressionPossible: () => true,
  };
}

function configSite(): ConfigurationReferentiel<Site> {
  return {
    cle: 'referentiel-site',
    libelle: 'Sites',
    endpoint: '/referentiels/sites',
    cleId: 'id',
    colonnes: [
      { cle: 'code', libelle: 'Code', triable: true },
      { cle: 'libelle', libelle: 'Libellé', triable: true },
    ],
    schemaItem: zSite,
    schemaCreation: zSiteCreate,
    schemaModification: zSiteUpdate,
    champsFormulaire: [
      { cle: 'code', libelle: 'Code', type: 'texte', obligatoire: true },
      { cle: 'libelle', libelle: 'Libellé', type: 'texte', obligatoire: true },
    ],
    libelleSuccesCreation: 'Site créé.',
    libelleSuccesModification: 'Site modifié.',
    libelleSuccesSuppression: 'Site supprimé.',
    suppressionPossible: () => true,
  };
}
function configSalle(): ConfigurationReferentiel<Salle> {
  return {
    cle: 'referentiel-salle',
    libelle: 'Salles',
    endpoint: '/referentiels/salles',
    cleId: 'id',
    colonnes: [
      { cle: 'code', libelle: 'Code', triable: true },
      { cle: 'libelle', libelle: 'Libellé', triable: true },
      { cle: 'capacite', libelle: 'Capacité', triable: false, alignement: 'centre' },
    ],
    schemaItem: zSalle,
    schemaCreation: zSalleCreate,
    schemaModification: zSalleUpdate,
    champsFormulaire: [
      { cle: 'code', libelle: 'Code', type: 'texte', obligatoire: true },
      { cle: 'libelle', libelle: 'Libellé', type: 'texte', obligatoire: true },
      { cle: 'capacite', libelle: 'Capacité', type: 'nombre', obligatoire: true },
    ],
    libelleSuccesCreation: 'Salle créée.',
    libelleSuccesModification: 'Salle modifiée.',
    libelleSuccesSuppression: 'Salle supprimée.',
    suppressionPossible: () => true,
  };
}

function configTypeEnseignement(): ConfigurationReferentiel<TypeEnseignement> {
  return {
    cle: 'referentiel-type-enseignement',
    libelle: 'Types d’enseignement',
    endpoint: '/referentiels/types-enseignement',
    cleId: 'id',
    colonnes: [
      { cle: 'code', libelle: 'Code', triable: true },
      { cle: 'libelle', libelle: 'Libellé', triable: true },
      { cle: 'couleur', libelle: 'Couleur', triable: false, alignement: 'centre' },
    ],
    schemaItem: zTypeEnseignement,
    schemaCreation: zTypeEnseignementCreate,
    schemaModification: zTypeEnseignementUpdate,
    champsFormulaire: [
      { cle: 'code', libelle: 'Code', type: 'texte', obligatoire: true },
      { cle: 'libelle', libelle: 'Libellé', type: 'texte', obligatoire: true },
      { cle: 'couleur', libelle: 'Couleur', type: 'couleur', obligatoire: true },
    ],
    libelleSuccesCreation: 'Type d’enseignement créé.',
    libelleSuccesModification: 'Type d’enseignement modifié.',
    libelleSuccesSuppression: 'Type d’enseignement supprimé.',
    suppressionPossible: () => true,
  };
}

function configEnseignant(): ConfigurationReferentiel<Enseignant> {
  return {
    cle: 'referentiel-enseignant',
    libelle: 'Enseignants',
    endpoint: '/referentiels/enseignants',
    cleId: 'id',
    colonnes: [
      { cle: 'nom', libelle: 'Nom', triable: true },
      { cle: 'prenom', libelle: 'Prénom', triable: true },
      { cle: 'email', libelle: 'E-mail', triable: false },
    ],
    schemaItem: zEnseignant,
    schemaCreation: zEnseignantCreate,
    schemaModification: zEnseignantUpdate,
    champsFormulaire: [
      { cle: 'nom', libelle: 'Nom', type: 'texte', obligatoire: true },
      { cle: 'prenom', libelle: 'Prénom', type: 'texte', obligatoire: true },
      { cle: 'email', libelle: 'E-mail', type: 'texte', obligatoire: true },
    ],
    libelleSuccesCreation: 'Enseignant créé.',
    libelleSuccesModification: 'Enseignant modifié.',
    libelleSuccesSuppression: 'Enseignant supprimé.',
    suppressionPossible: () => true,
  };
}

export default function ReferentielsAdminPage(): JSX.Element {
  const [ongletActif, setOngletActif] = useState('departement');

  const onglets = [
    { id: 'departement', libelle: 'Départements' },
    { id: 'site', libelle: 'Sites' },
    { id: 'salle', libelle: 'Salles' },
    { id: 'type-enseignement', libelle: 'Types d’enseignement' },
    { id: 'enseignant', libelle: 'Enseignants' },
  ];

  const configs = useMemo(
    () => ({
      departement: configDepartement(),
      site: configSite(),
      salle: configSalle(),
      'type-enseignement': configTypeEnseignement(),
      enseignant: configEnseignant(),
    }),
    [],
  );

  const panels = [
    <ReferentielManager key="departement" configuration={configs.departement} />,
    <ReferentielManager key="site" configuration={configs.site} />,
    <ReferentielManager key="salle" configuration={configs.salle} />,
    <ReferentielManager key="type-enseignement" configuration={configs['type-enseignement']} />,
    <ReferentielManager key="enseignant" configuration={configs.enseignant} />,
  ];

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)' }}>
        <h1 style={{ fontSize: 'var(--font-size-h1)', margin: 0 }}>{dictAdmin.titre}</h1>
        <h2 style={{ fontSize: 'var(--font-size-h2)', margin: 0, opacity: 0.8 }}>{dictAdmin.referentiels.titre}</h2>
      </header>
      <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{dictAdmin.referentiels.sousTitre}</p>
      <Tabs onglets={onglets} valeur={ongletActif} onChange={setOngletActif} panels={panels} />
    </section>
  );
}

