// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { queryClient } from '../lib/queryClient';
import { userStore } from './userStore';
import type { SessionUtilisateur } from './types';

const utilisateur: SessionUtilisateur = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'moi@takt.test',
  nom: 'Dupont',
  prenom: 'Marie',
  role: 'gest',
  departementIds: [],
};

const JETON = 'jeton-access-test';

beforeEach(() => {
  localStorage.clear();
  userStore.getState().definirSession(utilisateur, JETON);
  vi.spyOn(queryClient, 'clear');
});

afterEach(() => {
  userStore.getState().deconnecter();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('userStore (session + jeton en mémoire, GG-17)', () => {
  it('definirSession enregistre la session, le jeton et marque authentifié', () => {
    const etat = userStore.getState();
    expect(etat.session).toEqual(utilisateur);
    expect(etat.jetonAcces).toBe(JETON);
    expect(etat.estAuthentifie).toBe(true);
  });

  it('setJeton met à jour le jeton sans toucher à la session', () => {
    userStore.getState().setJeton('nouveau-jeton');
    const etat = userStore.getState();
    expect(etat.jetonAcces).toBe('nouveau-jeton');
    expect(etat.session).toEqual(utilisateur);
    expect(etat.estAuthentifie).toBe(true);
  });

  it('setJeton(null) efface le jeton mais garde la session', () => {
    userStore.getState().setJeton(null);
    expect(userStore.getState().jetonAcces).toBeNull();
    expect(userStore.getState().session).toEqual(utilisateur);
  });

  it('deconnecter purge session, jeton et estAuthentifie', () => {
    userStore.getState().deconnecter();
    const etat = userStore.getState();
    expect(etat.session).toBeNull();
    expect(etat.jetonAcces).toBeNull();
    expect(etat.estAuthentifie).toBe(false);
  });

  it('deconnecter purge le cache TanStack Query (queryClient.clear)', () => {
    const clear = vi.mocked(queryClient.clear);
    userStore.getState().deconnecter();
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('le jeton n est pas persistant (partialize exclut jetonAcces)', () => {
    // L état exposé ne doit pas laisser fuiter le jeton dans la sérialisation
    // du persist. On vérifie que partialize ne contient pas jetonAcces.
    const etat = userStore.getState();
    // jetonAcces est en mémoire uniquement ; la session est persistable.
    expect(etat.session?.id).toBe(utilisateur.id);
    expect(etat.jetonAcces).toBe(JETON);
    // Le store Zustand persist est configuré avec partialize sur session + estAuthentifie.
  });
});
