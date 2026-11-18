// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { genererCandidats, filtrerSallesLibres } from '../src/simulation/candidats';
import type { ContexteSimulation } from '../src/simulation/types';

const creneauxJour1 = [
  { id: 'c-1', jour: 1, ordre: 1, heureDebut: '08:00', dureeMinutes: 60 },
  { id: 'c-2', jour: 1, ordre: 2, heureDebut: '09:00', dureeMinutes: 60 },
  { id: 'c-3', jour: 1, ordre: 3, heureDebut: '10:00', dureeMinutes: 60 },
  { id: 'c-4', jour: 1, ordre: 4, heureDebut: '11:00', dureeMinutes: 60 },
];

const salles = [
  { id: 'salle-101', capacite: 30 },
  { id: 'salle-102', capacite: 40 },
];

const seancesOccupees = [
  { id: 's-occ', jour: 1, creneauDebutId: 'c-2', salleId: 'salle-101', nbCreneaux: 1 },
];

const creneauxOrdonnees = creneauxJour1.map((c) => c.id);

const contexteBase: ContexteSimulation = {
  creneaux: creneauxJour1,
  creneauxOrdonnees,
  salles,
  seancesOccupees,
  enseignantId: 'ens-1',
  groupeId: 'groupe-1',
  salleIdOriginale: 'salle-101',
};

describe('genererCandidats', () => {
  it('génère tous les créneaux consécutifs du même jour × salles', () => {
    const candidats = genererCandidats({
      contexte: contexteBase,
      nbCreneaux: 1,
    });
    // 4 créneaux × 2 salles = 8 candidats
    expect(candidats).toHaveLength(8);
  });

  it('réspecte nbCreneaux (créneaux consécutifs)', () => {
    const candidats = genererCandidats({
      contexte: contexteBase,
      nbCreneaux: 2,
    });
    // créneaux (c-1,c-2), (c-2,c-3), (c-3,c-4) × 2 salles = 6
    expect(candidats).toHaveLength(6);
  });

  it('retourne une liste vide si nbCreneaux dépasse le nombre de créneaux du jour', () => {
    const candidats = genererCandidats({
      contexte: contexteBase,
      nbCreneaux: 5,
    });
    expect(candidats).toHaveLength(0);
  });

  it('filtre par creneauDebutId cible', () => {
    const candidats = genererCandidats({
      contexte: contexteBase,
      nbCreneaux: 1,
      cibleCreneauDebutId: 'c-3',
    });
    expect(candidats).toHaveLength(2);
    expect(candidats.every((c) => c.creneauDebutId === 'c-3')).toBe(true);
  });

  it('filtre par salleId cible', () => {
    const candidats = genererCandidats({
      contexte: contexteBase,
      nbCreneaux: 1,
      cibleSalleId: 'salle-102',
    });
    expect(candidats).toHaveLength(4);
    expect(candidats.every((c) => c.salleId === 'salle-102')).toBe(true);
  });

  it('utilise la salle originale comme salleId par défaut quand aucune cible', () => {
    const candidats = genererCandidats({
      contexte: contexteBase,
      nbCreneaux: 1,
    });
    expect(candidats.every((c) => c.salleId !== undefined)).toBe(true);
  });

  it('ne génère rien quand cibleCreneauDebutId est en fin de liste sans créneaux consécutifs suffisants', () => {
    const candidats = genererCandidats({
      contexte: contexteBase,
      nbCreneaux: 2,
      cibleCreneauDebutId: 'c-4', // pas de c-5 consécutif
    });
    expect(candidats).toHaveLength(0);
  });

  it('ne génère rien quand cibleSalleId est inconnu', () => {
    const candidats = genererCandidats({
      contexte: contexteBase,
      nbCreneaux: 1,
      cibleSalleId: 'salle-inexistante',
    });
    expect(candidats).toHaveLength(0);
  });
});

describe('filtrerSallesLibres', () => {
  it('retourne une liste vide si le créneau de début est inconnu', () => {
    const libres = filtrerSallesLibres(
      'c-inexistant', 1, salles, seancesOccupees, creneauxOrdonnees,
    );
    expect(libres).toEqual([]);
  });

  it('ne filtre pas une séance occupée sans salleId', () => {
    const occSansSalle = [
      { id: 's-occ2', jour: 1, creneauDebutId: 'c-2', salleId: null, nbCreneaux: 1 },
    ];
    const libres = filtrerSallesLibres(
      'c-2', 1, salles, occSansSalle, creneauxOrdonnees,
    );
    expect(libres).toEqual(['salle-101', 'salle-102']);
  });
  it('exclut les salles déjà occupées sur un créneau chevauchant', () => {
    const libres = filtrerSallesLibres(
      'c-2', 1, salles, seancesOccupees, creneauxOrdonnees,
    );
    // salle-101 occupée à c-2 → exclue ; salle-102 libre
    expect(libres).toEqual(['salle-102']);
  });

  it('retourne toutes les salles si aucune occupée', () => {
    const libres = filtrerSallesLibres(
      'c-2', 1, salles, [], creneauxOrdonnees,
    );
    expect(libres).toEqual(['salle-101', 'salle-102']);
  });

  it('gère nbCreneaux > 1 sur créneaux chevauchants', () => {
    const libres = filtrerSallesLibres(
      'c-1', 2, salles, seancesOccupees, creneauxOrdonnees,
    );
    // occupation c-2 → un candidat sur c-1 (nbCreneaux=2, occupe c-1 et c-2) chevauche
    expect(libres).toEqual(['salle-102']);
  });
});

describe('genererCandidats (cas limites)', () => {
  const contexteAvecTrou = {
    ...contexteBase,
    creneaux: creneauxJour1.filter((c) => c.id !== 'c-3'), // c-3 retiré de la liste
    creneauxOrdonnees: ['c-1', 'c-2', 'c-3', 'c-4'], // mais c-3 reste dans l'ordre
  };

  it('ignore un créneau de l\'ordre absent de la liste des créneaux', () => {
    const candidats = genererCandidats({
      contexte: contexteAvecTrou,
      nbCreneaux: 1,
    });
    // c-3 est dans creneauxOrdonnees mais pas dans creneaux → ignoré
    const ids = candidats.map((c) => c.creneauDebutId);
    expect(ids).not.toContain('c-3');
  });

  it('ignore un créneau suivant absent de la liste des créneaux (jour différent)', () => {
    const ctx = {
      ...contexteBase,
      creneaux: [
        { id: 'c-1', jour: 1, ordre: 1, heureDebut: '08:00', dureeMinutes: 60 },
        { id: 'c-2', jour: 2, ordre: 1, heureDebut: '08:00', dureeMinutes: 60 }, // jour 2
      ],
      creneauxOrdonnees: ['c-1', 'c-2'],
    };
    const candidats = genererCandidats({ contexte: ctx, nbCreneaux: 2 });
    // c-1 suivi de c-2 (jour différent) → invalide
    expect(candidats).toHaveLength(0);
  });
});

describe('filtrerSallesLibres (cas limites)', () => {
  it('ne filtre pas une séance occupée sur un créneau inconnu', () => {
    const occCreneauInconnu = [
      { id: 's-occ3', jour: 1, creneauDebutId: 'c-inexistant', salleId: 'salle-101', nbCreneaux: 1 },
    ];
    const libres = filtrerSallesLibres(
      'c-2', 1, salles, occCreneauInconnu, creneauxOrdonnees,
    );
    expect(libres).toEqual(['salle-101', 'salle-102']);
  });

  it('ne filtre pas une séance occupée sans jour', () => {
    const occSansJour = [
      // @ts-expect-error: jour optionnel pour ce test de branche
      { id: 's-occ4', creneauDebutId: 'c-2', salleId: 'salle-101', nbCreneaux: 1 },
    ];
    const libres = filtrerSallesLibres(
      'c-2', 1, salles, occSansJour, creneauxOrdonnees,
    );
    expect(libres).toEqual(['salle-101', 'salle-102']);
  });
});
