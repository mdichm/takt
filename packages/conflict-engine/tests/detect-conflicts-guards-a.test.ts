// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { detecterConflitEnseignant } from '../src/detectors/enseignant';
import { detecterConflitGroupe } from '../src/detectors/groupe';
import { detecterConflitSalle } from '../src/detectors/salle';
import { detecterConflitCapacite } from '../src/detectors/capacite';
import { detecterConflitEquipement } from '../src/detectors/equipement';
import { detecterConflitCompatibilite } from '../src/detectors/compatibilite';
import type { SeanceAAnalyser, ContexteConflits } from '../src/types';

function baseSeance(overrides: Partial<SeanceAAnalyser> = {}): SeanceAAnalyser {
  return {
    id: 's1', versionId: 'v1',
    jour: new Date('2026-01-12T00:00:00Z'),
    creneauDebutId: 'creneau-8h', nbCreneaux: 1,
    salleId: 'salle-101', enseignantId: 'ens-dupont', groupeId: 'groupe-L3', activite: 'CM',
    ...overrides,
  };
}
function baseContexte(overrides: Partial<ContexteConflits> = {}): ContexteConflits {
  return {
    seancesConcurrentes: [],
    salle: { id: 'salle-101', capacite: 40, equipements: [] },
    groupe: { id: 'groupe-L3', effectif: 30 },
    enseignant: { id: 'ens-dupont' },
    contraintesIndisponibilite: [], verrous: [], reglesPedagogiques: [],
    pauses: [], creneauxOrdonnees: ['creneau-8h', 'creneau-9h', 'creneau-10h'],
    pasDeTempsMinutes: 60, margeCapacite: 1.1, ...overrides,
  };
}

describe('garde : champ de séance manquant', () => {
  it('enseignant : enseignantId absent → null', () => {
    expect(detecterConflitEnseignant(baseSeance({ enseignantId: undefined }), baseContexte())).toBeNull();
  });
  it('groupe : groupeId absent → null', () => {
    expect(detecterConflitGroupe(baseSeance({ groupeId: undefined }), baseContexte())).toBeNull();
  });
  it('salle : salleId absent → null', () => {
    expect(detecterConflitSalle(baseSeance({ salleId: undefined }), baseContexte())).toBeNull();
  });
  it('enseignant : nbCreneaux non renseigné (?? 1) → null sans concurrent', () => {
    expect(detecterConflitEnseignant(baseSeance({ nbCreneaux: undefined }), baseContexte())).toBeNull();
  });
  it('groupe : nbCreneaux non renseigné (?? 1) → null sans concurrent', () => {
    expect(detecterConflitGroupe(baseSeance({ nbCreneaux: undefined }), baseContexte())).toBeNull();
  });
  it('salle : nbCreneaux non renseigné (?? 1) → null sans concurrent', () => {
    expect(detecterConflitSalle(baseSeance({ nbCreneaux: undefined }), baseContexte())).toBeNull();
  });
});

describe('garde : capacité', () => {
  it('salleId absent → null', () => {
    expect(detecterConflitCapacite(baseSeance({ salleId: undefined }), baseContexte())).toBeNull();
  });
  it('groupeId absent → null', () => {
    expect(detecterConflitCapacite(baseSeance({ groupeId: undefined }), baseContexte())).toBeNull();
  });
  it('contexte.salle absent → null', () => {
    expect(detecterConflitCapacite(baseSeance(), baseContexte({ salle: undefined }))).toBeNull();
  });
  it('contexte.groupe absent → null', () => {
    expect(detecterConflitCapacite(baseSeance(), baseContexte({ groupe: undefined }))).toBeNull();
  });
  it('margeCapacite absente utilise 1.1 (?? 1.1)', () => {
    const seance = baseSeance({ salleId: 'salle-101', groupeId: 'groupe-L3' });
    const contexte = baseContexte({
      salle: { id: 'salle-101', capacite: 33, equipements: [] },
      groupe: { id: 'groupe-L3', effectif: 30 }, margeCapacite: undefined,
    });
    expect(detecterConflitCapacite(seance, contexte)).toBeNull();
  });
});

describe('garde : équipement', () => {
  it('salleId absent → null', () => {
    expect(detecterConflitEquipement(baseSeance({ salleId: undefined, equipementsRequises: ['vp'] }), baseContexte())).toBeNull();
  });
  it('equipementsRequises absent → null', () => {
    expect(detecterConflitEquipement(baseSeance({ equipementsRequises: undefined }), baseContexte())).toBeNull();
  });
  it('equipementsRequises vide → null', () => {
    expect(detecterConflitEquipement(baseSeance({ equipementsRequises: [] }), baseContexte())).toBeNull();
  });
  it('contexte.salle absent → null', () => {
    expect(detecterConflitEquipement(baseSeance({ salleId: 'salle-101', equipementsRequises: ['vp'] }), baseContexte({ salle: undefined }))).toBeNull();
  });
});

describe('garde : compatibilité', () => {
  it('salleId absent → null', () => {
    expect(detecterConflitCompatibilite(baseSeance({ salleId: undefined, activite: 'TP' }), baseContexte())).toBeNull();
  });
  it('activite absent → null', () => {
    expect(detecterConflitCompatibilite(baseSeance({ activite: undefined }), baseContexte())).toBeNull();
  });
  it('contexte.salle absent → null', () => {
    expect(detecterConflitCompatibilite(baseSeance({ salleId: 'salle-101', activite: 'TP' }), baseContexte({ salle: undefined }))).toBeNull();
  });
  it('typeSalleId absent → null', () => {
    expect(detecterConflitCompatibilite(baseSeance({ salleId: 'salle-101', activite: 'TP' }), baseContexte({ salle: { id: 'salle-101', capacite: 40, equipements: [] } }))).toBeNull();
  });
  it('typesSalleCompatibles absent → null', () => {
    expect(detecterConflitCompatibilite(baseSeance({ salleId: 'salle-101', activite: 'TP' }), baseContexte({ salle: { id: 'salle-101', capacite: 40, typeSalleId: 'SALLE_TP', equipements: [] } }))).toBeNull();
  });
  it('typesAcceptes vide pour l\'activité → null', () => {
    expect(detecterConflitCompatibilite(baseSeance({ salleId: 'salle-101', activite: 'TP' }), baseContexte({ salle: { id: 'salle-101', capacite: 40, typeSalleId: 'SALLE_TP', equipements: [] }, typesSalleCompatibles: { TP: [] } }))).toBeNull();
  });
});
