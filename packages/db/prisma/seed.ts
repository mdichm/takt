// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL est requise pour exécuter le seed');
}

if (process.env.NODE_ENV === 'production') {
  throw new Error('Le seed de développement est interdit en production');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main(): Promise<void> {
  const roles = await Promise.all(
    [
      ['admin', 'Administrateur'],
      ['gest', 'Gestionnaire des emplois du temps'],
      ['rdep', 'Responsable de département'],
      ['dir', 'Direction'],
    ].map(([code, libelle]) =>
      prisma.role.upsert({
        where: { code },
        update: { libelle },
        create: { code, libelle },
      }),
    ),
  );

  const departements = await Promise.all(
    [
      ['INFO', 'Informatique'],
      ['MATH', 'Mathématiques'],
      ['PHYS', 'Physique'],
    ].map(([code, libelle]) =>
      prisma.departement.upsert({
        where: { code },
        update: { libelle },
        create: { code, libelle },
      }),
    ),
  );

  const annee = await prisma.anneeUniversitaire.upsert({
    where: { libelle: '2026-2027' },
    update: {},
    create: {
      libelle: '2026-2027',
      dateDebut: new Date('2026-09-01T00:00:00.000Z'),
      dateFin: new Date('2027-08-31T00:00:00.000Z'),
    },
  });

  for (const numero of [1, 2]) {
    await prisma.semestre.upsert({
      where: { anneeUniversitaireId_numero: { anneeUniversitaireId: annee.id, numero } },
      update: {},
      create: {
        numero,
        anneeUniversitaireId: annee.id,
        dateDebut: new Date(numero === 1 ? '2026-10-01' : '2027-02-01'),
        dateFin: new Date(numero === 1 ? '2027-01-31' : '2027-06-30'),
      },
    });
  }

  const roleAdmin = roles.find((role) => role.code === 'admin');
  if (!roleAdmin) {
    throw new Error('Le rôle admin doit exister');
  }

  await prisma.utilisateur.upsert({
    where: { email: 'admin@takt.internal' },
    update: {},
    create: {
      email: 'admin@takt.internal',
      nom: 'Admin',
      prenom: 'Système',
      roleId: roleAdmin.id,
      departementId: departements[0]?.id ?? null,
    },
  });
}

main()
  .then(() => console.log('Seed de développement terminé.'))
  .catch((erreur: unknown) => {
    console.error('Échec du seed de développement.', erreur);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
