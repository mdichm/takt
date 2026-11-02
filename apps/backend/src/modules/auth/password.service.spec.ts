// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { PASSWORD_ARGON2_OPTIONS, PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hache un mot de passe avec argon2id et les paramètres calibrés', async () => {
    const hash = await service.hash('mot-de-passe-secure');

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).toContain(`m=${PASSWORD_ARGON2_OPTIONS.memoryCost}`);
    expect(hash).toContain(`t=${PASSWORD_ARGON2_OPTIONS.timeCost}`);
    expect(hash).toContain(`p=${PASSWORD_ARGON2_OPTIONS.parallelism}`);
  });

  it('vérifie le mot de passe correspondant sans révéler les échecs', async () => {
    const hash = await service.hash('mot-de-passe-secure');

    await expect(service.verify(hash, 'mot-de-passe-secure')).resolves.toBe(true);
    await expect(service.verify(hash, 'mauvais-mot-de-passe')).resolves.toBe(false);
  });

  it('produit un sel aléatoire différent pour deux hachages', async () => {
    const premier = await service.hash('mot-de-passe-secure');
    const second = await service.hash('mot-de-passe-secure');

    expect(premier).not.toBe(second);
  });

  it('indique qu’un hash obsolète doit être recalculé', async () => {
    const hashObsolete =
      '$argon2id$v=19$m=4096,t=2,p=1$Y2FuYXJ5c2FsdA$J8Xk3vF6w9wq3YQ0m3d1KfD0Y0h1QeT9f5wQ2s8d0M';

    expect(service.needsRehash(hashObsolete)).toBe(true);
  });

  it('ne demande pas de rehash pour les paramètres actuels', async () => {
    const hash = await service.hash('mot-de-passe-secure');

    expect(service.needsRehash(hash)).toBe(false);
  });

  it('mesure le coût de hachage avec un seuil compatible avec la cible', async () => {
    const duree = await service.measureHashDuration('mot-de-passe-secure');

    expect(duree).toBeGreaterThan(0);
    expect(duree).toBeLessThan(150);
  });

  it('retourne false pour un hash corrompu', async () => {
    await expect(service.verify('hash-invalide', 'mot-de-passe-secure')).resolves.toBe(false);
  });
});
