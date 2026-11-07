// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { resolve } from 'node:path';
import { controlerDependancesBackend } from './module-dependencies';

const racineBackend = resolve(__dirname, '../../../..');
const resultat = controlerDependancesBackend(racineBackend);
let echec = false;

if (resultat.modulesManquants.length > 0) {
  console.error(`✗ Modules métier manquants : ${resultat.modulesManquants.join(', ')}`);
  echec = true;
}

for (const violation of resultat.violations) {
  console.error(
    `✗ Dépendance interdite : ${violation.moduleSource} → ${violation.moduleCible} ` +
      `(${violation.fichier}:${violation.ligne})`,
  );
  echec = true;
}

for (const cycle of resultat.cycles) {
  console.error(`✗ Cycle de dépendances : ${cycle.join(' → ')}`);
  echec = true;
}

if (echec) {
  process.exitCode = 1;
} else {
  console.log('✓ Les dépendances entre les onze modules backend sont conformes');
}
