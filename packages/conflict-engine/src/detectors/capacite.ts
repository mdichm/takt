// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Conflit, ContexteConflits, SeanceAAnalyser } from '../types';

/**
 * CONFLIT CAPACITE (BLOQUANT, HC-ROOM-02)
 * La capacité de la salle est insuffisante pour l'effectif du groupe (marge de sécurité appliquée).
 *
 * Règle : capacité >= effectif × margeCapacite (défaut 1.1 → 10 % de marge).
 * Si l'effectif du groupe est inconnu, aucun conflit n'est émis (donnée manquante traitée ailleurs).
 */
export function detecterConflitCapacite(
  seance: SeanceAAnalyser,
  contexte: ContexteConflits,
): Conflit | null {
  if (!seance.salleId || !seance.groupeId) return null;
  if (!contexte.salle || !contexte.groupe || contexte.groupe.effectif === undefined) return null;

  const marge = contexte.margeCapacite ?? 1.1;
  const seuilEffectif = contexte.groupe.effectif * marge;

  if (contexte.salle.capacite >= seuilEffectif) return null;

  return {
    type: 'CAPACITE',
    severite: 'BLOQUANT',
    message: `Conflit capacité : la salle ${seance.salleId} (capacité ${contexte.salle.capacite}) est trop petite pour le groupe ${seance.groupeId} (effectif ${contexte.groupe.effectif}, seuil requis ${seuilEffectif}).`,
    details: {
      salleId: seance.salleId,
      groupeId: seance.groupeId,
      seanceId: seance.id,
      capaciteSalle: contexte.salle.capacite,
      effectifGroupe: contexte.groupe.effectif,
      margeCapacite: marge,
      seuilRequis: seuilEffectif,
      jour: seance.jour.toISOString(),
    },
  };
}
