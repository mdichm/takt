// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Conflit, ContexteConflits, SeanceAAnalyser } from '../types';

/**
 * CONFLIT VERROU (BLOQUANT, HC-LOCK-01 à HC-LOCK-04)
 * La séance viole un verrou posé (créneau, salle, enseignant ou activité figés).
 *
 * Un verrou se applique soit à une séance précise (seanceId), soit globalement à la version.
 */
export function detecterConflitVerrou(
  seance: SeanceAAnalyser,
  contexte: ContexteConflits,
): Conflit | null {
  const verrousConcernees = contexte.verrous.filter((v) => !v.seanceId || v.seanceId === seance.id);

  for (const verrou of verrousConcernees) {
    let viole = false;
    let detailExtra: Record<string, unknown> = {};

    switch (verrou.type) {
      case 'CRENEAU':
        viole = verrou.valeur !== seance.creneauDebutId;
        detailExtra = { verrouType: 'CRENEAU', valeurVerrou: verrou.valeur, valeurSeance: seance.creneauDebutId };
        break;
      case 'SALLE':
        viole = seance.salleId ? seance.salleId !== verrou.valeur : true;
        detailExtra = { verrouType: 'SALLE', valeurVerrou: verrou.valeur, valeurSeance: seance.salleId };
        break;
      case 'ENSEIGNANT':
        viole = seance.enseignantId ? seance.enseignantId !== verrou.valeur : true;
        detailExtra = { verrouType: 'ENSEIGNANT', valeurVerrou: verrou.valeur, valeurSeance: seance.enseignantId };
        break;
      case 'ACTIVITE':
        viole = seance.activite ? seance.activite !== verrou.valeur : true;
        detailExtra = { verrouType: 'ACTIVITE', valeurVerrou: verrou.valeur, valeurSeance: seance.activite };
        break;
    }

    if (viole) {
      return {
        type: 'VERROU',
        severite: 'BLOQUANT',
        message: `Conflit verrou : la séance ${seance.id} viole le verrou ${verrou.id} (type ${verrou.type}, valeur ${verrou.valeur}).`,
        details: {
          seanceId: seance.id,
          verrouId: verrou.id,
          verrouType: verrou.type,
          valeurVerrou: verrou.valeur,
          poids: verrou.poids,
          ...detailExtra,
        },
      };
    }
  }

  return null;
}
