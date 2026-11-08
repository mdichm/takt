// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { versionStore } from './versionStore';
import type { VersionCourante } from './types';

const version: VersionCourante = {
  id: 'version-1',
  etat: 'brouillon',
  semestreId: undefined,
  snapshotId: undefined,
};

beforeEach(() => {
  versionStore.getState().reinitialiser();
});

afterEach(() => {
  versionStore.getState().reinitialiser();
});

describe('versionStore (version courante + interdits de mutation)', () => {
  it('definirVersion enregistre la version et l etat', () => {
    versionStore.getState().definirVersion(version.id, version.etat);
    const etat = versionStore.getState();
    expect(etat.version).toEqual(version);
    expect(etat.etat).toBe('brouillon');
    expect(etat.estModifiable()).toBe(true);
  });

  it('estModifiable est false pour publie et archive (immuable)', () => {
    versionStore.getState().definirVersion('v', 'publie');
    expect(versionStore.getState().estModifiable()).toBe(false);

    versionStore.getState().definirVersion('v', 'archive');
    expect(versionStore.getState().estModifiable()).toBe(false);
  });

  it('estModifiable est true pour brouillon et edition', () => {
    versionStore.getState().definirVersion('v', 'brouillon');
    expect(versionStore.getState().estModifiable()).toBe(true);

    versionStore.getState().definirVersion('v', 'edition');
    expect(versionStore.getState().estModifiable()).toBe(true);
  });

  it('ajouterInterdit ajoute une interdiction, supprimerInterdit la retire', () => {
    const magasin = versionStore.getState();
    magasin.ajouterInterdit('EDITER', 'Version en génération');
    expect(magasin.interditsDeMutation()).toHaveLength(1);
    expect(magasin.interditsDeMutation()[0]).toEqual({
      action: 'EDITER',
      raison: 'Version en génération',
    });

    magasin.supprimerInterdit('EDITER');
    expect(magasin.interditsDeMutation()).toHaveLength(0);
  });

  it('ajouterInterdit remplace une interdiction existante pour la même action', () => {
    const magasin = versionStore.getState();
    magasin.ajouterInterdit('EDITER', 'Raison 1');
    magasin.ajouterInterdit('EDITER', 'Raison 2');
    const interdits = magasin.interditsDeMutation();
    expect(interdits).toHaveLength(1);
    expect(interdits[0]!.raison).toBe('Raison 2');
  });

  it('reinitialiser efface tout', () => {
    versionStore.getState().definirVersion('v', 'brouillon');
    versionStore.getState().ajouterInterdit('EDITER', 'x');
    versionStore.getState().reinitialiser();
    const etat = versionStore.getState();
    expect(etat.version).toBeNull();
    expect(etat.etat).toBeNull();
    expect(etat.interditsDeMutation()).toHaveLength(0);
    expect(etat.estModifiable()).toBe(false);
  });
});
