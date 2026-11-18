// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { buildDerivedFile, type DerivedFileOptions } from './derived-file-builder';
import { zDerivedFile } from '@takt/contracts';

const OPTIONS: DerivedFileOptions = {
  generationId: '11111111-1111-1111-1111-111111111111',
  createdAt: '2026-11-15T10:00:00Z',
};

function snapshotMinimal(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    versionId: '22222222-2222-2222-2222-222222222222',
    semestre: { numero: 1 },
    activites: [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        matiereId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        enseignantId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        groupeId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        typeEnseignementCode: 'CM',
        volumeHebdo: 2,
        dureeCreneaux: 90,
      },
    ],
    groupes: [{ id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', code: 'L3', effectif: 30, departementId: 'dddddddd-dddd-dddd-dddd-dddddddddddd' }],
    enseignants: [
      { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', matricule: 'DUPONT', departementIds: ['dddddddd-dddd-dddd-dddd-dddddddddddd'], chargeMaxHebdo: 19 },
    ],
    salles: [
      {
        id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        code: 'A101',
        typeSalleCode: 'CM',
        capacite: 100,
        siteLibelle: 'Site A',
        equipements: ['tableau', 'projecteur'],
      },
    ],
    creneaux: [
      { id: 'c1', heureDebut: '2026-09-01T08:00:00Z' },
      { id: 'c2', heureDebut: '2026-09-01T08:30:00Z' },
    ],
    seances: [
      { id: 'se1', affectationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', creneauDebutId: 'c1', nbCreneaux: 3 },
    ],
    contraintes: [],
    verrous: [],
    ...overrides,
  };
}

describe('buildDerivedFile (TAKT-L07-01)', () => {
  it('produit un fichier DerivedFile valide selon le schéma Zod', () => {
    const { fichier } = buildDerivedFile(snapshotMinimal(), OPTIONS);
    expect(() => zDerivedFile.parse(fichier)).not.toThrow();
    expect(fichier.metadata.generationId).toBe(OPTIONS.generationId);
    expect(fichier.metadata.timeSlotMinutes).toBe(30);
    expect(fichier.metadata.days).toBe(6);
    expect(fichier.metadata.slotsPerDay).toBe(24);
    expect(fichier.rooms).toHaveLength(1);
    expect(fichier.teachers).toHaveLength(1);
    expect(fichier.groups).toHaveLength(1);
    expect(fichier.activities).toHaveLength(1);
  });

  it('normalise le type de salle (CM → AMPHI, TD → TD, TP → TP)', () => {
    const { fichier } = buildDerivedFile(
      snapshotMinimal({
        salles: [
          { id: '11111111-1111-1111-1111-111111111111', code: 'A101', typeSalleCode: 'CM', capacite: 100, siteLibelle: 'A', equipements: [] },
          { id: '22222222-2222-2222-2222-222222222222', code: 'B201', typeSalleCode: 'TD', capacite: 30, siteLibelle: 'B', equipements: [] },
          { id: '33333333-3333-3333-3333-333333333333', code: 'C301', typeSalleCode: 'TP', capacite: 20, siteLibelle: 'C', equipements: [] },
          { id: '44444444-4444-4444-4444-444444444444', code: 'D401', typeSalleCode: null, capacite: 10, siteLibelle: 'D', equipements: [] },
        ],
      }),
      OPTIONS,
    );
    expect(fichier.rooms[0]!.type).toBe('AMPHI');
    expect(fichier.rooms[1]!.type).toBe('TD');
    expect(fichier.rooms[2]!.type).toBe('TP');
    expect(fichier.rooms[3]!.type).toBe('TD'); // fallback inconnu → TD
  });

  it('donne un effectif par défaut de 1 aux groupes (dette TAKT-L07-01)', () => {
    const { fichier } = buildDerivedFile(
      snapshotMinimal({
        groupes: [
          { id: '55555555-5555-5555-5555-555555555555', code: 'L3', effectif: 30, departementId: 'dddddddd-dddd-dddd-dddd-dddddddddddd' },
          { id: '66666666-6666-6666-6666-666666666666', code: 'L4' }, // sans effectif ni departementId
        ],
      }),
      OPTIONS,
    );
    expect(fichier.groups[0]!.size).toBe(30);
    expect(fichier.groups[1]!.size).toBe(1); // défaut
  });

  it('mappe les verrous en locks avec poids', () => {
    const { fichier } = buildDerivedFile(
      snapshotMinimal({
        verrous: [
          {
            id: '77777777-7777-7777-7777-777777777777',
            seanceId: 'se1',
            type: 'CRENEAU',
            valeur: '2026-09-01T08:00:00Z',
            poids: 100,
          },
          {
            id: '88888888-8888-8888-8888-888888888888',
            seanceId: 'se1',
            type: 'SALLE',
            valeur: 's1',
            poids: 100,
          },
        ],
      }),
      OPTIONS,
    );
    expect(fichier.locks).toHaveLength(2);
    expect(fichier.locks[0]!.lockType).toBe('TIMESLOT');
    expect(fichier.locks[0]!.poids).toBe(100);
    expect(fichier.locks[1]!.lockType).toBe('ROOM');
    expect(fichier.locks[1]!.activityId).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'); // résolu via seance → affectation
  });

  it('une contrainte INDISPONIBILITE est transcodée en UNAVAILABILITY HARD 100', () => {
    const { fichier } = buildDerivedFile(
      snapshotMinimal({
        contraintes: [
          { id: '11111111-1111-1111-1111-111111111111', type: 'INDISPONIBILITE', cibleId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', valeur: '{"day":2,"slots":[0,1,2,3]}' },
        ],
      }),
      OPTIONS,
    );
    const indispo = fichier.constraints.find((c) => c.id === '11111111-1111-1111-1111-111111111111');
    expect(indispo).toBeDefined();
    expect(indispo!.type).toBe('UNAVAILABILITY');
    expect(indispo!.category).toBe('HARD');
    expect(indispo!.weight).toBe(100);
    expect(indispo!.scope).toBe('TEACHER');
  });

  it('une contrainte EXIGENCE_SALLE est transcodée en ROOM_REQUIREMENT HARD 100', () => {
    const { fichier } = buildDerivedFile(
      snapshotMinimal({
        contraintes: [{ id: '22222222-2222-2222-2222-222222222222', type: 'EXIGENCE_SALLE', cibleId: 'ffffffff-ffff-ffff-ffff-ffffffffffff', valeur: '{"type":"AMPHI"}' }],
      }),
      OPTIONS,
    );
    const req = fichier.constraints.find((c) => c.id === '22222222-2222-2222-2222-222222222222');
    expect(req!.type).toBe('ROOM_REQUIREMENT');
    expect(req!.category).toBe('HARD');
    expect(req!.weight).toBe(100);
  });

  it('une contrainte PREFERENCE_CRENEAU est transcodée en TEACHER_PREFERENCE SOFT 30', () => {
    const { fichier } = buildDerivedFile(
      snapshotMinimal({
        contraintes: [{ id: '33333333-3333-3333-3333-333333333333', type: 'PREFERENCE_CRENEAU', cibleId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', valeur: '{"jour":1}' }],
      }),
      OPTIONS,
    );
    const pref = fichier.constraints.find((c) => c.id === '33333333-3333-3333-3333-333333333333');
    expect(pref!.type).toBe('TEACHER_PREFERENCE');
    expect(pref!.category).toBe('SOFT');
    expect(pref!.weight).toBe(30);
  });

  it('une contrainte CHARGE_MAX_JOUR est transcodée en MAX_HOURS_PER_DAY SOFT 50', () => {
    const { fichier } = buildDerivedFile(
      snapshotMinimal({
        contraintes: [{ id: '44444444-4444-4444-4444-444444444444', type: 'CHARGE_MAX_JOUR', cibleId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', valeur: '{"heures":6}' }],
      }),
      OPTIONS,
    );
    const load = fichier.constraints.find((c) => c.id === '44444444-4444-4444-4444-444444444444');
    expect(load!.type).toBe('MAX_HOURS_PER_DAY');
    expect(load!.category).toBe('SOFT');
    expect(load!.weight).toBe(50);
  });

  it('est déterministe : même snapshot + mêmes options ⇒ même fichier et checksum', () => {
    const entrees = snapshotMinimal();
    const r1 = buildDerivedFile(entrees, OPTIONS);
    const r2 = buildDerivedFile(entrees, OPTIONS);
    expect(r1.checksum).toBe(r2.checksum);
    expect(JSON.stringify(r1.fichier)).toBe(JSON.stringify(r2.fichier));
    expect(r1.checksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it('n\'contient aucun horodatage ni ID aléatoire dans le payload (pureté)', () => {
    const { fichier } = buildDerivedFile(snapshotMinimal(), OPTIONS);
    const json = JSON.stringify(fichier);
    // createdAt est fourni par l'appelant (déterministe), pas aléatoire
    expect(fichier.metadata.createdAt).toBe(OPTIONS.createdAt);
    // updatedAt ne doit jamais apparaître dans le payload dérivé
    expect(json).not.toContain('updatedAt');
    // Aucun UUID v4 (aléatoire) : tous les IDs sont déterministes/fournis par l'appelant
    expect(json).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/);
  });

  it('rejette un fichier invalide via le schéma Zod (GG-05)', () => {
    const entrees = snapshotMinimal({
      contraintes: [{ id: '55555555-5555-5555-5555-555555555555', type: 'PREFERENCE_CRENEAU', cibleId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', valeur: '{}' }],
    });
    const { fichier } = buildDerivedFile(entrees, OPTIONS);
    const invalide = { ...fichier, constraints: [{ ...fichier.constraints[0], weight: 999 }] };
    expect(() => zDerivedFile.parse(invalide)).toThrow();
  });
});

