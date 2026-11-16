// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { detecterConflitPause } from '../src/detectors/pause';
import { detecterConflitReglePedagogique } from '../src/detectors/regle-pedagogique';
import { detecterConflitVerrou } from '../src/detectors/verrou';
import { detecterConflitVoeux } from '../src/detectors/voeux';
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

describe('garde : pause et vœux (créneau inconnu)', () => {
  it('pause : créneau de début inconnu → null', () => {
    expect(detecterConflitPause(baseSeance({ creneauDebutId: 'creneau-inconnu' }), baseContexte({ pauses: [{ nom: 'P', creneaux: ['creneau-8h'] }] }))).toBeNull();
  });
  it('vœux : vœux absent → null', () => {
    expect(detecterConflitVoeux(baseSeance(), baseContexte({ voeux: undefined }))).toBeNull();
  });
  it('vœux : créneau de début inconnu → null', () => {
    expect(detecterConflitVoeux(baseSeance({ creneauDebutId: 'creneau-inconnu' }), baseContexte({ voeux: { creneauxIndesirables: ['creneau-8h'] } }))).toBeNull();
  });
  it('pause : nbCreneaux non renseigné (?? 1) avec pauses présentes', () => {
    expect(
      detecterConflitPause(baseSeance({ nbCreneaux: undefined }), baseContexte({ pauses: [{ nom: 'P', creneaux: ['creneau-9h'] }] })),
    ).toBeNull();
  });
  it('vœux : nbCreneaux non renseigné (?? 1) avec vœux présents', () => {
    expect(
      detecterConflitVoeux(baseSeance({ nbCreneaux: undefined }), baseContexte({ voeux: { creneauxIndesirables: ['creneau-9h'] } })),
    ).toBeNull();
  });
});

describe('verrou', () => {
  it('verrou SALLE violé → conflit', () => {
    const seance = baseSeance({ salleId: 'salle-autre' });
    const contexte = baseContexte({ verrous: [{ id: 'vr1', seanceId: 's1', type: 'SALLE', valeur: 'salle-101', poids: 100 }] });
    const c = detecterConflitVerrou(seance, contexte);
    expect(c?.type).toBe('VERROU');
    expect(c?.severite).toBe('BLOQUANT');
  });
  it('verrou ENSEIGNANT violé → conflit', () => {
    const seance = baseSeance({ enseignantId: 'ens-autre' });
    const contexte = baseContexte({ verrous: [{ id: 'vr1', seanceId: 's1', type: 'ENSEIGNANT', valeur: 'ens-dupont', poids: 100 }] });
    const c = detecterConflitVerrou(seance, contexte);
    expect(c?.type).toBe('VERROU');
  });
  it('verrou ACTIVITE violé → conflit', () => {
    const seance = baseSeance({ activite: 'TP' });
    const contexte = baseContexte({ verrous: [{ id: 'vr1', seanceId: 's1', type: 'ACTIVITE', valeur: 'CM', poids: 100 }] });
    const c = detecterConflitVerrou(seance, contexte);
    expect(c?.type).toBe('VERROU');
  });
  it('verrou ENSEIGNANT respecté (enseignantId identique) → null', () => {
    const seance = baseSeance({ enseignantId: 'ens-dupont' });
    const contexte = baseContexte({ verrous: [{ id: 'vr1', seanceId: 's1', type: 'ENSEIGNANT', valeur: 'ens-dupont', poids: 100 }] });
    expect(detecterConflitVerrou(seance, contexte)).toBeNull();
  });
  it('verrou ENSEIGNANT avec enseignantId absent → considéré violé', () => {
    const seance = baseSeance({ enseignantId: undefined });
    const contexte = baseContexte({ verrous: [{ id: 'vr1', seanceId: 's1', type: 'ENSEIGNANT', valeur: 'ens-dupont', poids: 100 }] });
    const c = detecterConflitVerrou(seance, contexte);
    expect(c?.type).toBe('VERROU');
  });
  it('verrou ACTIVITE respecté (activite identique) → null', () => {
    const seance = baseSeance({ activite: 'CM' });
    const contexte = baseContexte({ verrous: [{ id: 'vr1', seanceId: 's1', type: 'ACTIVITE', valeur: 'CM', poids: 100 }] });
    expect(detecterConflitVerrou(seance, contexte)).toBeNull();
  });
  it('verrou ACTIVITE avec activite absent → considéré violé', () => {
    const seance = baseSeance({ activite: undefined });
    const contexte = baseContexte({ verrous: [{ id: 'vr1', seanceId: 's1', type: 'ACTIVITE', valeur: 'CM', poids: 100 }] });
    const c = detecterConflitVerrou(seance, contexte);
    expect(c?.type).toBe('VERROU');
  });
  it('verrou global (pas de seanceId) s\'applique', () => {
    const seance = baseSeance({ creneauDebutId: 'creneau-9h' });
    const contexte = baseContexte({ verrous: [{ id: 'vr1', type: 'CRENEAU', valeur: 'creneau-8h', poids: 100 }] });
    const c = detecterConflitVerrou(seance, contexte);
    expect(c?.type).toBe('VERROU');
  });
  it('verrou avec salleId absent est considéré violé (SALLE)', () => {
    const seance = baseSeance({ salleId: undefined });
    const contexte = baseContexte({ verrous: [{ id: 'vr1', seanceId: 's1', type: 'SALLE', valeur: 'salle-101', poids: 100 }] });
    const c = detecterConflitVerrou(seance, contexte);
    expect(c?.type).toBe('VERROU');
  });
  it('verrou respecté → null', () => {
    const seance = baseSeance({ salleId: 'salle-101' });
    const contexte = baseContexte({ verrous: [{ id: 'vr1', seanceId: 's1', type: 'SALLE', valeur: 'salle-101', poids: 100 }] });
    expect(detecterConflitVerrou(seance, contexte)).toBeNull();
  });
});

describe('règle pédagogique', () => {
  it('plusieurs règles non respectées : le reduce choisit la plus sévère', () => {
    const seance = baseSeance();
    const contexte = baseContexte({
      reglesPedagogiques: [
        { id: 'r1', libelle: 'Règle A', severite: 'INFORMATION', estRespectee: false },
        { id: 'r2', libelle: 'Règle B', severite: 'BLOQUANT', estRespectee: false },
      ],
    });
    const c = detecterConflitReglePedagogique(seance, contexte);
    expect(c?.severite).toBe('BLOQUANT');
    expect(c?.details['regleId']).toBe('r2');
  });
  it('reduce couvre les deux branches du ternaire (3 règles)', () => {
    const seance = baseSeance();
    const contexte = baseContexte({
      reglesPedagogiques: [
        { id: 'r1', libelle: 'Règle A', severite: 'INFORMATION', estRespectee: false },
        { id: 'r2', libelle: 'Règle B', severite: 'BLOQUANT', estRespectee: false },
        { id: 'r3', libelle: 'Règle C', severite: 'AVERTISSEMENT', estRespectee: false },
      ],
    });
    const c = detecterConflitReglePedagogique(seance, contexte);
    expect(c?.severite).toBe('BLOQUANT');
    expect(c?.details['regleId']).toBe('r2');
  });
  it('règle avec details explicites → spread dans les détails', () => {
    const seance = baseSeance();
    const contexte = baseContexte({
      reglesPedagogiques: [{ id: 'r1', libelle: 'Règle', severite: 'AVERTISSEMENT', estRespectee: false, details: { code: 'R1' } }],
    });
    const c = detecterConflitReglePedagogique(seance, contexte);
    expect(c?.details['code']).toBe('R1');
  });
});
