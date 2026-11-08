// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import {
  zAffectationPedagogique,
  zAffectationPedagogiqueCreate,
  zAffectationPedagogiqueUpdate,
  zAffectationPedagogiqueParams,
  zAffectationPedagogiqueListFilters,
} from '../src/affectations';

const UUID_VERSION = '11111111-1111-4111-8111-111111111111';
const UUID_SEMESTRE = '22222222-2222-4222-8222-222222222222';
const UUID_DEPARTEMENT = '33333333-3333-4333-8333-333333333333';
const UUID_ENSEIGNANT = '44444444-4444-4444-8444-444444444444';
const UUID_MATIERE = '55555555-5555-5555-8555-555555555555';
const UUID_GROUPE = '66666666-6666-6666-8666-666666666666';
const UUID_TYPE = '77777777-7777-7777-8777-777777777777';
const UUID_AFFECTATION = '88888888-8888-8888-8888-888888888888';

const MAINTENANT = '2026-11-07T20:50:00.000Z';

const DONNEES_VALIDEES = {
  id: UUID_AFFECTATION,
  versionId: UUID_VERSION,
  semestreId: UUID_SEMESTRE,
  departementId: UUID_DEPARTEMENT,
  enseignantId: UUID_ENSEIGNANT,
  matiereId: UUID_MATIERE,
  groupeId: UUID_GROUPE,
  typeEnseignementId: UUID_TYPE,
  volumeHebdo: 30,
  dureeCreneaux: 60,
  createdAt: MAINTENANT,
  updatedAt: MAINTENANT,
};

describe('contrats des affectations pédagogiques', () => {
  it('accepte une affectation pédagogique valide', () => {
    const resultat = zAffectationPedagogique.parse(DONNEES_VALIDEES);
    expect(resultat.id).toBe(UUID_AFFECTATION);
    expect(resultat.versionId).toBe(UUID_VERSION);
    expect(resultat.volumeHebdo).toBe(30);
    expect(resultat.dureeCreneaux).toBe(60);
  });

  it('accepte une affectation sans type d\'enseignement', () => {
    const resultat = zAffectationPedagogique.parse({
      ...DONNEES_VALIDEES,
      typeEnseignementId: null,
    });
    expect(resultat.typeEnseignementId).toBeNull();
  });

  it('refuse un volume hebdomadaire négatif', () => {
    const donnees = { ...DONNEES_VALIDEES, volumeHebdo: -5 };
    expect(zAffectationPedagogique.safeParse(donnees).success).toBe(false);
  });

  it('refuse un volume hebdomadaire nul', () => {
    const donnees = { ...DONNEES_VALIDEES, volumeHebdo: 0 };
    expect(zAffectationPedagogique.safeParse(donnees).success).toBe(false);
  });

  it('refuse une durée de créneau négative', () => {
    const donnees = { ...DONNEES_VALIDEES, dureeCreneaux: -10 };
    expect(zAffectationPedagogique.safeParse(donnees).success).toBe(false);
  });

  it('refuse une durée de créneau nulle', () => {
    const donnees = { ...DONNEES_VALIDEES, dureeCreneaux: 0 };
    expect(zAffectationPedagogique.safeParse(donnees).success).toBe(false);
  });

  it('accepte une création d\'affectation valide', () => {
    const resultat = zAffectationPedagogiqueCreate.parse({
      versionId: UUID_VERSION,
      semestreId: UUID_SEMESTRE,
      departementId: UUID_DEPARTEMENT,
      enseignantId: UUID_ENSEIGNANT,
      matiereId: UUID_MATIERE,
      groupeId: UUID_GROUPE,
      volumeHebdo: 24,
    });
    expect(resultat.volumeHebdo).toBe(24);
    expect(resultat.dureeCreneaux).toBeUndefined();
  });

  it('accepte une création sans versionId (déduction côté service)', () => {
    const resultat = zAffectationPedagogiqueCreate.parse({
      semestreId: UUID_SEMESTRE,
      departementId: UUID_DEPARTEMENT,
      enseignantId: UUID_ENSEIGNANT,
      matiereId: UUID_MATIERE,
      groupeId: UUID_GROUPE,
      volumeHebdo: 24,
      dureeCreneaux: 60,
    });
    expect(resultat.versionId).toBeUndefined();
    expect(resultat.dureeCreneaux).toBe(60);
  });

  it('refuse une création avec un UUID invalide', () => {
    const donnees = {
      versionId: UUID_VERSION,
      semestreId: UUID_SEMESTRE,
      departementId: UUID_DEPARTEMENT,
      enseignantId: 'pas-un-uuid',
      matiereId: UUID_MATIERE,
      groupeId: UUID_GROUPE,
      volumeHebdo: 24,
    };
    expect(zAffectationPedagogiqueCreate.safeParse(donnees).success).toBe(false);
  });

  it('refuse une création sans volume hebdomadaire', () => {
    const donnees = {
      versionId: UUID_VERSION,
      semestreId: UUID_SEMESTRE,
      departementId: UUID_DEPARTEMENT,
      enseignantId: UUID_ENSEIGNANT,
      matiereId: UUID_MATIERE,
      groupeId: UUID_GROUPE,
    };
    expect(zAffectationPedagogiqueCreate.safeParse(donnees).success).toBe(false);
  });

  it('refuse une mise à jour avec un volume hebdomadaire négatif', () => {
    const donnees = {
      id: UUID_AFFECTATION,
      volumeHebdo: -1,
    };
    expect(zAffectationPedagogiqueUpdate.safeParse(donnees).success).toBe(false);
  });

  it('accepte une mise à jour partielle (seul le volume)', () => {
    const resultat = zAffectationPedagogiqueUpdate.parse({
      id: UUID_AFFECTATION,
      volumeHebdo: 36,
    });
    expect(resultat.id).toBe(UUID_AFFECTATION);
    expect(resultat.volumeHebdo).toBe(36);
    expect(resultat.dureeCreneaux).toBeUndefined();
  });

  it('accepte une mise à jour mettant le type d\'enseignement à null', () => {
    const resultat = zAffectationPedagogiqueUpdate.parse({
      id: UUID_AFFECTATION,
      typeEnseignementId: null,
    });
    expect(resultat.typeEnseignementId).toBeNull();
  });

  it('valide l\'identifiant d\'affectation en paramètre de route', () => {
    const resultat = zAffectationPedagogiqueParams.parse({ id: UUID_AFFECTATION });
    expect(resultat.id).toBe(UUID_AFFECTATION);
  });

  it('refuse un identifiant d\'affectation invalide en paramètre', () => {
    expect(zAffectationPedagogiqueParams.safeParse({ id: 'invalide' }).success).toBe(false);
  });

  it('valide les filtres de liste avec pagination', () => {
    const resultat = zAffectationPedagogiqueListFilters.parse({
      page: '2',
      pageSize: '10',
      versionId: UUID_VERSION,
      departementId: UUID_DEPARTEMENT,
    });
    expect(resultat.page).toBe(2);
    expect(resultat.pageSize).toBe(10);
    expect(resultat.versionId).toBe(UUID_VERSION);
  });

  it('refuse une page négative dans les filtres de liste', () => {
    expect(zAffectationPedagogiqueListFilters.safeParse({ page: '-1' }).success).toBe(false);
  });
});
