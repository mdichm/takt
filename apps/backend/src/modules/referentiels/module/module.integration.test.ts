// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestReferentiels, nettoyerContexteTest } from '../test-helper.integration';

const ID_TYPE = '00000000-0000-0000-0000-000000000201';
const ID_GRADE = '00000000-0000-0000-0000-000000000202';
const ID_MODULE_EXISTANT = '00000000-0000-0000-0000-000000000203';
const ID_MODULE_INEXISTANT = '00000000-0000-0000-0000-000000000204';

describe('Module (TAKT-L04-02)', () => {
  let ctx: Awaited<ReturnType<typeof creerContexteTestReferentiels>>;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();

    // Crée un type d’enseignement et un grade de référence
    await ctx.prisma.typeEnseignement.upsert({
      where: { id: ID_TYPE },
      update: {},
      create: { id: ID_TYPE, code: 'CM-TEST', libelle: 'Cours magistral test', couleur: '#3B82F6' },
    });
    await ctx.prisma.grade.upsert({
      where: { id: ID_GRADE },
      update: {},
      create: { id: ID_GRADE, code: 'L1-TEST', libelle: 'Licence 1 test' },
    });

    // Crée le couple dans la matrice
    await ctx.prisma.gradeTypeEnseignement.upsert({
      where: { gradeId_typeEnseignementId: { gradeId: ID_GRADE, typeEnseignementId: ID_TYPE } },
      update: {},
      create: { gradeId: ID_GRADE, typeEnseignementId: ID_TYPE },
    });

    // Crée un module existant
    await ctx.prisma.module.upsert({
      where: { id: ID_MODULE_EXISTANT },
      update: {},
      create: {
        id: ID_MODULE_EXISTANT,
        code: 'MOD-TEST',
        libelle: 'Module test',
        typeEnseignementId: ID_TYPE,
        gradeId: ID_GRADE,
      },
    });
  });

  afterAll(async () => {
    await nettoyerContexteTest(ctx);
    await ctx.prisma.module.deleteMany({ where: { OR: [{ typeEnseignementId: ID_TYPE }, { gradeId: ID_GRADE }] } });
    await ctx.prisma.gradeTypeEnseignement.deleteMany({ where: { gradeId: ID_GRADE, typeEnseignementId: ID_TYPE } });
    await ctx.prisma.grade.deleteMany({ where: { id: ID_GRADE } });
    await ctx.prisma.typeEnseignement.deleteMany({ where: { id: ID_TYPE } });
  });

  it('GET /referentiels/modules : liste (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/modules')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data).toBeDefined();
    expect(Array.isArray(reponse.body.data.items)).toBe(true);
  });

  it('POST /referentiels/modules : crée (201)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/modules')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'MOD2-TEST', libelle: 'Module test 2', typeEnseignementId: ID_TYPE, gradeId: ID_GRADE })
      .expect(201);
    expect(reponse.body.data.id).toBeDefined();
    expect(reponse.body.data.code).toBe('MOD2-TEST');
    ctx.idsACleaner.push(reponse.body.data.id);
  });

  it('POST /referentiels/modules : couple inexistant (400)', async () => {
    const idTypeInvalide = '00000000-0000-0000-0000-000000000999';
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/modules')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'MOD-INVALIDE', libelle: 'Invalide', typeEnseignementId: idTypeInvalide, gradeId: ID_GRADE })
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /referentiels/modules/:id : détail (200 / 404)', async () => {
    const reponse = await ctx.agent
      .get(`/api/v1/referentiels/modules/${ID_MODULE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(ID_MODULE_EXISTANT);

    const reponse404 = await ctx.agent
      .get(`/api/v1/referentiels/modules/${ID_MODULE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /referentiels/modules/:id : modifie (200 / 404)', async () => {
    const reponse = await ctx.agent
      .patch(`/api/v1/referentiels/modules/${ID_MODULE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ libelle: 'Module modifié' })
      .expect(200);
    expect(reponse.body.data.libelle).toBe('Module modifié');

    const reponse404 = await ctx.agent
      .patch(`/api/v1/referentiels/modules/${ID_MODULE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ libelle: 'X' })
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /referentiels/modules/:id : supprime (200 / 404)', async () => {
    const cree = await ctx.agent
      .post('/api/v1/referentiels/modules')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'MOD3-TEST', libelle: 'Module test 3', typeEnseignementId: ID_TYPE, gradeId: ID_GRADE })
      .expect(201);
    const id = cree.body.data.id;
    ctx.idsACleaner.push(id);

    const reponse = await ctx.agent
      .delete(`/api/v1/referentiels/modules/${id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(id);

    const reponse404 = await ctx.agent
      .delete(`/api/v1/referentiels/modules/${ID_MODULE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });
});