// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestReferentiels, nettoyerContexteTest } from '../test-helper.integration';

const CODE_GRADE_EXISTANT = '00000000-0000-0000-0000-000000000101';
const DEPARTEMENT_INFO = '00000000-0000-0000-0000-000000000201';
const DEPARTEMENT_MATH = '00000000-0000-0000-0000-000000000202';
const ETABLISSEMENT_ID = '00000000-0000-0000-0000-000000000100';

describe('Enseignant (TAKT-L04-03)', () => {
  let ctx: Awaited<ReturnType<typeof creerContexteTestReferentiels>>;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();

    await ctx.prisma.grade.upsert({
      where: { id: CODE_GRADE_EXISTANT },
      update: { code: 'L1-TEST', libelle: 'Licence 1 test' },
      create: { id: CODE_GRADE_EXISTANT, code: 'L1-TEST', libelle: 'Licence 1 test' },
    });

    await ctx.prisma.etablissement.upsert({
      where: { id: ETABLISSEMENT_ID },
      update: { code: 'TAKT', libelle: 'Université de Takt' },
      create: { id: ETABLISSEMENT_ID, code: 'TAKT', libelle: 'Université de Takt' },
    });

    await ctx.prisma.departement.upsert({
      where: { id: DEPARTEMENT_INFO },
      update: { code: 'INFO', libelle: 'Informatique' },
      create: { id: DEPARTEMENT_INFO, code: 'INFO', libelle: 'Informatique', etablissementId: ETABLISSEMENT_ID },
    });
    await ctx.prisma.departement.upsert({
      where: { id: DEPARTEMENT_MATH },
      update: { code: 'MATH', libelle: 'Mathématiques' },
      create: { id: DEPARTEMENT_MATH, code: 'MATH', libelle: 'Mathématiques', etablissementId: ETABLISSEMENT_ID },
    });
  });

  afterAll(async () => {
    await nettoyerContexteTest(ctx);
    await ctx.prisma.enseignantDepartement.deleteMany({});
    await ctx.prisma.enseignant.deleteMany({ where: { matricule: { contains: 'TEST' } } });
    await ctx.prisma.grade.deleteMany({ where: { id: CODE_GRADE_EXISTANT } });
    await ctx.prisma.departement.deleteMany({ where: { id: { in: [DEPARTEMENT_INFO, DEPARTEMENT_MATH] } } });
    await ctx.prisma.etablissement.deleteMany({ where: { id: ETABLISSEMENT_ID } });
  });

  it('GET /referentiels/enseignants : liste (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/enseignants')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data).toBeDefined();
    expect(Array.isArray(reponse.body.data.items)).toBe(true);

  it('POST /referentiels/enseignants : crée avec 2 départements (201)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/enseignants')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        matricule: 'ENS-TEST-001',
        nom: 'Benoit',
        prenom: 'Dupont',
        email: 'benoit.dupont@takt.test',
        gradeId: CODE_GRADE_EXISTANT,
        departementIds: [DEPARTEMENT_INFO, DEPARTEMENT_MATH],
      })
      .expect(201);
    expect(reponse.body.data.id).toBeDefined();
    expect(reponse.body.data.matricule).toBe('ENS-TEST-001');
    expect(reponse.body.data.departements).toHaveLength(2);
    expect(reponse.body.data.departements.map((d: any) => d.code)).toContain('INFO');
    expect(reponse.body.data.departements.map((d: any) => d.code)).toContain('MATH');
    ctx.idsACleaner.push(reponse.body.data.id);
  });

  it('POST /referentiels/enseignants : matricule en doublon (400)', async () => {
    const cree = await ctx.prisma.enseignant.create({
      data: {
        matricule: 'ENS-DOUBLON',
        nom: 'Doublon',
        prenom: 'Test',
        email: 'doublon@takt.test',
      },
    });
    ctx.idsACleaner.push(cree.id);

    const reponse = await ctx.agent
      .post('/api/v1/referentiels/enseignants')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        matricule: 'ENS-DOUBLON',
        nom: 'Autre',
        prenom: 'Enseignant',
        email: 'autre@takt.test',
      })
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /referentiels/enseignants?search=Benoit : recherche par nom (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/enseignants?search=Benoit')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.items.length).toBeGreaterThan(0);
    const trouve = reponse.body.data.items.find(
      (e: any) => e.nom === 'Benoit' || e.prenom === 'Benoit',
    );
    expect(trouve).toBeDefined();
  });

  it('GET /referentiels/enseignants?search=Dupont : recherche par prénom (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/enseignants?search=Dupont')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.items.length).toBeGreaterThan(0);
    const trouve = reponse.body.data.items.find(
      (e: any) => e.nom === 'Dupont' || e.prenom === 'Dupont',
    );
    expect(trouve).toBeDefined();
  });

  it('GET /referentiels/enseignants/:id : détail (200 / 404)', async () => {
    const cree = await ctx.agent
      .post('/api/v1/referentiels/enseignants')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        matricule: 'ENS-DETAIL',
        nom: 'Detail',
        prenom: 'Test',
        email: 'detail@takt.test',
        gradeId: CODE_GRADE_EXISTANT,
        departementIds: [DEPARTEMENT_INFO],
      })
      .expect(201);
    const id = cree.body.data.id;
    ctx.idsACleaner.push(id);

    const reponse = await ctx.agent
      .get(`/api/v1/referentiels/enseignants/${id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(id);
    expect(reponse.body.data.matricule).toBe('ENS-DETAIL');

    const reponse404 = await ctx.agent
      .get('/api/v1/referentiels/enseignants/00000000-0000-0000-0000-000000000999')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /referentiels/enseignants/:id : modifie (200 / 404)', async () => {
    const cree = await ctx.agent
      .post('/api/v1/referentiels/enseignants')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        matricule: 'ENS-UPDATE',
        nom: 'Avant',
        prenom: 'Modif',
        email: 'avant@takt.test',
        departementIds: [DEPARTEMENT_INFO],
      })
      .expect(201);
    const id = cree.body.data.id;
    ctx.idsACleaner.push(id);

    const reponse = await ctx.agent
      .patch(`/api/v1/referentiels/enseignants/${id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ nom: 'Après', departementIds: [DEPARTEMENT_MATH] })
      .expect(200);
    expect(reponse.body.data.nom).toBe('Après');
    expect(reponse.body.data.departements).toHaveLength(1);
    expect(reponse.body.data.departements[0].code).toBe('MATH');

    const reponse404 = await ctx.agent
      .patch('/api/v1/referentiels/enseignants/00000000-0000-0000-0000-000000000999')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ nom: 'X' })
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /referentiels/enseignants/:id : supprime (200 / 404)', async () => {
    const cree = await ctx.agent
      .post('/api/v1/referentiels/enseignants')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        matricule: 'ENS-DELETE',
        nom: 'Delete',
        prenom: 'Test',
        email: 'delete@takt.test',
      })
      .expect(201);
    const id = cree.body.data.id;

    const reponse = await ctx.agent
      .delete(`/api/v1/referentiels/enseignants/${id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(id);

    const reponse404 = await ctx.agent
      .delete('/api/v1/referentiels/enseignants/00000000-0000-0000-0000-000000000999')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /referentiels/enseignants/:id : 409 si lié à des départements', async () => {
    const lie = await ctx.prisma.enseignant.create({
      data: {
        matricule: 'ENS-LIE',
        nom: 'Lie',
        prenom: 'Test',
        email: 'lie@takt.test',
        departements: {
          create: { departement: { connect: { id: DEPARTEMENT_INFO } } },
        },
      },
    });
    ctx.idsACleaner.push(lie.id);

    const reponse409 = await ctx.agent
      .delete(`/api/v1/referentiels/enseignants/${lie.id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(409);
    expect(reponse409.body.error.code).toBe('WORKFLOW_INVALID_TRANSITION');
  });
});
  });