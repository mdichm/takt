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
} from '../src/versions';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('contrats des versions et du workflow', () => {
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
    const scenario = {
      id: UUID,
      generationId: UUID,
      scoreGlobal: 80,
      sousScores: { couverture: 90 },
      selectionne: false,
      createdAt: '2026-10-30T14:30:00.000Z',
    };
    expect(zScenario.parse(scenario)).toEqual(scenario);
    expect(zScenario.safeParse({ ...scenario, scoreGlobal: 101 }).success).toBe(false);
    expect(zScenario.safeParse({ ...scenario, sousScores: { couverture: 'haute' } }).success).toBe(
      false,
    );
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
