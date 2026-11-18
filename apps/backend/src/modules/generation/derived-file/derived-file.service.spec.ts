// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { PrismaClient } from '@takt/db';
import { DerivedFileService } from './derived-file.service';
import { SnapshotService } from '../../versions/snapshot/snapshot.service';

// Données de snapshot minimales pour les tests du service
function snapshotDonnees(): Record<string, unknown> {
  return {
    versionId: '22222222-2222-2222-2222-222222222222',
    semestre: { numero: 1 },
    activites: [],
    groupes: [],
    enseignants: [],
    salles: [],
    creneaux: [],
    seances: [],
    contraintes: [],
    verrous: [],
    matieres: [],
  };
}

describe('DerivedFileService (TAKT-L07-01)', () => {
  it('construireEtEcrire écrit le fichier et retourne le résultat', async () => {
    const snapshot = {
      id: 'snap-11111111-1111-1111-1111-111111111111',
      donnees: snapshotDonnees(),
    };
    let cheminRecu: string | null = null;
    let contenuRecu: { donnees: unknown; typeMime: string } | null = null;
    const stockage = {
      ecrire: async (chemin: string, contenu: { donnees: unknown; typeMime: string }) => {
        cheminRecu = chemin;
        contenuRecu = contenu;
      },
      lire: async () => ({ donnees: new Uint8Array(0), typeMime: 'application/json' }),
    };
    const snapshotService = { obtenirSnapshotCourant: async () => snapshot };
    const svc = new DerivedFileService(undefined as unknown as PrismaClient, stockage, snapshotService as unknown as SnapshotService);

    const resultat = await svc.construireEtEcrire('22222222-2222-2222-2222-222222222222', {
      generationId: '33333333-3333-3333-3333-333333333333',
      createdAt: '2026-11-15T10:00:00Z',
    });

    expect(resultat.snapshotId).toBe('snap-11111111-1111-1111-1111-111111111111');
    expect(resultat.versionId).toBe('22222222-2222-2222-2222-222222222222');
    expect(resultat.chemin).toBe('derived/snap-11111111-1111-1111-1111-111111111111.json');
    expect(resultat.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(resultat.tailleOctets).toBeGreaterThan(0);
    expect(cheminRecu).toBe(resultat.chemin);
    expect(contenuRecu!.donnees).toBeInstanceOf(Uint8Array);
    expect(contenuRecu!.typeMime).toBe('application/json');
  });

  it('lire retourne le fichier stocké', async () => {
    const snapshot = {
      id: 'snap-11111111-1111-1111-1111-111111111111',
      donnees: snapshotDonnees(),
    };
    const fichierAttendu = { cle: 'valeur' };
    const stockage = {
      ecrire: async () => undefined,
      lire: async () => ({ donnees: Buffer.from(JSON.stringify(fichierAttendu)), typeMime: 'application/json' }),
    };
    const snapshotService = { obtenirSnapshotCourant: async () => snapshot };
    const svc = new DerivedFileService(undefined as unknown as PrismaClient, stockage, snapshotService as unknown as SnapshotService);

    const resultat = await svc.lire('22222222-2222-2222-2222-222222222222');
    expect(resultat.chemin).toBe('derived/snap-11111111-1111-1111-1111-111111111111.json');
    expect(resultat.fichier).toEqual(fichierAttendu);
  });
});
