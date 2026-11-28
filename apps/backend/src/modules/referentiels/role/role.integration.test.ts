// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestReferentiels, nettoyerContexteTest } from '../test-helper.integration';

describe('Role (TAKT-L09-04)', () => {
  let ctx: Awaited<ReturnType<typeof creerContexteTestReferentiels>>;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();
  });

  afterAll(async () => {
    await nettoyerContexteTest(ctx);
  });

  it('GET /referentiels/roles : liste des rôles (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/roles')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(Array.isArray(reponse.body.data)).toBe(true);
    expect(reponse.body.data.length).toBeGreaterThan(0);
    // Vérifie que les 4 rôles standards sont présents
    const codes = reponse.body.data.map((r: { code: string }) => r.code);
    expect(codes).toContain('admin');
    expect(codes).toContain('gest');
    expect(codes).toContain('rdep');
    expect(codes).toContain('dir');
  });
});