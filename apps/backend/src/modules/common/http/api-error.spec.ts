// ============================================================================
// TAKT — Tests unitaires du catalogue d'erreurs HTTP
// Fichier : apps/backend/src/modules/common/http/api-error.spec.ts
// Ticket : TAKT-L01-03 — ST_TAKT §3.4
// ============================================================================

import { describe, it, expect } from 'vitest';
import { codeErreurPourStatut, CODES_ERREUR_API } from './api-error';

describe('codeErreurPourStatut', () => {
  it('associe chaque code HTTP du catalogue à son code métier', () => {
    expect(codeErreurPourStatut(400)).toBe('VALIDATION_ERROR');
    expect(codeErreurPourStatut(401)).toBe('UNAUTHORIZED');
    expect(codeErreurPourStatut(403)).toBe('FORBIDDEN');
    expect(codeErreurPourStatut(404)).toBe('NOT_FOUND');
    expect(codeErreurPourStatut(409)).toBe('WORKFLOW_INVALID_TRANSITION');
    expect(codeErreurPourStatut(423)).toBe('SEANCE_LOCKED');
    expect(codeErreurPourStatut(429)).toBe('RATE_LIMITED');
    expect(codeErreurPourStatut(500)).toBe('INTERNAL_ERROR');
  });

  it('retombe sur INTERNAL_ERROR pour un statut hors catalogue', () => {
    expect(codeErreurPourStatut(418)).toBe('INTERNAL_ERROR');
    expect(codeErreurPourStatut(502)).toBe('INTERNAL_ERROR');
    expect(codeErreurPourStatut(0)).toBe('INTERNAL_ERROR');
  });

  it('expose exactement les 8 codes du catalogue ST_TAKT §3.4', () => {
    expect(Object.values(CODES_ERREUR_API).sort()).toEqual(
      [
        'FORBIDDEN',
        'INTERNAL_ERROR',
        'NOT_FOUND',
        'RATE_LIMITED',
        'SEANCE_LOCKED',
        'UNAUTHORIZED',
        'VALIDATION_ERROR',
        'WORKFLOW_INVALID_TRANSITION',
      ].sort(),
    );
  });
});
