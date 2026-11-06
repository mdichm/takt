// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { validerReponseApi, zReponseListe, zReponseLogin, zReponseRefresh } from './validation';

describe('schémas de réponse Zod', () => {
  const meta = { requestId: 'r1', timestamp: '2026-11-06T00:00:00Z' };

  it('accepte une réponse de connexion valide', () => {
    const donnees = {
      data: {
        accessToken: 'at.123',
        utilisateur: {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'u@takt.test',
          nom: 'Doe',
          prenom: 'John',
          role: 'gest',
        },
      },
      error: null,
      meta,
    };
    const resultat = zReponseLogin.parse(donnees);
    expect(resultat.data!.accessToken).toBe('at.123');
    expect(resultat.data!.utilisateur.email).toBe('u@takt.test');
  });

  it('refuse une réponse de connexion sans accessToken', () => {
    const donnees = {
      data: {
        accessToken: '',
        utilisateur: {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'u@takt.test',
          nom: 'Doe',
          prenom: 'John',
          role: 'gest',
        },
      },
      error: null,
      meta,
    };
    expect(zReponseLogin.safeParse(donnees).success).toBe(false);
  });

  it('accepte une réponse de rafraîchissement valide', () => {
    const donnees = { data: { accessToken: 'at.456' }, error: null, meta };
    expect(zReponseRefresh.parse(donnees).data!.accessToken).toBe('at.456');
  });

  it('refuse une réponse de rafraîchissement avec accessToken vide', () => {
    const donnees = { data: { accessToken: '' }, error: null, meta };
    expect(zReponseRefresh.safeParse(donnees).success).toBe(false);
  });

  it('construit et valide une liste paginée d’items', () => {
    const schema = zReponseListe(z.string());
    const donnees = { data: ['a', 'b'], error: null, meta };
    expect(schema.parse(donnees).data!).toEqual(['a', 'b']);
  });
});

describe('validerReponseApi', () => {
  const meta = { requestId: 'r1', timestamp: '2026-11-06T00:00:00Z' };

  it('retourne les données typées quand la réponse est valide', () => {
    const donnees = {
      data: {
        accessToken: 'at',
        utilisateur: {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'u@takt.test',
          nom: 'Doe',
          prenom: 'John',
          role: 'gest',
        },
      },
      error: null,
      meta,
    };
    const resultat = validerReponseApi(zReponseLogin, donnees);
    expect(resultat.data!.accessToken).toBe('at');
  });

  it('lève une ErreurApi VALIDATION_ERROR quand la réponse est invalide', () => {
    const donnees = { data: { accessToken: '' }, error: null, meta };
    let erreurCapturée: Error | null = null;
    try {
      validerReponseApi(zReponseLogin, donnees);
    } catch (erreur) {
      erreurCapturée = erreur as Error;
    }
    expect(erreurCapturée).not.toBeNull();
    expect(erreurCapturée).toBeInstanceOf(Error);
    expect((erreurCapturée as unknown as { code: string }).code).toBe(
      'VALIDATION_ERROR',
    );
    expect((erreurCapturée as unknown as { statut: number }).statut).toBe(400);
  });
});
