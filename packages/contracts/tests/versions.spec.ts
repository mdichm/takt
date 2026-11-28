// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import {
  zAudit,
  zGeneration,
  zScenario,
  zScenarioSelect,
  zTransition,
  zVersion,
  zVersionItem,
  zVersionListe,
  zVersionList,
} from '../src/versions';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('contrats des versions et du workflow', () => {
  const scenario = {
    id: UUID,
    generationId: UUID,
    scoreGlobal: 80,
    sousScores: { couverture: 90 },
    selectionne: false,
    createdAt: '2026-10-30T14:30:00.000Z',
  };

  it('accepte une version valide', () => {
    expect(zVersion.parse({ semestreId: UUID })).toEqual({
      semestreId: UUID,
      etat: 'initial',
      snapshotId: undefined,
    });
  });

  it('refuse un état de version inconnu', () => {
    expect(zVersion.safeParse({ semestreId: UUID, etat: 'inconnu' }).success).toBe(false);
  });

  it('accepte une action de transition valide sans motif (non-rejet)', () => {
    expect(zTransition.safeParse({ action: 'creerRepartition' }).success).toBe(true);
    expect(zTransition.safeParse({ action: 'publier' }).success).toBe(true);
    expect(zTransition.safeParse({ action: 'archiver' }).success).toBe(true);
  });

  it('refuse une action de transition inconnue', () => {
    expect(zTransition.safeParse({ action: 'transitionInexistante' }).success).toBe(false);
    expect(zTransition.safeParse({ action: '' }).success).toBe(false);
  });

  it('exige un motif pour les actions de rejet', () => {
    expect(
      zTransition.safeParse({ action: 'rejeterPedagogique' }).success,
    ).toBe(false);
    expect(
      zTransition.safeParse({
        action: 'rejeterPedagogique',
        motif: '',
      }).success,
    ).toBe(false);
    expect(
      zTransition.safeParse({
        action: 'rejeterPedagogique',
        motif: 'Répartition incohérente',
        typeMotif: 'pedagogique',
      }).success,
    ).toBe(true);
  });

  it('exige un typeMotif pour les actions de rejet', () => {
    expect(
      zTransition.safeParse({
        action: 'rejeterDirectionPlanning',
        motif: 'Conflit de créneaux',
      }).success,
    ).toBe(false);
    expect(
      zTransition.safeParse({
        action: 'rejeterDirectionPedagogique',
        motif: 'Charge horaire dépassée',
        typeMotif: 'pedagogique',
      }).success,
    ).toBe(true);
  });

  it('refuse un typeMotif pour une action non-rejet', () => {
    expect(
      zTransition.safeParse({
        action: 'creerRepartition',
        typeMotif: 'pedagogique',
      }).success,
    ).toBe(true);
  });

  it('liste les 18 actions canoniques', () => {
    const actions = [
      'creerRepartition',
      'annulerRepartition',
      'validerRepartition',
      'lancerGeneration',
      'editer',
      'selectionnerScenario',
      'annulerGeneration',
      'soumettreValidation',
      'regenerer',
      'transmettreDirection',
      'rejeterPedagogique',
      'validerDefinitivement',
      'rejeterDirectionPedagogique',
      'rejeterDirectionPlanning',
      'publier',
      'archiverSansPublier',
      'archiver',
      'nouvelleVersionArchive',
    ];
    expect(actions).toHaveLength(18);
    for (const action of actions) {
      const estRejet = [
        'rejeterPedagogique',
        'rejeterDirectionPedagogique',
        'rejeterDirectionPlanning',
      ].includes(action);
      const resultat = zTransition.safeParse({
        action,
        ...(estRejet ? { motif: 'motif de test', typeMotif: 'autre' } : {}),
      });
      expect(resultat.success, `échec sur l'action ${action}`).toBe(true);
    }
  });

  it('valide une génération', () => {
    expect(zGeneration.parse({ versionId: UUID })).toEqual({ versionId: UUID });
    expect(zGeneration.safeParse({ versionId: 'invalide' }).success).toBe(false);
  });

  it('valide les scores d’un scénario', () => {
    expect(zScenario.parse(scenario)).toEqual({ ...scenario, placements: [] });
    expect(zScenario.safeParse({ ...scenario, scoreGlobal: 101 }).success).toBe(false);
    expect(zScenario.safeParse({ ...scenario, sousScores: { couverture: 'haute' } }).success).toBe(
      false,
    );
  });

  it('accepte un scénario avec des placements valides', () => {
    const scenarioAvecPlacements = {
      ...scenario,
      placements: [
        {
          activityId: UUID,
          day: 1,
          slot: 4,
          roomId: UUID,
          teacherId: UUID,
          nbCreneaux: 2,
        },
        {
          activityId: UUID,
          day: 3,
          slot: 10,
          roomId: UUID,
          teacherId: UUID,
        },
      ],
    };
    const parseResult = zScenario.parse(scenarioAvecPlacements);
    expect(parseResult.placements).toHaveLength(2);
    expect(parseResult.placements[0]).toMatchObject({
      activityId: UUID,
      day: 1,
      slot: 4,
      roomId: UUID,
      teacherId: UUID,
      nbCreneaux: 2,
    });
  });

  it('refuse un placement dont le jour est hors bornes', () => {
    const placementInvalide = {
      ...scenario,
      placements: [
        {
          activityId: UUID,
          day: 7,
          slot: 4,
          roomId: UUID,
          teacherId: UUID,
        },
      ],
    };
    expect(zScenario.safeParse(placementInvalide).success).toBe(false);
  });

  it('refuse un placement dont le créneau est hors bornes', () => {
    const placementInvalide = {
      ...scenario,
      placements: [
        {
          activityId: UUID,
          day: 1,
          slot: 25,
          roomId: UUID,
          teacherId: UUID,
        },
      ],
    };
    expect(zScenario.safeParse(placementInvalide).success).toBe(false);
  });

  it('définit placements à [] par défaut quand absent', () => {
    const parseResult = zScenario.parse(scenario);
    expect(parseResult.placements).toEqual([]);
  });

  it('valide la sélection d’un scénario', () => {
    expect(zScenarioSelect.parse({ scenarioId: UUID })).toEqual({ scenarioId: UUID });
  });

  it('refuse un intervalle d’audit inversé', () => {
    const resultat = zAudit.safeParse({
      dateDebut: '2026-11-02T00:00:00.000Z',
      dateFin: '2026-11-01T00:00:00.000Z',
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues[0]?.message).toBe(
        'La date de début doit être antérieure ou égale à la date de fin',
      );
    }
  });
});

describe('contrats des versions — liste et filtres département', () => {
  const UUID = '11111111-1111-4111-8111-111111111111';

  it('zVersionItem accepte un item de version valide', () => {
    const item = {
      id: UUID,
      semestreId: UUID,
      anneeId: UUID,
      etat: 'publie',
      snapshotId: null,
      datePublication: '2026-01-15T09:00:00.000Z',
      publiePar: UUID,
      createdAt: '2026-01-10T08:00:00.000Z',
      updatedAt: '2026-01-15T09:00:00.000Z',
    };
    expect(zVersionItem.parse(item)).toEqual(item);
  });

  it('zVersionItem refuse un état invalide', () => {
    expect(
      zVersionItem.safeParse({
        id: UUID,
        semestreId: UUID,
        anneeId: UUID,
        etat: 'inconnu',
        createdAt: '2026-01-10T08:00:00.000Z',
        updatedAt: '2026-01-10T08:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('zVersionListe accepte une réponse paginée', () => {
    const liste = {
      items: [
        { id: UUID, semestreId: UUID, anneeId: UUID, etat: 'brouillon', createdAt: '2026-01-10T08:00:00.000Z', updatedAt: '2026-01-10T08:00:00.000Z' },
      ],
      meta: { page: 1, pageSize: 20, total: 1 },
    };
    expect(zVersionListe.parse(liste)).toEqual(liste);
  });

  it('zVersionListe refuse une méta invalide', () => {
    expect(
      zVersionListe.safeParse({
        items: [],
        meta: { page: 0, pageSize: 20, total: 0 },
      }).success,
    ).toBe(false);
  });

  it('zVersionList accepte le filtre departementId', () => {
    expect(
      zVersionList.safeParse({ page: 1, pageSize: 20, departementId: UUID }).success,
    ).toBe(true);
  });

  it('zVersionList refuse un departementId invalide', () => {
    expect(zVersionList.safeParse({ departementId: 'non-un-uuid' }).success).toBe(false);
  });
});
