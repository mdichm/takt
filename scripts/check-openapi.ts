// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Vérifie que `docs/openapi.yaml` est synchronisé avec les routes NestJS.
 *
 * Usage :
 *   pnpm check-openapi          vérifie la synchronisation ;
 *   pnpm check-openapi --write  régénère le contrat committé.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const RACINE = resolve(import.meta.dirname, '..');
const SPEC_COMMITTEE = join(RACINE, 'docs/openapi.yaml');
const CLI_BACKEND = join(RACINE, 'apps/backend/dist/modules/common/openapi/openapi-cli.js');

function executerBackend(cheminSortie: string): void {
  const resultat = spawnSync(process.execPath, [CLI_BACKEND, cheminSortie], {
    cwd: RACINE,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/takt_test',
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'a'.repeat(32),
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'b'.repeat(32),
    },
  });

  if (resultat.status !== 0) {
    process.stderr.write(resultat.stdout);
    process.stderr.write(resultat.stderr);
    throw new Error('La génération du document OpenAPI a échoué');
  }
}

function main(): void {
  if (!existsSync(CLI_BACKEND)) {
    throw new Error('Backend non compilé : exécuter `pnpm --filter @takt/backend build`');
  }
  if (!existsSync(SPEC_COMMITTEE)) {
    throw new Error('Contrat OpenAPI committé introuvable : docs/openapi.yaml');
  }

  const repertoire = mkdtempSync(join(tmpdir(), 'takt-openapi-'));
  const cheminCandidat = join(repertoire, 'openapi.yaml');

  try {
    executerBackend(cheminCandidat);
    const genere = readFileSync(cheminCandidat, 'utf8');
    const commitee = readFileSync(SPEC_COMMITTEE, 'utf8');

    if (process.argv.includes('--write')) {
      writeFileSync(SPEC_COMMITTEE, genere, 'utf8');
      console.log('✓ docs/openapi.yaml régénéré');
      return;
    }

    if (genere !== commitee) {
      const lignesGenerees = genere.split('\n');
      const lignesCommittees = commitee.split('\n');
      const divergences: string[] = [];
      const maximum = Math.max(lignesGenerees.length, lignesCommittees.length);

      for (let index = 0; index < maximum; index += 1) {
        if (lignesGenerees[index] !== lignesCommittees[index]) {
          divergences.push(
            `ligne ${index + 1}\n  attendu : ${lignesCommittees[index] ?? '<absent>'}\n  obtenu   : ${lignesGenerees[index] ?? '<absent>'}`,
          );
          if (divergences.length === 20) {
            divergences.push('… divergences supplémentaires omises');
            break;
          }
        }
      }

      console.error('✗ docs/openapi.yaml diverge du code applicatif :');
      console.error(divergences.join('\n'));
      console.error('Régénérer avec : pnpm check-openapi --write');
      process.exitCode = 1;
      return;
    }

    console.log('✓ docs/openapi.yaml est synchronisé avec le code applicatif');
  } finally {
    rmSync(repertoire, { recursive: true, force: true });
  }
}

try {
  main();
} catch (erreur: unknown) {
  console.error('✗ Vérification OpenAPI impossible', erreur);
  process.exitCode = 1;
}
