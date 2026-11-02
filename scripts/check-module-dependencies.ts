// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RACINE = resolve(import.meta.dirname, '..');
const CLI_BACKEND = join(
  RACINE,
  'apps/backend/dist/modules/common/architecture/check-module-dependencies.cli.js',
);

if (!existsSync(CLI_BACKEND)) {
  console.error('✗ Backend non compilé : exécuter `pnpm --filter @takt/backend build`');
  process.exitCode = 1;
} else {
  const resultat = spawnSync(process.execPath, [CLI_BACKEND], {
    cwd: RACINE,
    encoding: 'utf8',
  });
  process.stdout.write(resultat.stdout);
  process.stderr.write(resultat.stderr);
  process.exitCode = resultat.status ?? 1;
}
