// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerPrismaClient, PrismaClient } from '@takt/db';
import { hash as hacherArgon2 } from 'argon2';
import { UsersService } from './users.service';
import { PasswordService } from '../auth/password.service';
import { AuditService } from '../audit/audit.service';

const DATABASE_URL_TEST =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/takt_test';

describe('UsersService - profil (integration, TAKT-L09-03)', () => {
  let prisma: PrismaClient;
  let service: UsersService;
  let utilisateurId: string;

  beforeAll(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: DATABASE_URL_TEST,
    };

    prisma = creerPrismaClient(DATABASE_URL_TEST);
    const passwordService = new PasswordService();
    const auditService = new AuditService(prisma);
    service = new UsersService(prisma, auditService, passwordService);

    const role = await prisma.role.create({
      data: { code: 'gest', libelle: 'Gestionnaire' },
    });
    const hash = await hacherArgon2('MotDePasseActuel123!');
    const utilisateur = await prisma.utilisateur.create({
      data: {
        email: 'marie.dupont@academie.test',
        nom: 'DUPONT',
        prenom: 'Marie',
        roleId: role.id,
        departementId: null,
        motDePasseHash: hash,
        estActif: true,
      },
    });
    utilisateurId = utilisateur.id;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  describe('getProfile', () => {
    it('retourne le profil sans le hash de mot de passe', async () => {
      const profil = await service.getProfile(utilisateurId);

      expect(profil).toMatchObject({
        id: utilisateurId,
        email: 'marie.dupont@academie.test',
        nom: 'DUPONT',
        prenom: 'Marie',
        role: 'gest',
        departementId: null,
        departementCode: null,
        estActif: true,
      });
      expect(profil).not.toHaveProperty('motDePasseHash');
    });

    it('lance une erreur 404 si l utilisateur est introuvable', async () => {
      await expect(
        service.getProfile('00000000-0000-0000-0000-000000000000'),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('updateProfile', () => {
    it('met a jour le profil de l utilisateur', async () => {
      const resultat = await service.updateProfile(utilisateurId, {
        prenom: 'Marie-Revee',
        departementId: null,
      }, { utilisateurIdDemandeur: utilisateurId });

      expect(resultat.prenom).toBe('Marie-Revee');
      expect(resultat.nom).toBe('DUPONT');
    });

    it('refuse un email deja utilise (400)', async () => {
      const role2 = await prisma.role.create({
        data: { code: 'dir', libelle: 'Direction' },
      });
      await prisma.utilisateur.create({
        data: {
          email: 'autre@academie.test',
          nom: 'AUTRE',
          prenom: 'Quelquun',
          roleId: role2.id,
          motDePasseHash: 'hash-fictif',
        },
      });

      await expect(
        service.updateProfile(utilisateurId, {
          email: 'autre@academie.test',
        }, { utilisateurIdDemandeur: utilisateurId }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('refuse un departement inexistant (400)', async () => {
      await expect(
        service.updateProfile(utilisateurId, {
          departementId: '00000000-0000-0000-0000-000000000000',
        }, { utilisateurIdDemandeur: utilisateurId }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('changePassword', () => {
    it('refuse un mot de passe actuel incorrect (400)', async () => {
      await expect(
        service.changePassword(utilisateurId, 'MauvaisMotDePasse123!', 'NouveauMotDePasse123!'),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('change le mot de passe et revoque les sessions de rafraîchissement', async () => {
      await prisma.sessionRefresh.create({
        data: {
          jti: '11111111-1111-4111-8111-111111111111',
          familyId: '22222222-2222-4222-8222-222222222222',
          utilisateurId,
          estRevoque: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const resultat = await service.changePassword(
        utilisateurId,
        'MotDePasseActuel123!',
        'NouveauMotDePasse123!',
      );

      expect(resultat.email).toBe('marie.dupont@academie.test');

      const session = await prisma.sessionRefresh.findUnique({
        where: { jti: '11111111-1111-4111-8111-111111111111' },
      });
      expect(session?.estRevoque).toBe(true);
    });
  });
});
