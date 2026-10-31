// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import 'reflect-metadata';
import { startApplication } from './bootstrap';

void startApplication().catch((erreur: unknown) => {
  console.error("Échec du démarrage de l'application TAKT", erreur);
  process.exitCode = 1;
});
