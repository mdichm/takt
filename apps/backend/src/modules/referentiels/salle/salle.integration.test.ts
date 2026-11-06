// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestReferentiels, nettoyerContexteTest } from '../test-helper.integration';

const ID_TYPE_SALLE = '00000000-0000-0000-0000-000000000601';
const ID_SITE = '00000000-0000-0000-0000-000000000501';
const ID_EQUIPEMENT = '00000000-0000-0000-0000-000000000701';
const ID_SALLE_EXISTANT = '00000000-0000-0000-0000-000000000801';
const ID_SALLE_INEXISTANT = '00000000-0000-0000-0000-000000000802';

describe('Salle (TAKT-L04-04)', () => {
  let ctx: Awaited<ReturnType<typeof creerContexteTestReferentiels>>;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();
    await ctx.prisma.site.upsert({
      where: { id: ID_SITE },
      update: { code: 'SITE-TEST', libelle: 'Site de test' },
      create: { id: ID_SITE, code: 'SITE-TEST', libelle: 'Site de test' },
    });
    await ctx.prisma.typeSalle.upsert({
      where: { id: ID_TYPE_SALLE },
      update: { code: 'CM-TEST', libelle: 'Cours magistral test' },
      create: { id: ID_TYPE_SALLE, code: 'CM-TEST', libelle: 'Cours magistral test' },
    });
    await ctx.prisma.equipement.upsert({
      where: { id: ID_EQUIPEMENT },
      update: { code: 'VIDEOPRJ', libelle: 'Vidéo projecteur test' },
      create: { id: ID_EQUIPEMENT, code: 'VIDEOPRJ', libelle: 'Vidéo projecteur test' },
    });
    await ctx.prisma.salle.upsert({
      where: { id: ID_SALLE_EXISTANT },
      update: { code: 'SALLE-001', libelle: 'Salle de test' },
      create: {
        id: ID_SALLE_EXISTANT,
        code: 'SALLE-001',
        libelle: 'Salle de test',
        typeSalleId: ID_TYPE_SALLE,
        siteId: ID_SITE,
        capacite: 60,
      },
    });
  });

  afterAll(async () => {
    await nettoyerContexteTest(ctx);
    await ctx.prisma.salleEquipement.deleteMany({ where: { salleId: ID_SALLE_EXISTANT } });
    await ctx.prisma.salle.deleteMany({ where: { id: { in: [ID_SALLE_EXISTANT] } } });
    await ctx.prisma.equipement.deleteMany({ where: { id: { in: [ID_EQUIPEMENT] } } });
    await ctx.prisma.typeSalle.deleteMany({ where: { id: { in: [ID_TYPE_SALLE] } } });
    await ctx.prisma.site.deleteMany({ where: { id: { in: [ID_SITE] } } });
  });

  it('GET /referentiels/salles : liste (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/salles')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data).toBeDefined();
    expect(Array.isArray(reponse.body.data.items)).toBe(true);
    expect(reponse.body.data.meta).toBeDefined();
  });

  it('POST /referentiels/salles : crée avec équipements (201)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/salles')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        code: 'SALLE-999',
        libelle: 'Salle avec équipement',
        typeSalleId: ID_TYPE_SALLE,
        siteId: ID_SITE,
        capacite: 40,
        equipements: [{ equipementId: ID_EQUIPEMENT, quantite: 2 }],
      })
      .expect(201);
    expect(reponse.body.data.id).toBeDefined();
    expect(reponse.body.data.code).toBe('SALLE-999');
    expect(Array.isArray(reponse.body.data.equipements)).toBe(true);
    expect(reponse.body.data.equipements[0].equipementId).toBe(ID_EQUIPEMENT);
    expect(reponse.body.data.equipements[0].quantite).toBe(2);
    ctx.idsACleaner.push(reponse.body.data.id);
  });

  it('POST /referentiels/salles : capacité <= 0 (400)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/salles')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        code: 'SALLE-BAD',
        libelle: 'Salle capacité invalide',
        typeSalleId: ID_TYPE_SALLE,
        siteId: ID_SITE,
        capacite: 0,
      })
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /referentiels/salles : doublon code (400)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/salles')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        code: 'SALLE-001',
        libelle: 'Doublon',
        typeSalleId: ID_TYPE_SALLE,
        siteId: ID_SITE,
        capacite: 30,
      })
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /referentiels/salles/:id : détail (200 / 404)', async () => {
    const reponse = await ctx.agent
      .get(`/api/v1/referentiels/salles/${ID_SALLE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(ID_SALLE_EXISTANT);

    const reponse404 = await ctx.agent
      .get(`/api/v1/referentiels/salles/${ID_SALLE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /referentiels/salles : filtre capaciteMin/capaciteMax (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/salles?capaciteMin=50&capaciteMax=100')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.items.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /referentiels/salles : filtre equipement par code (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/salles?equipement=VIDEOPRJ')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(Array.isArray(reponse.body.data.items)).toBe(true);
  });

  it('PATCH /referentiels/salles/:id : modifie (200 / 404)', async () => {
    const reponse = await ctx.agent
      .patch(`/api/v1/referentiels/salles/${ID_SALLE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ capacite: 80 })
      .expect(200);
    expect(reponse.body.data.capacite).toBe(80);

    const reponse404 = await ctx.agent
      .patch(`/api/v1/referentiels/salles/${ID_SALLE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ capacite: 10 })
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /referentiels/salles/:id : supprime (200 / 404)', async () => {
    const cree = await ctx.agent
      .post('/api/v1/referentiels/salles')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        code: 'SALLE-DELETE',
        libelle: 'Salle à supprimer',
        typeSalleId: ID_TYPE_SALLE,
        siteId: ID_SITE,
        capacite: 30,
      })
      .expect(201);
    const id = cree.body.data.id;
    ctx.idsACleaner.push(id);

    const reponse = await ctx.agent
      .delete(`/api/v1/referentiels/salles/${id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(id);

    const reponse404 = await ctx.agent
      .delete(`/api/v1/referentiels/salles/${ID_SALLE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });
});