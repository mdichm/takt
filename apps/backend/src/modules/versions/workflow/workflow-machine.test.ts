// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import {
  canTransition,
  transitionsDepuis,
  type TransitionContexte,
} from './workflow-machine';
import { MATRICE_TRANSITIONS } from './workflow-matrix';
import { type RoleCode } from '@takt/contracts';

const ROLE_AUTORISE = (
  regle: { readonly roles: readonly RoleCode[] },
): RoleCode => regle.roles[0]!;
const ROLE_NON_AUTORISE: RoleCode = 'admin';

describe('moteur de transitions workflow (TAKT-L06-02)', () => {
  const contexteVide: TransitionContexte = {};

  it('autorise chaque transition avec son rôle autorisé', () => {
    for (const regle of MATRICE_TRANSITIONS) {
      const estRejet =
        regle.action === 'rejeterPedagogique' ||
        regle.action === 'rejeterDirectionPedagogique' ||
        regle.action === 'rejeterDirectionPlanning';
      const contexte: TransitionContexte = estRejet
        ? { motif: 'motif de test', typeMotif: 'autre' }
        : {};
      const resultat = canTransition(
        regle.from,
        regle.action,
        ROLE_AUTORISE(regle),
        contexte,
      );
      expect(resultat.ok, `échec sur ${regle.action}`).toBe(true);
      if (resultat.ok) {
        expect(resultat.regle.action).toBe(regle.action);
        expect(resultat.regle.to).toBe(regle.to);
      }
    }
  });

  it('refuse une transition avec un rôle non autorisé', () => {
    for (const regle of MATRICE_TRANSITIONS) {
      if (regle.roles.includes(ROLE_NON_AUTORISE)) continue;
      const resultat = canTransition(
        regle.from,
        regle.action,
        ROLE_NON_AUTORISE,
        contexteVide,
      );
      expect(resultat.ok).toBe(false);
      if (!resultat.ok) {
        expect(resultat.raison).toContain('non autorisé');
      }
    }
  });

  it('refuse une action inconnue', () => {
    const resultat = canTransition('initial', 'actionInexistante', 'admin', contexteVide);
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.raison).toContain('inconnue');
    }
  });

  it('refuse une transition depuis un mauvais état', () => {
    const regle = MATRICE_TRANSITIONS[0]!; // initial -> rep_pedag
    const resultat = canTransition('brouillon', regle.action, 'admin', contexteVide);
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.raison).toContain('interdite');
      expect(resultat.raison).toContain(regle.from);
    }
  });

  it('refuse un rejet sans motif', () => {
    const rejet = MATRICE_TRANSITIONS.find(
      (r) => r.action === 'rejeterPedagogique',
    );
    if (!rejet) throw new Error('règle rejeterPedagogique introuvable');
    const resultat = canTransition(
      rejet.from,
      rejet.action,
      'rdep',
      {},
    );
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.raison).toContain('motif est obligatoire');
    }
  });

  it('refuse un rejet avec motif vide', () => {
    const rejet = MATRICE_TRANSITIONS.find(
      (r) => r.action === 'rejeterPedagogique',
    );
    if (!rejet) throw new Error('règle rejeterPedagogique introuvable');
    const resultat = canTransition(
      rejet.from,
      rejet.action,
      'rdep',
      { motif: '   ' },
    );
    expect(resultat.ok).toBe(false);
  });

  it('accepte un rejet avec motif et typeMotif', () => {
    const rejet = MATRICE_TRANSITIONS.find(
      (r) => r.action === 'rejeterDirectionPedagogique',
    );
    if (!rejet) throw new Error('règle rejeterDirectionPedagogique introuvable');
    const resultat = canTransition(
      rejet.from,
      rejet.action,
      'dir',
      { motif: 'Charge incohérente', typeMotif: 'pedagogique' },
    );
    expect(resultat.ok).toBe(true);
  });

  it('transitionsDepuis retourne les règles dont from correspond', () => {
    const depuisInitial = transitionsDepuis('initial');
    expect(depuisInitial.length).toBe(1);
    expect(depuisInitial[0]!.action).toBe('creerRepartition');

    const depuisValide = transitionsDepuis('valide');
    expect(depuisValide.length).toBe(2);
    const actionsValide = depuisValide.map((r) => r.action).sort();
    expect(actionsValide).toEqual(['archiverSansPublier', 'publier'].sort());

    const depuisPublie = transitionsDepuis('publie');
    expect(depuisPublie.length).toBe(1);
    expect(depuisPublie[0]!.action).toBe('archiver');

    const depuisArchive = transitionsDepuis('archive');
    expect(depuisArchive.length).toBe(1);
    expect(depuisArchive[0]!.action).toBe('nouvelleVersionArchive');

    const depuisInexistant = transitionsDepuis('etatInexistant');
    expect(depuisInexistant).toHaveLength(0);
  });
});
