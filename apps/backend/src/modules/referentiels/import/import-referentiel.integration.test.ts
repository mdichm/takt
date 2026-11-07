// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { createHash } from 'node:crypto';
import {
  creerContexteTestReferentiels,
  nettoyerContexteTest,
  type ContexteTestReferentiels,
} from '../test-helper.integration';

function sha256(contenu: string): string {
  return createHash('sha256').update(contenu, 'utf8').digest('hex');
}


const URL_APERCU = '/api/v1/referentiels/import/apercu';
const URL_EXECUTER = '/api/v1/referentiels/import/executer';

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('Import référentiels — intégration (L04-07)', () => {
  let ctx: ContexteTestReferentiels;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();
  });

  afterAll(async () => {
    await nettoyerContexteTest(ctx);
  });

  test('site : aperçu + exécution, 100 lignes valides + 3 invalides', async () => {
    const lignes: string[] = ['code;libelle'];
    for (let i = 1; i <= 100; i += 1) {
      lignes.push(`ITSITE${String(i).padStart(3, '0')};Site de test ${i}`);
    }
    // 3 lignes invalides : code vide, libelle vide, doublon interne
    lignes.push(';Sans code');                                 // ligne 101
    lignes.push('ITSITE999;');                                  // ligne 102
    lignes.push('ITSITE001;Doublon de la ligne 1');            // ligne 103
    const contenu = lignes.join('\n') + '\n';
    const empreinte = sha256(contenu);

    const respApercu = await ctx.agent
      .post(URL_APERCU)
      .set(auth(ctx.tokenAdmin))
      .send({ type: 'site', contenu });
    expect(respApercu.status).toBe(200);
    const apercu = respApercu.body.data;
    expect(apercu.empreinte).toBe(empreinte);
    expect(apercu.totalLignes).toBe(103);
    expect(apercu.lignesValides).toBe(100);
    expect(apercu.lignesInvalides).toBe(3);
    expect(apercu.erreurs).toHaveLength(3);
    expect(apercu.erreurs[0].ligne).toBe(102);
    expect(apercu.erreurs[0].champ).toBe('code');
    expect(apercu.erreurs[1].ligne).toBe(103);
    expect(apercu.erreurs[1].champ).toBe('libelle');
    expect(apercu.erreurs[2].ligne).toBe(104);
    expect(apercu.erreurs[2].champ).toBe('code');
    expect(apercu.apercuLignes).toHaveLength(10);

    const respExec = await ctx.agent
      .post(URL_EXECUTER)
      .set(auth(ctx.tokenAdmin))
      .send({ type: 'site', contenu, empreinte });
    expect(respExec.status).toBe(200);
    const rapport = respExec.body.data;
    expect(rapport.importes).toBe(100);
    expect(rapport.rejets).toBe(3);
    expect(rapport.erreurs).toHaveLength(3);

    // Les sites ont bien été créés en base.
    const site = await ctx.prisma.site.findUnique({
      where: { code: 'ITSITE042' },
    });
    expect(site).not.toBeNull();
    expect(site!.libelle).toBe('Site de test 42');

    // Audit (GG-07).
    const audit = await ctx.prisma.journalAudit.findFirst({
      where: {
        action: 'IMPORT_REFERENTIEL',
        entite: 'ReferentielImport',
        utilisateurId: ctx.idAdmin,
      },
    });
    expect(audit).not.toBeNull();
    expect(audit!.metadonnees).toMatchObject({
      type: 'site',
      importes: 100,
      rejets: 3,
    });
  });

  test('en-têtes inconnus → 400', async () => {
    const contenu = 'toto;titi\nval1;val2\n';
    const resp = await ctx.agent
      .post(URL_APERCU)
      .set(auth(ctx.tokenAdmin))
      .send({ type: 'site', contenu });
    expect(resp.status).toBe(400);
    expect(resp.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('empreinte incorrecte → 409', async () => {
    const contenu = 'code;libelle\nITSITE1;Site 1\n';
    const resp = await ctx.agent
      .post(URL_EXECUTER)
      .set(auth(ctx.tokenAdmin))
      .send({ type: 'site', contenu, empreinte: '0'.repeat(64) });
    expect(resp.status).toBe(409);
    expect(resp.body.error.code).toBe('WORKFLOW_INVALID_TRANSITION');
  });

  test('idempotence : ré-exécution du même fichier → tout rejeté', async () => {
    const lignes: string[] = ['code;libelle'];
    for (let i = 1; i <= 5; i += 1) {
      lignes.push(`ITEIDE${String(i).padStart(3, '0')};Site idempotence ${i}`);
    }
    const contenu = lignes.join('\n') + '\n';
    const empreinte = sha256(contenu);

    const premier = await ctx.agent
      .post(URL_EXECUTER)
      .set(auth(ctx.tokenAdmin))
      .send({ type: 'site', contenu, empreinte });
    expect(premier.status).toBe(200);
    expect(premier.body.data.importes).toBe(5);

    const second = await ctx.agent
      .post(URL_EXECUTER)
      .set(auth(ctx.tokenAdmin))
      .send({ type: 'site', contenu, empreinte });
    expect(second.status).toBe(200);
    const rapport = second.body.data;
    expect(rapport.importes).toBe(0);
    expect(rapport.rejets).toBe(5);
    expect(rapport.erreurs[0].motif).toContain('déjà en base');
  });

  test('salle : clé étrangère inconnue → rejet ligne à ligne', async () => {
    await ctx.prisma.typeSalle.create({
      data: { code: 'ITAMPHI', libelle: 'Amphi de test' },
    });
    const contenu =
      'code;libelle;typesalle;capacite;site\n' +
      'ITSAL1;Salle 1;ITAMPHI;50;INCONNU\n' +
      'ITSAL2;Salle 2;ITAMPHI;30;INCONNU\n';
    const empreinte = sha256(contenu);

    const apercu = await ctx.agent
      .post(URL_APERCU)
      .set(auth(ctx.tokenAdmin))
      .send({ type: 'salle', contenu });
    expect(apercu.status).toBe(200);
    expect(apercu.body.data.lignesValides).toBe(2); // pas de vérif FK à l'aperçu

    const exec = await ctx.agent
      .post(URL_EXECUTER)
      .set(auth(ctx.tokenAdmin))
      .send({ type: 'salle', contenu, empreinte });
    expect(exec.status).toBe(200);
    const rapport = exec.body.data;
    expect(rapport.importes).toBe(0);
    expect(rapport.rejets).toBe(2);
    expect(rapport.erreurs[0].champ).toBe('site');
    expect(rapport.erreurs[0].motif).toContain("n'existe pas");
    expect(rapport.erreurs[1].champ).toBe('site');
  });

  test('sans authentification → 401', async () => {
    const resp = await ctx.agent
      .post(URL_APERCU)
      .send({ type: 'site', contenu: 'code;libelle\nX;Y\n' });
    expect(resp.status).toBe(401);
    expect(resp.body.error.code).toBe('UNAUTHORIZED');
  });
});

