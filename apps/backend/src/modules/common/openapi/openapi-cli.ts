// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { executerGenerateurOpenApi } from './openapi-generator';

/** Écrit le document OpenAPI généré dans le chemin fourni. */
async function main(): Promise<void> {
  const cheminSortie = process.argv[2];
  if (!cheminSortie) {
    throw new Error('Chemin de sortie OpenAPI obligatoire');
  }
  await executerGenerateurOpenApi(cheminSortie);
}

void main().catch((erreur: unknown) => {
  console.error('Échec de la génération OpenAPI', erreur);
  process.exitCode = 1;
});
