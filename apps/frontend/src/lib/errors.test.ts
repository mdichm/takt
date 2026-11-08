// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { estErreurAuth, mapHttpError, MESSAGES_ERREUR_FR, versMessageActionnable } from './errors';

describe('catalogue d’erreurs (8 codes du backend)', () => {
  it.each([
    ['VALIDATION_ERROR', 'Les informations saisies sont invalides. Vérifiez les champs indiqués.'],
    ['UNAUTHORIZED', 'Votre session a expiré. Reconnectez-vous pour continuer.'],
    [
      'FORBIDDEN',
      "Vous n'avez pas les droits nécessaires pour cette action. Contactez un administrateur.",
    ],
    ['NOT_FOUND', 'La ressource demandée est introuvable ou a été supprimée.'],
    [
      'WORKFLOW_INVALID_TRANSITION',
      'Cette action n’est pas autorisée dans l’état actuel de la ressource.',
    ],
    [
      'SEANCE_LOCKED',
      'Cette séance est verrouillée par un autre utilisateur. Déverrouillez-la ou contactez-la.',
    ],
    ['RATE_LIMITED', 'Trop de tentatives. Patientez quelques instants avant de réessayer.'],
    [
      'INTERNAL_ERROR',
      'Une erreur interne est survenue. Réessayez plus tard ou contactez le support.',
    ],
  ])('associe le code %s à son message français', (code, attendu) => {
    expect(MESSAGES_ERREUR_FR[code as keyof typeof MESSAGES_ERREUR_FR]).toBe(attendu);
  });

  it('couvre l’intégralité du catalogue des 8 codes', () => {
    expect(Object.keys(MESSAGES_ERREUR_FR)).toHaveLength(8);
  });
});

describe('versMessageActionnable', () => {
  it('utilise le message du serveur quand il est présent (priorité)', () => {
    const erreur = {
      code: 'WORKFLOW_INVALID_TRANSITION' as const,
      statut: 409,
      message: 'Impossible de publier une version déjà verrouillée.',
      details: null,
    };
    expect(versMessageActionnable(erreur)).toBe(
      'Impossible de publier une version déjà verrouillée.',
    );
  });

  it('retourne le message générique du catalogue quand le serveur est silencieux', () => {
    const erreur = { code: 'INTERNAL_ERROR' as const, statut: 500, message: '', details: null };
    expect(versMessageActionnable(erreur)).toBe(
      'Une erreur interne est survenue. Réessayez plus tard ou contactez le support.',
    );
  });

  it('ne retourne jamais une chaîne vide pour un code connu', () => {
    const erreur = { code: 'FORBIDDEN' as const, statut: 403, message: '', details: null };
    expect(versMessageActionnable(erreur)).toBe(
      "Vous n'avez pas les droits nécessaires pour cette action. Contactez un administrateur.",
    );
  });
});

describe('estErreurAuth', () => {
  it('retourne true pour UNAUTHORIZED', () => {
    expect(estErreurAuth({ code: 'UNAUTHORIZED', statut: 401, message: '', details: null })).toBe(
      true,
    );
  });

  it('retourne false pour les autres codes', () => {
    expect(estErreurAuth({ code: 'FORBIDDEN', statut: 403, message: '', details: null })).toBe(
      false,
    );
    expect(estErreurAuth({ code: 'NOT_FOUND', statut: 404, message: '', details: null })).toBe(
      false,
    );
    expect(estErreurAuth({ code: 'INTERNAL_ERROR', statut: 500, message: '', details: null })).toBe(
      false,
    );
  });
});

describe('mapHttpError', () => {
  it('mappe un 401 avec le code et le message du corps', () => {
    const reponse = new Response(null, { status: 401 });
    const erreur = mapHttpError(reponse, {
      code: 'UNAUTHORIZED',
      message: 'Token expiré',
      requestId: 'req-123',
    });
    expect(erreur).toBeInstanceOf(Error);
    expect(erreur.code).toBe('UNAUTHORIZED');
    expect(erreur.statut).toBe(401);
    expect(erreur.message).toBe('Token expiré');
    expect(erreur.requestId).toBe('req-123');
  });

  it('utilise le message générique du catalogue quand le corps est silencieux', () => {
    const reponse = new Response(null, { status: 403 });
    const erreur = mapHttpError(reponse);
    expect(erreur.code).toBe('FORBIDDEN');
    expect(erreur.statut).toBe(403);
    expect(erreur.message).toBe(
      "Vous n'avez pas les droits nécessaires pour cette action. Contactez un administrateur.",
    );
  });

  it('défault à INTERNAL_ERROR sur un code inconnu ou absent', () => {
    const reponse = new Response(null, { status: 500 });
    const erreur = mapHttpError(reponse, { code: 'INCONNU' as never });
    expect(erreur.code).toBe('INTERNAL_ERROR');
    expect(erreur.statut).toBe(500);
  });

  it('conserve les details quand fournis', () => {
    const reponse = new Response(null, { status: 400 });
    const erreur = mapHttpError(reponse, {
      code: 'VALIDATION_ERROR',
      details: { champ: 'email' },
    });
    expect(erreur.details).toEqual({ champ: 'email' });
  });
});
