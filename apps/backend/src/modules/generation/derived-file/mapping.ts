// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Logger } from '@nestjs/common';

/** Normalisation des codes TypeSalle (seed) vers l'enum stricte du solveur. */
export function typeSalleVersRoomType(
  code: string | null | undefined,
): 'AMPHI' | 'TD' | 'TP' | 'INFO' {
  const normalise = (code ?? '').toUpperCase();
  switch (normalise) {
    case 'CM':
      return 'AMPHI';
    case 'TD':
      return 'TD';
    case 'TP':
      return 'TP';
    case 'INFO':
      return 'INFO';
    default:
      return 'TD';
  }
}

/** TypeVerrou en local pour éviter toute dépendance Prisma. */
type TypeVerrouLocal = 'CRENEAU' | 'SALLE' | 'ENSEIGNANT' | 'ACTIVITE';

/** Mapping TypeVerrou → lockType du DerivedFile. */
export function typeVerrouVersLockType(type: TypeVerrouLocal) {
  switch (type) {
    case 'CRENEAU':
      return 'TIMESLOT';
    case 'SALLE':
      return 'ROOM';
    case 'ENSEIGNANT':
      return 'TEACHER';
    case 'ACTIVITE':
      return 'ACTIVITY';
  }
}

/**
 * Mapping d'une contrainte métier (Contrainte.type) vers un objet contrainte
 * du DerivedFile. Retourne `undefined` pour les types non reconnus (appelant
 * responsable du logging d'avertissement).
 *
 * Familles couvertes :
 *  - DURES (poids 100) : HC-UNAV, HC-ROOM
 *  - SOUPLES (1-99)   : SC-PREF, SC-CONT, SC-LOAD
 *
 * Les familles HC-RES (unicité salle/enseignant/groupe) et HC-STR
 * (structure temporelle) sont imposées structurellement par le solveur via
 * la grille et les activités, non transcrites comme contraintes explicites.
 */
export type ContrainteDerivee = {
  type:
    | 'UNAVAILABILITY'
    | 'ROOM_REQUIREMENT'
    | 'TEACHER_PREFERENCE'
    | 'CONSECUTIVE_SLOTS'
    | 'MAX_HOURS_PER_DAY'
    | 'MAX_HOURS_PER_WEEK'
    | 'WINDOW_CONSTRAINT'
    | 'NO_GAPS'
    | 'COMPACT_DAYS'
    | 'LOAD_BALANCE';
  category: 'HARD' | 'SOFT';
  scope: 'GLOBAL' | 'TEACHER' | 'GROUP' | 'ROOM' | 'ACTIVITY' | 'DEPARTMENT';
  weight: number;
  source: 'AUTO' | 'MANUAL' | 'CONFIG';
};

export function contrainteTypeVersDerivee(
  typeContrainte: string,
  logger?: Logger,
): ContrainteDerivee | undefined {
  const mapping: Record<string, ContrainteDerivee> = {
    // HC-UNAV-01/02/03 — Indisponibilités enseignants (HARD 100)
    INDISPONIBILITE: {
      type: 'UNAVAILABILITY',
      category: 'HARD',
      scope: 'TEACHER',
      weight: 100,
      source: 'MANUAL',
    },
    // HC-ROOM-01/02/03 — Exigences de salle (HARD 100)
    EXIGENCE_SALLE: {
      type: 'ROOM_REQUIREMENT',
      category: 'HARD',
      scope: 'ROOM',
      weight: 100,
      source: 'MANUAL',
    },
    // SC-PREF-01 — Créneaux préférés (SOFT 30)
    PREFERENCE_CRENEAU: {
      type: 'TEACHER_PREFERENCE',
      category: 'SOFT',
      scope: 'TEACHER',
      weight: 30,
      source: 'MANUAL',
    },
    // SC-PREF-02 — Créneaux évités (SOFT 20)
    CRENEAU_EVITE: {
      type: 'TEACHER_PREFERENCE',
      category: 'SOFT',
      scope: 'TEACHER',
      weight: 20,
      source: 'MANUAL',
    },
    // SC-PREF-03 — Jours préférés (SOFT 25)
    JOUR_PREFERE: {
      type: 'TEACHER_PREFERENCE',
      category: 'SOFT',
      scope: 'TEACHER',
      weight: 25,
      source: 'MANUAL',
    },
    // SC-PREF-04 — Salle préférée (SOFT 15)
    SALLE_PREFEREE: {
      type: 'TEACHER_PREFERENCE',
      category: 'SOFT',
      scope: 'TEACHER',
      weight: 15,
      source: 'MANUAL',
    },
    // SC-CONT-01 — Séances consécutives (SOFT 40)
    SEANCES_CONSECUTIVES: {
      type: 'CONSECUTIVE_SLOTS',
      category: 'SOFT',
      scope: 'ACTIVITY',
      weight: 40,
      source: 'CONFIG',
    },
    // SC-CONT-02 — Pas de trous (groupes) (SOFT 35)
    PAS_DE_TROUS_GROUPE: {
      type: 'NO_GAPS',
      category: 'SOFT',
      scope: 'GROUP',
      weight: 35,
      source: 'CONFIG',
    },
    // SC-CONT-03 — Pas de trous (enseignants) (SOFT 30)
    PAS_DE_TROUS_ENSEIGNANT: {
      type: 'NO_GAPS',
      category: 'SOFT',
      scope: 'TEACHER',
      weight: 30,
      source: 'CONFIG',
    },
    // SC-CONT-04 — Journées compactes (SOFT 25)
    JOURNEES_COMPACTES: {
      type: 'COMPACT_DAYS',
      category: 'SOFT',
      scope: 'GLOBAL',
      weight: 25,
      source: 'CONFIG',
    },
    // SC-LOAD-01 — Max heures/jour (SOFT 50)
    CHARGE_MAX_JOUR: {
      type: 'MAX_HOURS_PER_DAY',
      category: 'SOFT',
      scope: 'TEACHER',
      weight: 50,
      source: 'CONFIG',
    },
    // SC-LOAD-02 — Max heures/semaine (SOFT 60)
    CHARGE_MAX_SEMAINE: {
      type: 'MAX_HOURS_PER_WEEK',
      category: 'SOFT',
      scope: 'TEACHER',
      weight: 60,
      source: 'CONFIG',
    },
    // SC-LOAD-03 — Équilibrage charge (SOFT 30)
    EQUILIBRAGE_CHARGE: {
      type: 'LOAD_BALANCE',
      category: 'SOFT',
      scope: 'DEPARTMENT',
      weight: 30,
      source: 'CONFIG',
    },
  };

  const derivee = mapping[typeContrainte];
  if (!derivee && logger) {
    logger.warn(
      `Contrainte non mappée vers DerivedFile : "${typeContrainte}" (ignorée)`,
    );
  }
  return derivee;
}
