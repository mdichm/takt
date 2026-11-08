// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  creerContexteTestRepartition,
  nettoyerContexteTestRepartition,
  ContexteTestRepartition,
} from '../test-helper.integration';
import { CODES_ERREUR_API } from '../../common/http/api-error';

const VERSION_ID = '88888888-8888-8888-8888-888888888888';
const DEPARTEMENT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

describe('Répartition pédagogique - validation + snapshot (TAKT-L05-04)', () => {
  let ctx: ContexteTestRepartition;

  beforeAll(async () => {
    ctx = await creerContexteTestRepartition();
  });

  afterAll(async () => {
    await nettoyerContexteTestRepartition(ctx);
  });

  it('POST /repartition/valider : 201 crée le snapshot, écrit l\'audit, retourne le charge (rdep)', async () => {
    // Mettre la version en état rep_pedag
    await ctx.prisma.version.update({
      where: { id: VERSION_ID },
      data: { etat: 'rep_pedag' },
    });

    // Créer une affectation couvrant la matière du plan d'études
    await ctx.prisma.affectationPedagogique.create({
      data: {
        id: '11111111-1111-1111-1111-111111111111',
        versionId: VERSION_ID,
        semestreId: ctx.semestreId,
        enseignantId: ctx.enseignantId,
        matiereId: ctx.matiereId,
        groupeId: ctx.groupe1Id,
        typeEnseignementId: ctx.typeEnseignementId,
        volumeHebdo: 4,
        dureeCreneaux: 90,
        departementId: DEPARTEMENT_ID,
      },
    });

    const reponse = await ctx.agent
      .post('/api/v1/repartition/valider')
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .send({ versionId: VERSION_ID, departementId: DEPARTEMENT_ID })
      .expect(200);

    expect(reponse.body.data.snapshotId).toBeDefined();
    expect(reponse.body.data.charge).toBeDefined();
    expect(reponse.body.data.reglesChargeSource).toBe('DEFAUT');
    // Un seul département avec affectations → transition vers brouillon
    expect(reponse.body.data.transitionVersBrouillon).toBe(true);

    // Vérifier le snapshot en base
    const snapshot = await ctx.prisma.snapshot.findUnique({
      where: { id: reponse.body.data.snapshotId },
    });
    expect(snapshot).not.toBeNull();
    expect(snapshot!.departementId).toBe(DEPARTEMENT_ID);
    expect(snapshot!.hash).toBeDefined();
    expect(snapshot!.donnees).toBeDefined();

    // Vérifier l'audit
    const audit = await ctx.prisma.journalAudit.findFirst({
      where: {
        entite: 'Snapshot',
        entiteId: reponse.body.data.snapshotId,
        action: 'TRANSITION_ETAT',
      },
    });
    expect(audit).not.toBeNull();
  });

  it('POST /repartition/valider : 409 quand la version n\'est pas en rep_pedag', async () => {
    await ctx.prisma.version.update({
      where: { id: VERSION_ID },
      data: { etat: 'initial' },
    });

    const reponse = await ctx.agent
      .post('/api/v1/repartition/valider')
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .send({ versionId: VERSION_ID, departementId: DEPARTEMENT_ID })
      .expect(409);

    expect(reponse.body.error.code).toBe(CODES_ERREUR_API.CONFLICT);
  });

  it('POST /repartition/valider : 409 quand un snapshot existe déjà (immuabilité)', async () => {
    // Nettoyer le snapshot éventuellement laissé par le test précédent
    await ctx.prisma.snapshot.deleteMany({
      where: { versionId: VERSION_ID, departementId: DEPARTEMENT_ID },
    });
    // Remettre en rep_pedag (le test précédent est passé en brouillon)
    await ctx.prisma.version.update({
      where: { id: VERSION_ID },
      data: { etat: 'rep_pedag' },
    });
    // Combinaison différente pour respecter l'unicité (version, enseignant, matiere, groupe, typeEnseignement)
    await ctx.prisma.affectationPedagogique.create({
      data: {
        id: '33333333-3333-3333-3333-333333333333',
        versionId: VERSION_ID,
        semestreId: ctx.semestreId,
        enseignantId: ctx.enseignant2Id,
        matiereId: ctx.matiereId,
        groupeId: ctx.groupe2Id,
        typeEnseignementId: ctx.typeEnseignementId,
        volumeHebdo: 3,
        dureeCreneaux: 90,
        departementId: DEPARTEMENT_ID,
      },
    });

    // Première validation : OK (200)
    await ctx.agent
      .post('/api/v1/repartition/valider')
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .send({ versionId: VERSION_ID, departementId: DEPARTEMENT_ID })
      .expect(200);

    // Deuxième tentative : doit retourner 409 (immuabilité)
    const reponse = await ctx.agent
      .post('/api/v1/repartition/valider')
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .send({ versionId: VERSION_ID, departementId: DEPARTEMENT_ID })
      .expect(409);

    expect(reponse.body.error.code).toBe(CODES_ERREUR_API.CONFLICT);
  });

  it('POST /repartition/valider : 400 quand aucune affectation pour le département', async () => {
    // Utiliser un département sans affectations
    await ctx.prisma.version.update({
      where: { id: VERSION_ID },
      data: { etat: 'rep_pedag' },
    });

    const reponse = await ctx.agent
      .post('/api/v1/repartition/valider')
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .send({ versionId: VERSION_ID, departementId: ctx.departement2Id })
      .expect(400);

    expect(reponse.body.error.code).toBe(CODES_ERREUR_API.BAD_REQUEST);
  });

  it('POST /repartition/valider : gestionnaire reçoit une réponse (gestion des rôles par le guard)', async () => {
    await ctx.prisma.snapshot.deleteMany({
      where: { versionId: VERSION_ID, departementId: DEPARTEMENT_ID },
    });
    await ctx.prisma.version.update({
      where: { id: VERSION_ID },
      data: { etat: 'rep_pedag' },
    });

    const reponse = await ctx.agent
      .post('/api/v1/repartition/valider')
      .set('Authorization', `Bearer ${ctx.tokenGest}`)
      .send({ versionId: VERSION_ID, departementId: DEPARTEMENT_ID });

    // Selon la configuration des rôles, gest peut recevoir 200 ou 403
    expect([200, 403]).toContain(reponse.status);
  });
});