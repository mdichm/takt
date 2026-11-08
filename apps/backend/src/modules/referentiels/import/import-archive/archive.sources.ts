// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PrismaClient } from '@takt/db';
import { type TypeImportArchive } from '@takt/contracts';
import * as crypto from 'node:crypto';
import { type SourceReferentielArchive } from './archive.types';

/** Année de début d'une année universitaire (pour le suffixe déterministe du code clone). */
export function anneeDebut(annee: { dateDebut: Date }): number {
  return new Date(annee.dateDebut).getFullYear();
}

/** Code du clone : <code>-<annee de début>, tronqué à 50 caractères. */
export function codeClone(code: string, annee: number): string {
  const suffixe = `-${annee}`;
  if (code.length + suffixe.length <= 50) {
    return `${code}${suffixe}`;
  }
  return code.slice(0, Math.max(0, 50 - suffixe.length)) + suffixe;
}

/** Empreinte SHA-256 déterministe de l'aperçu (contrôle d'intégrité). */
export function empreinteApercu(
  anneeSourceId: string,
  types: readonly TypeImportArchive[],
  sources: Record<string, { id: string; code: string }[]>,
): string {
  const payload = { anneeSourceId, types: [...types].sort(), sources };
  return crypto.createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex');
}

/** Collecte les candidats à l'import pour un type donné depuis l'année source. */
export async function collecterSources(
  prisma: PrismaClient,
  type: TypeImportArchive,
  anneeSourceId: string,
): Promise<SourceReferentielArchive[]> {
  switch (type) {
    case 'parcours': {
      const departements = await prisma.affectationPedagogique.findMany({
        where: { semestre: { anneeUniversitaireId: anneeSourceId } },
        distinct: ['departementId'],
        select: { departementId: true },
      });
      const deptIds = departements.map((d) => d.departementId).filter(Boolean);
      if (deptIds.length === 0) {
        return [];
      }
      const parcours = await prisma.parcours.findMany({
        where: { departementId: { in: deptIds as string[] } },
        select: { id: true, code: true, libelle: true, departementId: true },
      });
      return parcours.map((p) => ({
        type: 'parcours' as const,
        id: p.id,
        code: p.code,
        libelle: p.libelle,
        originId: p.id,
        departementId: p.departementId,
      }));
    }
    case 'groupe': {
      const lignes = await prisma.affectationPedagogique.findMany({
        where: { semestre: { anneeUniversitaireId: anneeSourceId } },
        distinct: ['groupeId'],
        select: { groupeId: true },
      });
      const ids = lignes.map((l) => l.groupeId).filter(Boolean);
      if (ids.length === 0) {
        return [];
      }
      const groupes = await prisma.groupe.findMany({
        where: { id: { in: ids as string[] } },
        select: { id: true, code: true, libelle: true, niveauId: true },
      });
      return groupes.map((g) => ({
        type: 'groupe' as const,
        id: g.id,
        code: g.code,
        libelle: g.libelle,
        originId: g.id,
        niveauId: g.niveauId,
      }));
    }
    case 'matiere': {
      const lignes = await prisma.affectationPedagogique.findMany({
        where: { semestre: { anneeUniversitaireId: anneeSourceId } },
        distinct: ['matiereId'],
        select: { matiereId: true },
      });
      const ids = lignes.map((l) => l.matiereId).filter(Boolean);
      if (ids.length === 0) {
        return [];
      }
      const matieres = await prisma.matiere.findMany({
        where: { id: { in: ids as string[] } },
        select: { id: true, code: true, libelle: true, moduleId: true },
      });
      return matieres.map((m) => ({
        type: 'matiere' as const,
        id: m.id,
        code: m.code,
        libelle: m.libelle,
        originId: m.id,
        moduleId: m.moduleId,
      }));
    }
    case 'module': {
      // Modules parents des matières utilisées dans l'année source.
      const lignes = await prisma.affectationPedagogique.findMany({
        where: { semestre: { anneeUniversitaireId: anneeSourceId } },
        distinct: ['matiereId'],
        select: { matiereId: true },
      });
      const matiereIds = lignes.map((l) => l.matiereId).filter(Boolean);
      if (matiereIds.length === 0) {
        return [];
      }
      const matieres = await prisma.matiere.findMany({
        where: { id: { in: matiereIds as string[] } },
        select: { moduleId: true },
        distinct: ['moduleId'],
      });
      const moduleIds = matieres.map((m) => m.moduleId).filter(Boolean);
      if (moduleIds.length === 0) {
        return [];
      }
      const modules = await prisma.module.findMany({
        where: { id: { in: moduleIds as string[] } },
        select: { id: true, code: true, libelle: true, typeEnseignementId: true, gradeId: true },
      });
      return modules.map((m) => ({
        type: 'module' as const,
        id: m.id,
        code: m.code,
        libelle: m.libelle,
        originId: m.id,
        typeEnseignementId: m.typeEnseignementId,
        gradeId: m.gradeId,
      }));
    }
    case 'salle': {
      const salles = await prisma.seance.findMany({
        where: {
          version: { semestre: { anneeUniversitaireId: anneeSourceId } },
          salleId: { not: null },
        },
        distinct: ['salleId'],
        select: { salleId: true },
      });
      const ids = salles.map((s) => s.salleId!).filter(Boolean);
      if (ids.length === 0) {
        return [];
      }
      const salleRows = await prisma.salle.findMany({
        where: { id: { in: ids as string[] } },
        select: {
          id: true,
          code: true,
          libelle: true,
          typeSalleId: true,
          siteId: true,
          capacite: true,
        },
      });
      return salleRows.map((s) => ({
        type: 'salle' as const,
        id: s.id,
        code: s.code,
        libelle: s.libelle,
        originId: s.id,
        typeSalleId: s.typeSalleId,
        siteId: s.siteId,
        capacite: s.capacite,
      }));
    }
    default:
      return [];
  }
}
