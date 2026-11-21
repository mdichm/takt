// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { type ActionRapide } from './dashboard.types';

/**
 * Projection des actions rapides du tableau de bord (EC-COM-02).
 *
 * Cette liste est statique côté UI : elle n’importe aucun code backend
 * (pas de `prisma`, pas de `MATRICE_TRANSITIONS` serveur). Chaque action
 * indique les rôles autorisés pour l’affichage conditionnel.
 */
export const ACTIONS_RAPIDES: readonly ActionRapide[] = [
  {
    id: 'consulter-versions',
    libelle: 'Consulter les versions',
    description: 'Accédez à la liste des versions de planning et à leur état de workflow.',
    chemin: '/dashboard',
    roles: ['admin', 'gest', 'rdep', 'dir'],
    icone: 'calendrier',
  },
  {
    id: 'saisie-repartition',
    libelle: 'Saisie de répartition',
    description: 'Saisissez les affectations pédagogiques de votre département.',
    chemin: '/rdep/allocation',
    roles: ['rdep', 'gest', 'admin'],
    icone: 'utilisateur',
  },
  {
    id: 'validation-repartition',
    libelle: 'Validation de répartition',
    description: 'Validez les charges pédagogiques de votre département.',
    chemin: '/rdep/validate',
    roles: ['rdep', 'admin'],
    icone: 'succès',
  },
  {
    id: 'generation-edt',
    libelle: 'Génération d’emploi du temps',
    description: 'Lancez la génération CP-SAT des scénarios d’emploi du temps.',
    chemin: '/ges/generate',
    roles: ['gest', 'admin'],
    icone: 'alerte',
  },
  {
    id: 'scenarios-direction',
    libelle: 'Scénarios de direction',
    description: 'Consultez et comparez les scénarios de planification.',
    chemin: '/dir/scenario',
    roles: ['dir', 'admin'],
    icone: 'info',
  },
];

/** Retourne les actions rapides autorisées pour un rôle donné. */
export function actionsRapidesPourRole(role: string): readonly ActionRapide[] {
  return ACTIONS_RAPIDES.filter((action) => action.roles.includes(role));
}
