// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import {
  calculerEcartes,
  estimerNonPlacees,
  calculerScoreQualite,
  calculerScoreEquilibrage,
  agruperPlacementsParActivite,
} from './comparaisonScenarios';
import { type Scenario } from '@takt/contracts';

const UUID_ACT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const UUID_ACT2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const UUID_ROOM = 'rrrrrrrr-rrrr-4rrr-8rrr-rrrrrrrrrrrr';
const UUID_ROOM2 = 'ssssssss-ssss-4sss-8sss-ssssssssssss';
const UUID_TEACH = 'tttttttt-tttt-4ttt-8ttt-tttttttttttt';
const UUID_TEACH2 = 'uuuuuuuu-uuuu-4uuu-8uuu-uuuuuuuuuuuu';

function scenario(
  id: string,
  placements: Array<{
    activityId: string;
    day: number;
    slot: number;
    roomId: string;
    teacherId: string;
  }> = [],
  sousScores: Record<string, number> = {},
): Scenario {
  return {
    id,
    generationId: 'gen-1',
    scoreGlobal: 80,
    sousScores,
    selectionne: false,
    placements: placements.map((p) => ({
      activityId: p.activityId,
      day: p.day,
      slot: p.slot,
      roomId: p.roomId,
      teacherId: p.teacherId,
    })),
    createdAt: '2026-10-30T14:30:00.000Z',
  };
}

describe('comparaisonScenarios', () => {
  describe('agruperPlacementsParActivite', () => {
    it('regroupe les placements par activité', () => {
      const s = scenario('s1', [
        { activityId: UUID_ACT, day: 1, slot: 4, roomId: UUID_ROOM, teacherId: UUID_TEACH },
        { activityId: UUID_ACT, day: 2, slot: 5, roomId: UUID_ROOM2, teacherId: UUID_TEACH2 },
        { activityId: UUID_ACT2, day: 3, slot: 6, roomId: UUID_ROOM, teacherId: UUID_TEACH },
      ]);
      const map = agruperPlacementsParActivite(s);
      expect(map.get(UUID_ACT)).toHaveLength(2);
      expect(map.get(UUID_ACT2)).toHaveLength(1);
    });
  });

  describe('calculerEcartes', () => {
    it('détecte un déplacement (jour/créneau différent)', () => {
      const a = scenario('a', [
        { activityId: UUID_ACT, day: 1, slot: 4, roomId: UUID_ROOM, teacherId: UUID_TEACH },
      ]);
      const b = scenario('b', [
        { activityId: UUID_ACT, day: 2, slot: 5, roomId: UUID_ROOM, teacherId: UUID_TEACH },
      ]);
      const ecartes = calculerEcartes(a, b);
      expect(ecartes.deplacees).toContain(UUID_ACT);
      expect(ecartes.sallesDiff).not.toContain(UUID_ACT);
      expect(ecartes.enseignantsDiff).not.toContain(UUID_ACT);
    });

    it('détecte une salle différente', () => {
      const a = scenario('a', [
        { activityId: UUID_ACT, day: 1, slot: 4, roomId: UUID_ROOM, teacherId: UUID_TEACH },
      ]);
      const b = scenario('b', [
        { activityId: UUID_ACT, day: 1, slot: 4, roomId: UUID_ROOM2, teacherId: UUID_TEACH },
      ]);
      const ecartes = calculerEcartes(a, b);
      expect(ecartes.sallesDiff).toContain(UUID_ACT);
      expect(ecartes.deplacees).not.toContain(UUID_ACT);
    });

    it('détecte un enseignant différent', () => {
      const a = scenario('a', [
        { activityId: UUID_ACT, day: 1, slot: 4, roomId: UUID_ROOM, teacherId: UUID_TEACH },
      ]);
      const b = scenario('b', [
        { activityId: UUID_ACT, day: 1, slot: 4, roomId: UUID_ROOM, teacherId: UUID_TEACH2 },
      ]);
      const ecartes = calculerEcartes(a, b);
      expect(ecartes.enseignantsDiff).toContain(UUID_ACT);
    });

    it('ne signale aucun écart pour deux scénarios identiques', () => {
      const a = scenario('a', [
        { activityId: UUID_ACT, day: 1, slot: 4, roomId: UUID_ROOM, teacherId: UUID_TEACH },
      ]);
      const b = scenario('b', [
        { activityId: UUID_ACT, day: 1, slot: 4, roomId: UUID_ROOM, teacherId: UUID_TEACH },
      ]);
      const ecartes = calculerEcartes(a, b);
      expect(ecartes.deplacees).toHaveLength(0);
      expect(ecartes.sallesDiff).toHaveLength(0);
      expect(ecartes.enseignantsDiff).toHaveLength(0);
    });

    it('gère une activité présente dans un seul scénario', () => {
      const a = scenario('a', [
        { activityId: UUID_ACT, day: 1, slot: 4, roomId: UUID_ROOM, teacherId: UUID_TEACH },
      ]);
      const b = scenario('b', []);
      const ecartes = calculerEcartes(a, b);
      expect(ecartes.deplacees).toHaveLength(0);
    });
  });

  describe('estimerNonPlacees', () => {
    it('retourne 0 quand couverture à 100 %', () => {
      expect(estimerNonPlacees(100, 50)).toBe(0);
    });

    it('estime le nombre de non placées', () => {
      // 50 placées, couverture 50% → 50 * (100-50)/50 = 50
      expect(estimerNonPlacees(50, 50)).toBe(50);
      // 80 placées, couverture 80% → 80 * (100-80)/80 = 20
      expect(estimerNonPlacees(80, 80)).toBe(20);
    });

    it('retourne 0 quand pas de placées', () => {
      expect(estimerNonPlacees(50, 0)).toBe(0);
    });
  });

  describe('calculerScoreQualite', () => {
    it('calcule la moyenne des sous-scores qualité', () => {
      const s = scenario('s', [], {
        coverage: 90,
        timeslotRespect: 80,
        roomRespect: 70,
        teacherRespect: 60,
        continuity: 50,
        loadBalance: 100,
      });
      expect(calculerScoreQualite(s.sousScores)).toBe(70);
    });

    it('retourne 0 sans sous-scores', () => {
      expect(calculerScoreQualite({})).toBe(0);
    });
  });

  describe('calculerScoreEquilibrage', () => {
    it('retourne le loadBalance arrondi', () => {
      const s = scenario('s', [], { loadBalance: 85 });
      expect(calculerScoreEquilibrage(s.sousScores)).toBe(85);
    });

    it('retourne 0 sans loadBalance', () => {
      expect(calculerScoreEquilibrage({})).toBe(0);
    });
  });
});