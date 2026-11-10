// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestReferentiels, nettoyerContexteTest } from '../test-helper.integration';

const ID_TYPE = '00000000-0000-0000-0000-000000000301';
const ID_GRADE = '00000000-0000-0000-0000-000000000302';
const ID_MODULE = '00000000-0000-0000-0000-000000000303';
const ID_MATIERE_EXISTANT = '00000000-0000-0000-0000-000000000304';
const ID_MATIERE_INEXISTANT = '00000000-0000-0000-0000-000000000305';

describe('Matière (TAKT-L04-02)', () => {
  let ctx: Awaited<ReturnType<typeof creerContexteTestReferentiels>>;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();

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
    await ctx.prisma.gradeTypeEnseignement.upsert({
      where: { gradeId_typeEnseignementId: { gradeId: ID_GRADE, typeEnseignementId: ID_TYPE } },
      update: {},
      create: { gradeId: ID_GRADE, typeEnseignementId: ID_TYPE },
    });
    await ctx.prisma.module.upsert({
      where: { id: ID_MODULE },
      update: {},
      create: {
        id: ID_MODULE,
        code: 'MOD-TEST',
        libelle: 'Module test',
        typeEnseignementId: ID_TYPE,
        gradeId: ID_GRADE,
      },
    });
    await ctx.prisma.matiere.upsert({
      where: { id: ID_MATIERE_EXISTANT },
      update: {},
      create: {
        id: ID_MATIERE_EXISTANT,
        code: 'MAT-TEST',
        libelle: 'Matière test',
        moduleId: ID_MODULE,
      },
    });
  });

  afterAll(async () => {
    await nettoyerContexteTest(ctx);
    await ctx.prisma.matiere.deleteMany({ where: { moduleId: ID_MODULE } });
    await ctx.prisma.matiere.deleteMany({ where: { id: { in: [ID_MATIERE_EXISTANT] } } });
    await ctx.prisma.module.deleteMany({ where: { id: ID_MODULE } });
    await ctx.prisma.gradeTypeEnseignement.deleteMany({
      where: { gradeId: ID_GRADE, typeEnseignementId: ID_TYPE },
    });
    await ctx.prisma.grade.deleteMany({ where: { id: ID_GRADE } });
    await ctx.prisma.typeEnseignement.deleteMany({ where: { id: ID_TYPE } });
  });

  it('GET /referentiels/matieres : liste (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/matieres')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data).toBeDefined();
    expect(Array.isArray(reponse.body.data.items)).toBe(true);
  });

  it('POST /referentiels/matieres : crée (201)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/matieres')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'MAT2-TEST', libelle: 'Matière test 2', moduleId: ID_MODULE })
      .expect(201);
    expect(reponse.body.data.id).toBeDefined();
    expect(reponse.body.data.code).toBe('MAT2-TEST');
    ctx.idsACleaner.push(reponse.body.data.id);
  });

  it('POST /referentiels/matieres : module inexistant (400)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/matieres')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        code: 'MAT-INVALIDE',
        libelle: 'Invalide',
        moduleId: '00000000-0000-0000-0000-000000000999',
      })
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /referentiels/matieres/:id : détail (200 / 404)', async () => {
    const reponse = await ctx.agent
      .get(`/api/v1/referentiels/matieres/${ID_MATIERE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(ID_MATIERE_EXISTANT);

    const reponse404 = await ctx.agent
      .get(`/api/v1/referentiels/matieres/${ID_MATIERE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /referentiels/matieres/:id : modifie (200 / 404)', async () => {
    const reponse = await ctx.agent
      .patch(`/api/v1/referentiels/matieres/${ID_MATIERE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ libelle: 'Matière modifiée' })
      .expect(200);
    expect(reponse.body.data.libelle).toBe('Matière modifiée');

    const reponse404 = await ctx.agent
      .patch(`/api/v1/referentiels/matieres/${ID_MATIERE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ libelle: 'X' })
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /referentiels/matieres/:id : supprime (200 / 404)', async () => {
    const cree = await ctx.agent
      .post('/api/v1/referentiels/matieres')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'MAT3-TEST', libelle: 'Matière test 3', moduleId: ID_MODULE })
      .expect(201);
    const id = cree.body.data.id;
    ctx.idsACleaner.push(id);

    const reponse = await ctx.agent
      .delete(`/api/v1/referentiels/matieres/${id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(id);

    const reponse404 = await ctx.agent
      .delete(`/api/v1/referentiels/matieres/${ID_MATIERE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });
});
