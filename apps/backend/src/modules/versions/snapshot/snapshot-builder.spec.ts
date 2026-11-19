// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { creerHashSHA256 } from '../../common/crypto/hash';
import {
  construireDonneesSnapshot,
} from './snapshot-builder';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any-justify: mock de test, champs partiels des modèles Prisma
function entreeMinimale(overrides: Record<string, any> = {}): any {
  return {
    versionId: '11111111-1111-1111-1111-111111111111',
    semestre: {
      id: '22222222-2222-2222-2222-222222222222',
      numero: 1,
      dateDebut: new Date('2024-09-01T00:00:00Z'),
      dateFin: new Date('2025-01-31T00:00:00Z'),
      anneeUniversitaireId: '33333333-3333-3333-3333-333333333333',
    },
    affectations: [],
    seances: [],
    verrous: [],
    contraintes: [],
    groupes: [],
    enseignants: [],
    salles: [],
    creneaux: [],
    departements: [],
    matieres: [],
    ...overrides,
  };
}

describe('construireDonneesSnapshot (TAKT-L06-10, EX-PRI-06)', () => {
  it('produit un payload déterministe avec toutes les familles de données', () => {
    const entrees = entreeMinimale({
      groupes: [
        { id: 'g1', code: 'L3-INFO', libelle: 'Licence 3 Informatique', niveauId: 'n1' },
        { id: 'g2', code: 'M1-INFO', libelle: 'Master 1 Informatique', niveauId: 'n2' },
      ],
      enseignants: [
        { id: 'e1', nom: 'Dupont', prenom: 'Jean', email: 'jean.dupont@example.com', departementId: 'd1' },
      ],
      salles: [
        { id: 's1', code: 'A101', libelle: 'Amphi A101', typeSalleId: 'ts1', siteId: 'site1', capacite: 100 },
      ],
      creneaux: [
        { id: 'c1', jour: 1, ordre: 1, heureDebut: new Date('2024-09-02T08:00:00Z'), heureFin: new Date('2024-09-02T09:00:00Z'), dureeMinutes: 60 },
      ],
      departements: [{ id: 'd1', code: 'INFO', libelle: 'Informatique' }],
    });

    const donnees = construireDonneesSnapshot(entrees);

    expect(donnees).toHaveProperty('type', 'VERSION');
    expect(donnees).toHaveProperty('versionId');
    expect(donnees).toHaveProperty('semestre');
    expect(donnees).toHaveProperty('activites');
    expect(donnees).toHaveProperty('groupes');
    expect(donnees).toHaveProperty('enseignants');
    expect(donnees).toHaveProperty('salles');
    expect(donnees).toHaveProperty('creneaux');
    expect(donnees).toHaveProperty('seances');
    expect(donnees).toHaveProperty('contraintes');
    expect(donnees).toHaveProperty('verrous');
    expect(donnees).toHaveProperty('departements');
    expect(donnees).toHaveProperty('matieres');
    expect(donnees).toHaveProperty('preferences');
    expect(donnees).toHaveProperty('profilGeneration');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any-justify: payload de test typé unknown, cast nécessaire pour assertions
    expect((donnees as any).groupes).toHaveLength(2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any-justify: payload de test typé unknown, cast nécessaire pour assertions
    expect((donnees as any).enseignants).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any-justify: payload de test typé unknown, cast nécessaire pour assertions
    expect((donnees as any).salles).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any-justify: payload de test typé unknown, cast nécessaire pour assertions
    expect((donnees as any).creneaux).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any-justify: payload de test typé unknown, cast nécessaire pour assertions
    expect((donnees as any).departements).toHaveLength(1);
  });

  it('est déterministe : même entrée ⇒ même hash', () => {
    const entrees = entreeMinimale({
      groupes: [{ id: 'g1', code: 'L3', libelle: 'Licence 3', niveauId: 'n1' }],
      enseignants: [{ id: 'e1', nom: 'Nom', prenom: 'Prenom', email: 'a@b.c', departementId: null }],
    });

    const h1 = creerHashSHA256(construireDonneesSnapshot(entrees));
    const h2 = creerHashSHA256(construireDonneesSnapshot(entrees));

    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('n\'contient aucun horodatage (createdAt/updatedAt) dans le payload', () => {
    const entrees = entreeMinimale();
    const donnees = construireDonneesSnapshot(entrees);
    const json = JSON.stringify(donnees);

    // Le payload ne doit pas contenir de `createdAt` ni `updatedAt` car
    // l'horodatage est stocké uniquement dans la colonne Snapshot.createdAt
    expect(json).not.toContain('createdAt');
    expect(json).not.toContain('updatedAt');
  });

  it('préserve l’ordre des tableaux (tri appliqué par l\'appelant via Prisma `orderBy`)', () => {
    const entrees = entreeMinimale({
      groupes: [
        { id: 'g1', code: 'A', libelle: 'A', niveauId: 'n1' },
        { id: 'g2', code: 'B', libelle: 'B', niveauId: 'n1' },
      ],
    });
    const donnees = construireDonneesSnapshot(entrees);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any-justify: payload de test typé unknown, cast nécessaire pour assertions
    const ids = (donnees as any).groupes.map((g: any) => g.id);
    expect(ids).toEqual(['g1', 'g2']);
  });

  it('gère des collections vides sans erreur', () => {
    const donnees = construireDonneesSnapshot(entreeMinimale());
    expect(donnees).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any-justify: payload de test typé unknown, cast nécessaire pour assertions
    expect((donnees as any).groupes).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any-justify: payload de test typé unknown, cast nécessaire pour assertions
    expect((donnees as any).seances).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any-justify: payload de test typé unknown, cast nécessaire pour assertions
    expect((donnees as any).seances).toEqual([]);
  });

  it('applique les enrichissements optionnels (TAKT-L07-01)', () => {
    const entrees = entreeMinimale({
      groupes: [
        { id: 'g1', code: 'L3', libelle: 'Licence 3', niveauId: 'n1' },
      ],
      enseignants: [
        {
          id: 'e1',
          nom: 'Nom',
          prenom: 'Prenom',
          email: 'a@b.c',
          departementId: null,
          departementIds: ['d1'],
          chargeMaxHebdo: 19,
        },
      ],
      salles: [
        {
          id: 's1',
          code: 'A101',
          libelle: 'Amphi A101',
          typeSalleId: 'ts1',
          siteId: 'site1',
          capacite: 100,
          typeSalleCode: 'CM',
          siteCode: 'SITE-A',
          siteLibelle: 'Site A',
          equipements: ['projecteur', 'tableau'],
        },
      ],
      affectations: [
        {
          id: 'a1',
          enseignantId: 'e1',
          matiereId: 'm1',
          groupeId: 'g1',
          typeEnseignementId: 'te1',
          typeEnseignementCode: 'CM',
          volumeHebdo: 2,
          dureeCreneaux: 90,
        },
      ],
      matieres: [
        { id: 'm1', code: 'ALGO', libelle: 'Algorithmique' },
      ],
    });

    const donnees = construireDonneesSnapshot(entrees);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any-justify: payload de test typé unknown, cast nécessaire pour assertions
    const d = donnees as any;

    // effectif par défaut = 1
    expect(d.groupes[0].effectif).toBe(1);
    // départements + charge de l'enseignant
    expect(d.enseignants[0].departementIds).toEqual(['d1']);
    expect(d.enseignants[0].chargeMaxHebdo).toBe(19);
    // salle enrichie : code type, site, équipements triés
    expect(d.salles[0].typeSalleCode).toBe('CM');
    expect(d.salles[0].siteCode).toBe('SITE-A');
    expect(d.salles[0].siteLibelle).toBe('Site A');
    expect(d.salles[0].equipements).toEqual(['projecteur', 'tableau']);
    // activité avec code type enseignement
    expect(d.activites[0].typeEnseignementCode).toBe('CM');
    // collection matieres présente
    expect(d.matieres).toHaveLength(1);
    expect(d.matieres[0].code).toBe('ALGO');
  });
});
