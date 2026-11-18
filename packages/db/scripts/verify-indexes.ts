// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { creerPrismaClient } from '../src/index';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/takt_dev';
const prisma = creerPrismaClient(DATABASE_URL);

// Index attendus par TAKT-L06-04 (table, nom de l'index).
const ATTENDUS: [string, string][] = [
  ['Seance', 'Seance_versionId_jour_creneauDebutId_salleId_key'],
  ['Seance', 'Seance_versionId_jour_creneauDebutId_enseignantId_idx'],
  ['Seance', 'Seance_versionId_jour_creneauDebutId_groupeId_idx'],
  ['Version', 'Version_etat_idx'],
  ['Generation', 'Generation_versionId_statut_idx'],
  ['JournalAudit', 'JournalAudit_horodatage_action_idx'],
];

async function main(): Promise<void> {
  const lignes = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;`,
  );
  const presents = new Set(lignes.map((l) => l.indexname));
  const manquants = ATTENDUS.filter(([_table, nom]) => !presents.has(nom));

  if (manquants.length > 0) {
    console.error('KO : index manquants :');
    for (const [table, nom] of manquants) {
      console.error(`  - ${table}.${nom}`);
    }
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`OK : ${ATTENDUS.length} index de unicite/performance presents.`);
  for (const [table, nom] of ATTENDUS) {
    console.log(`  - ${table}.${nom}`);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
