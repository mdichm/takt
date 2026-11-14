// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import * as publishedContracts from '@takt/contracts';
import * as sourceContracts from '../src/index';

interface CasDeParite {
  nom: string;
  schema: 'zLogin' | 'zTransition' | 'zSeanceCreate';
  charge: Record<string, unknown>;
  chemin: string;
  message: string;
}

const CAS: CasDeParite[] = [
  {
    nom: 'connexion avec un e-mail mal formé',
    schema: 'zLogin',
    charge: { email: 'invalide', motDePasse: 'secret' },
    chemin: 'email',
    message: 'Adresse e-mail invalide',
  },
  {
    nom: 'transition vide',
    schema: 'zTransition',
    charge: { transition: '' },
    chemin: 'transition',
    message: 'La transition est requise',
  },
  {
    nom: 'séance avec un jour invalide',
    schema: 'zSeanceCreate',
    charge: {
      versionId: 'invalide',
      jour: 7,
      creneauDebutId: 'invalide',
      nbCreneaux: 1,
      affectationId: 'invalide',
    },
    chemin: 'versionId',
    message: 'Identifiant UUID invalide',
  },
];

describe('parité de l’entrée source et de l’entrée publiée', () => {
  it.each(CAS)('rejette de façon identique : $nom', ({ schema, charge, chemin, message }) => {
    const resultatSource = sourceContracts[schema].safeParse(charge);
    const resultatPublie = publishedContracts[schema].safeParse(charge);

    expect(resultatSource.success).toBe(false);
    expect(resultatPublie.success).toBe(false);
    if (!resultatSource.success && !resultatPublie.success) {
      const issueSource = resultatSource.error.issues.find((issue) => issue.path[0] === chemin);
      const issuePublie = resultatPublie.error.issues.find((issue) => issue.path[0] === chemin);
      expect(issueSource?.message).toBe(message);
      expect(issuePublie?.message).toBe(message);
      expect(resultatPublie.error.issues.length).toBe(resultatSource.error.issues.length);
    }
  });
});
