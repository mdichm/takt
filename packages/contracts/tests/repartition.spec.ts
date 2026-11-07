// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import {
  zPlanEtudes,
  zPlanEtudesCreate,
  zPlanEtudesList,
  zPlanEtudesMatiere,
  zPlanEtudesMatiereCreate,
  zPlanEtudesMatiereList,
  zPlanEtudesMatiereParams,
  zPlanEtudesParams,
  zPlanEtudesUpdate,
  zPlanEtudesGroupeHérité,
  zPlanEtudesVolumeTotal,
} from '../src/repartition';

const UUID_PARCOURS = '11111111-1111-4111-8111-111111111111';
const UUID_NIVEAU = '22222222-2222-4222-8222-222222222222';
const UUID_ANNEE = '33333333-3333-4333-8333-333333333333';
const UUID_SEMESTRE = '44444444-4444-4444-8444-444444444444';
const UUID_DEPARTEMENT = '55555555-5555-4555-8555-555555555555';
const UUID_MATIERE = '66666666-6666-4666-8666-666666666666';
const UUID_TYPE = '77777777-7777-4777-8777-777777777777';
const UUID_PLAN = '88888888-8888-4888-8888-888888888888';
const UUID_LIGNE = '99999999-9999-4999-8999-999999999999';

const MAINTENANT = '2026-11-07T20:50:00.000Z';

describe('contrats des plans d\'études', () => {
  it('accepte un plan d\'études valide', () => {
    const resultat = zPlanEtudes.parse({
      id: UUID_PLAN,
      parcoursId: UUID_PARCOURS,
      niveauId: UUID_NIVEAU,
      anneeUniversitaireId: UUID_ANNEE,
      semestreId: UUID_SEMESTRE,
      departementId: UUID_DEPARTEMENT,
      createdAt: MAINTENANT,
      updatedAt: MAINTENANT,
    });
    expect(resultat.id).toBe(UUID_PLAN);
    expect(resultat.departementId).toBe(UUID_DEPARTEMENT);
  });

  it('accepte une création de plan d\'études valide', () => {
    expect(
      zPlanEtudesCreate.parse({
        parcoursId: UUID_PARCOURS,
        niveauId: UUID_NIVEAU,
        anneeUniversitaireId: UUID_ANNEE,
        semestreId: UUID_SEMESTRE,
        departementId: UUID_DEPARTEMENT,
      }),
    ).toMatchObject({ niveauId: UUID_NIVEAU });
  });

  it('refuse un plan d\'études avec un UUID invalide', () => {
    const donnees = {
      id: 'pas-un-uuid',
      parcoursId: UUID_PARCOURS,
      niveauId: UUID_NIVEAU,
      anneeUniversitaireId: UUID_ANNEE,
      semestreId: UUID_SEMESTRE,
      departementId: UUID_DEPARTEMENT,
      createdAt: MAINTENANT,
      updatedAt: MAINTENANT,
    };
    expect(zPlanEtudes.safeParse(donnees).success).toBe(false);
  });

  it('refuse une création sans niveau', () => {
    const donnees = {
      parcoursId: UUID_PARCOURS,
      anneeUniversitaireId: UUID_ANNEE,
      semestreId: UUID_SEMESTRE,
      departementId: UUID_DEPARTEMENT,
    };
    expect(zPlanEtudesCreate.safeParse(donnees).success).toBe(false);
  });

  it('valide les filtres de liste des plans d\'études', () => {
    const resultat = zPlanEtudesList.parse({
      page: '2',
      pageSize: '10',
      niveauId: UUID_NIVEAU,
      departementId: UUID_DEPARTEMENT,
    });
    expect(resultat.page).toBe(2);
    expect(resultat.pageSize).toBe(10);
    expect(resultat.niveauId).toBe(UUID_NIVEAU);
  });

  it('accepte une mise à jour partielle de plan d\'études', () => {
    expect(
      zPlanEtudesUpdate.parse({ libelle: 'Libellé modifié' }),
    ).toMatchObject({});
  });

  it('refuse un volume horaire négatif sur une matière de plan', () => {
    const donnees = {
      matiereId: UUID_MATIERE,
      typeEnseignementId: UUID_TYPE,
      volumeHoraire: -2,
      dureeCreneaux: 60,
      coefficient: 1,
    };
    expect(zPlanEtudesMatiereCreate.safeParse(donnees).success).toBe(false);
  });

  it('refuse une durée de créneau nulle', () => {
    const donnees = {
      matiereId: UUID_MATIERE,
      typeEnseignementId: UUID_TYPE,
      volumeHoraire: 30,
      dureeCreneaux: 0,
      coefficient: 1,
    };
    expect(zPlanEtudesMatiereCreate.safeParse(donnees).success).toBe(false);
  });

  it('accepte une matière de plan d\'études valide', () => {
    const resultat = zPlanEtudesMatiere.parse({
      id: UUID_LIGNE,
      planEtudesId: UUID_PLAN,
      matiereId: UUID_MATIERE,
      typeEnseignementId: UUID_TYPE,
      volumeHoraire: 30,
      dureeCreneaux: 60,
      coefficient: 2,
      createdAt: MAINTENANT,
      updatedAt: MAINTENANT,
    });
    expect(resultat.volumeHoraire).toBe(30);
    expect(resultat.coefficient).toBe(2);
  });

  it('valide les filtres de liste des matières d\'un plan', () => {
    const resultat = zPlanEtudesMatiereList.parse({
      page: '1',
      pageSize: '5',
      matiereId: UUID_MATIERE,
    });
    expect(resultat.page).toBe(1);
    expect(resultat.pageSize).toBe(5);
    expect(resultat.matiereId).toBe(UUID_MATIERE);
  });

  it('valide l\'identifiant de matière de plan d\'études en paramètre', () => {
    const resultat = zPlanEtudesMatiereParams.parse({
      planEtudesId: UUID_PLAN,
      id: UUID_LIGNE,
    });
    expect(resultat.planEtudesId).toBe(UUID_PLAN);
    expect(resultat.id).toBe(UUID_LIGNE);
  });

  it('refuse un identifiant de plan d\'études invalide en paramètre', () => {
    expect(
      zPlanEtudesParams.safeParse({ id: 'invalide' }).success,
    ).toBe(false);
  });

  it('accepte un groupe héritier d\'un plan d\'études', () => {
    const resultat = zPlanEtudesGroupeHérité.parse({
      id: UUID_PLAN,
      code: 'L1-A',
      libelle: 'Licence 1 groupe A',
      niveauId: UUID_NIVEAU,
      estHéritier: true,
    });
    expect(resultat.estHéritier).toBe(true);
    expect(resultat.niveauId).toBe(UUID_NIVEAU);
  });

  it('accepte un volume total de plan d\'études', () => {
    const resultat = zPlanEtudesVolumeTotal.parse({
      planEtudesId: UUID_PLAN,
      volumeTotalHebdomadaire: 120,
      nombreMatieres: 6,
    });
    expect(resultat.volumeTotalHebdomadaire).toBe(120);
    expect(resultat.nombreMatieres).toBe(6);
  });

  it('refuse un volume total négatif', () => {
    expect(
      zPlanEtudesVolumeTotal.safeParse({
        planEtudesId: UUID_PLAN,
        volumeTotalHebdomadaire: -5,
        nombreMatieres: 0,
      }).success,
    ).toBe(false);
  });
});
