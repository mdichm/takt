// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../../common/http/api-error';
import { AuditService } from '../../../audit/audit.service';
import * as crypto from 'node:crypto';
import {
  type ApercuImportArchiveParams,
  type ImportArchiveApercu,
  type ImportArchiveConfirme,
  type LigneApercuArchive,
  type RapportImportArchive,
  type TypeImportArchive,
} from '@takt/contracts';
import {
  collecterSources,
  codeClone,
  anneeDebut,
  empreinteApercu,
} from './archive.sources';
import { type SourceReferentielArchive } from './archive.types';

const ORDRE_TYPES: TypeImportArchive[] = ['module', 'parcours', 'groupe', 'matiere', 'salle'];

type StatutLigne = 'aImporter' | 'dejaImporte' | 'rejete';

interface ErreurLigne {
  ligne: number;
  champ: string;
  valeur: string;
  motif: string;
}

function sha256(contenu: string): string {
  return crypto.createHash('sha256').update(contenu, 'utf8').digest('hex');
}

@Injectable()
export class ArchiveImportService {
  private readonly logger = new Logger(ArchiveImportService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async listerAnneesSource(): Promise<{ id: string; libelle: string }[]> {
    const annees = await this.prisma.anneeUniversitaire.findMany({
      include: { semestres: { include: { versions: true } } },
    });
    const cloturees = annees.filter((a) => {
      const versions = a.semestres.flatMap((s) => s.versions);
      return versions.length > 0 && versions.every((v) => v.etat === 'archive');
    });
    return cloturees.map((a) => ({ id: a.id, libelle: a.libelle }));
  }

  private async verifierAnneeCloturee(
    tx: PrismaClient,
    anneeSourceId: string,
  ): Promise<number> {
    const annee = await tx.anneeUniversitaire.findUnique({
      where: { id: anneeSourceId },
      include: { semestres: { include: { versions: true } } },
    });
    if (!annee) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Année universitaire introuvable');
    }
    const versions = annee.semestres.flatMap((s) => s.versions);
    const estCloturee = versions.length > 0 && versions.every((v) => v.etat === 'archive');
    if (!estCloturee) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        "L'année source n'est pas clôturée",
      );
    }
    return anneeDebut(annee);
  }

  async apercu(params: ApercuImportArchiveParams): Promise<ImportArchiveApercu> {
    const anneeAnnee = await this.verifierAnneeCloturee(this.prisma, params.anneeSourceId);

    const sourcesParType: Record<TypeImportArchive, SourceReferentielArchive[]> = {} as Record<
      TypeImportArchive,
      SourceReferentielArchive[]
    >;
    for (const type of params.types) {
      sourcesParType[type] = await collecterSources(this.prisma, type, params.anneeSourceId);
    }

    const dejaImportes: Record<TypeImportArchive, Set<string>> = {} as Record<
      TypeImportArchive,
      Set<string>
    >;
    for (const type of params.types) {
      const rows = sourcesParType[type];
      if (rows.length === 0) {
        dejaImportes[type] = new Set();
        continue;
      }
      const originIds = rows.map((r) => r.originId);
      let existants: { originId: string | null }[];
      switch (type) {
        case 'parcours':
          existants = await this.prisma.parcours.findMany({
            where: { originId: { in: originIds } },
            select: { originId: true },
          });
          break;
        case 'groupe':
          existants = await this.prisma.groupe.findMany({
            where: { originId: { in: originIds } },
            select: { originId: true },
          });
          break;
        case 'module':
          existants = await this.prisma.module.findMany({
            where: { originId: { in: originIds } },
            select: { originId: true },
          });
          break;
        case 'matiere':
          existants = await this.prisma.matiere.findMany({
            where: { originId: { in: originIds } },
            select: { originId: true },
          });
          break;
        case 'salle':
          existants = await this.prisma.salle.findMany({
            where: { originId: { in: originIds } },
            select: { originId: true },
          });
          break;
        default:
          existants = [];
      }
      dejaImportes[type] = new Set(existants.map((e) => e.originId!));
    }

    const apercuLignes: LigneApercuArchive[] = [];
    let totalLignes = 0;
    let lignesValides = 0;
    let lignesInvalides = 0;
    let dejaImports = 0;
    const vus: Record<TypeImportArchive, Set<string>> = {} as Record<
      TypeImportArchive,
      Set<string>
    >;
    for (const type of params.types) {
      vus[type] = new Set();
    }

    const typesOrdres = ORDRE_TYPES.filter((t) => params.types.includes(t));
    for (const type of typesOrdres) {
      const dejaSet = dejaImportes[type];
      const vusSet = vus[type];
      for (const source of sourcesParType[type]) {
        totalLignes += 1;
        const cloneCode = codeClone(source.code, anneeAnnee);
        let statut: StatutLigne = 'aImporter';
        let motif: string | undefined;

        if (dejaSet.has(source.originId)) {
          statut = 'dejaImporte';
          dejaImports += 1;
        } else if (vusSet.has(cloneCode)) {
          statut = 'rejete';
          motif = 'Ce code est déjà utilisé dans le fichier';
          lignesInvalides += 1;
        } else {
          vusSet.add(cloneCode);
          lignesValides += 1;
        }

        apercuLignes.push({
          type,
          code: cloneCode,
          libelle: source.libelle ?? undefined,
          statut,
          motif,
          originId: source.originId,
        });
      }
    }

    const sourcesPourEmpreinte: Record<string, { id: string; code: string }[]> = {};
    for (const type of params.types) {
      sourcesPourEmpreinte[type] = sourcesParType[type].map((s) => ({ id: s.id, code: s.code }));
    }
    const empreinte = empreinteApercu(params.anneeSourceId, params.types, sourcesPourEmpreinte);

    return {
      anneeSourceId: params.anneeSourceId,
      types: params.types,
      empreinte,
      totalLignes,
      lignesValides,
      lignesInvalides,
      dejaImports,
      apercuLignes,
    };
  }

  async executer(
    dto: ImportArchiveConfirme,
    utilisateurId: string,
  ): Promise<RapportImportArchive> {
    const anneeAnnee = await this.verifierAnneeCloturee(this.prisma, dto.anneeSourceId);

    const sourcesParType: Record<TypeImportArchive, SourceReferentielArchive[]> = {} as Record<
      TypeImportArchive,
      SourceReferentielArchive[]
    >;
    for (const type of dto.types) {
      sourcesParType[type] = await collecterSources(this.prisma, type, dto.anneeSourceId);
    }

    const sourcesPourEmpreinte: Record<string, { id: string; code: string }[]> = {};
    for (const type of dto.types) {
      sourcesPourEmpreinte[type] = sourcesParType[type].map((s) => ({ id: s.id, code: s.code }));
    }
    const empreinte = empreinteApercu(dto.anneeSourceId, dto.types, sourcesPourEmpreinte);
    if (sha256(empreinte) !== dto.empreinte) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Les données sources ont évolué depuis l’aperçu. Relancez un aperçu.',
        { empreinte },
      );
    }

    const typesOrdres = ORDRE_TYPES.filter((t) => dto.types.includes(t));
    const dejaImportes: Record<TypeImportArchive, Set<string>> = {} as Record<
      TypeImportArchive,
      Set<string>
    >;
    for (const type of dto.types) {
      const rows = sourcesParType[type];
      if (rows.length === 0) {
        dejaImportes[type] = new Set();
        continue;
      }
      const originIds = rows.map((r) => r.originId);
      let existants: { originId: string | null }[];
      switch (type) {
        case 'parcours':
          existants = await this.prisma.parcours.findMany({
            where: { originId: { in: originIds } },
            select: { originId: true },
          });
          break;
        case 'groupe':
          existants = await this.prisma.groupe.findMany({
            where: { originId: { in: originIds } },
            select: { originId: true },
          });
          break;
        case 'module':
          existants = await this.prisma.module.findMany({
            where: { originId: { in: originIds } },
            select: { originId: true },
          });
          break;
        case 'matiere':
          existants = await this.prisma.matiere.findMany({
            where: { originId: { in: originIds } },
            select: { originId: true },
          });
          break;
        case 'salle':
          existants = await this.prisma.salle.findMany({
            where: { originId: { in: originIds } },
            select: { originId: true },
          });
          break;
        default:
          existants = [];
      }
      dejaImportes[type] = new Set(existants.map((e) => e.originId!));
    }

    const compteurs: Record<TypeImportArchive, { importes: number; dejaImports: number; rejets: number }> = {} as Record<
      TypeImportArchive,
      { importes: number; dejaImports: number; rejets: number }
    >;
    for (const type of dto.types) {
      compteurs[type] = { importes: 0, dejaImports: 0, rejets: 0 };
    }
    let totalImportes = 0;
    let totalDejaImports = 0;
    let totalRejets = 0;
    const erreurs: ErreurLigne[] = [];
    const mapModuleClone = new Map<string, string>();
    const vus: Record<TypeImportArchive, Set<string>> = {} as Record<
      TypeImportArchive,
      Set<string>
    >;
    for (const type of dto.types) {
      vus[type] = new Set();
    }

    await this.prisma.$transaction(async (tx) => {
      for (const type of typesOrdres) {
        const dejaSet = dejaImportes[type];
        const vusSet = vus[type];
        const rows = sourcesParType[type];
        for (let i = 0; i < rows.length; i++) {
          const source = rows[i];
          if (!source) {
            continue;
          }
          const ligne = i + 1;
          const cloneCode = codeClone(source.code, anneeAnnee);
          const savepoint = `sp_archive_${type}_${source.id.replace(/-/g, '')}`;

          await tx.$queryRawUnsafe(`SAVEPOINT "${savepoint}"`);
          try {
            if (dejaSet.has(source.originId)) {
              await tx.$queryRawUnsafe(`RELEASE SAVEPOINT "${savepoint}"`);
              totalDejaImports += 1;
              compteurs[type].dejaImports += 1;
              continue;
            }
            if (vusSet.has(cloneCode)) {
              await tx.$queryRawUnsafe(`RELEASE SAVEPOINT "${savepoint}"`);
              totalRejets += 1;
              compteurs[type].rejets += 1;
              erreurs.push({
                ligne,
                champ: 'code',
                valeur: cloneCode,
                motif: 'Ce code est déjà utilisé dans le fichier',
              });
              continue;
            }
            vusSet.add(cloneCode);

            const libelle = source.libelle ?? source.code;

            switch (type) {
              case 'parcours': {
                await tx.parcours.create({
                  data: {
                    code: cloneCode,
                    libelle,
                    departementId: source.departementId!,
                    originId: source.originId,
                  },
                  select: { id: true },
                });
                break;
              }
              case 'groupe': {
                await tx.groupe.create({
                  data: {
                    code: cloneCode,
                    libelle,
                    niveauId: source.niveauId!,
                    originId: source.originId,
                  },
                  select: { id: true },
                });
                break;
              }
              case 'module': {
                const cree = await tx.module.create({
                  data: {
                    code: cloneCode,
                    libelle,
                    typeEnseignementId: source.typeEnseignementId!,
                    gradeId: source.gradeId!,
                    originId: source.originId,
                  },
                  select: { id: true },
                });
                mapModuleClone.set(source.id, cree.id);
                break;
              }
              case 'matiere': {
                let moduleId = source.moduleId!;
                if (dto.types.includes('module') && mapModuleClone.has(source.moduleId!)) {
                  moduleId = mapModuleClone.get(source.moduleId!)!;
                }
                await tx.matiere.create({
                  data: {
                    code: cloneCode,
                    libelle,
                    moduleId,
                    originId: source.originId,
                  },
                  select: { id: true },
                });
                break;
              }
              case 'salle': {
                await tx.salle.create({
                  data: {
                    code: cloneCode,
                    libelle,
                    typeSalleId: source.typeSalleId!,
                    capacite: source.capacite ?? 0,
                    siteId: source.siteId!,
                    originId: source.originId,
                  },
                  select: { id: true },
                });
                break;
              }
              default:
                await tx.$queryRawUnsafe(`RELEASE SAVEPOINT "${savepoint}"`);
                continue;
            }

            await tx.$queryRawUnsafe(`RELEASE SAVEPOINT "${savepoint}"`);
            totalImportes += 1;
            compteurs[type].importes += 1;
          } catch (err) {
            await tx.$queryRawUnsafe(`ROLLBACK TO SAVEPOINT "${savepoint}"`);
            const e = err as { code?: string; meta?: { target?: string[] } }; // any-justify: Prisma runtime error inspection
            if (e.code === 'P2002') {
              const cible = e.meta?.target?.[0];
              if (cible === 'originId') {
                totalDejaImports += 1;
                compteurs[type].dejaImports += 1;
                continue;
              }
              if (cible === 'code') {
                totalRejets += 1;
                compteurs[type].rejets += 1;
                erreurs.push({
                  ligne,
                  champ: 'code',
                  valeur: cloneCode,
                  motif: 'Ce code est déjà utilisé',
                });
                continue;
              }
            }
            totalRejets += 1;
            compteurs[type].rejets += 1;
            erreurs.push({
              ligne,
              champ: 'corps',
              valeur: '',
              motif: `Échec de création : ${err instanceof Error ? err.message : String(err)}`,
            });
          }
        }
      }
    });
    const totalLignes = dto.types.reduce((s, t) => s + (sourcesParType[t]?.length ?? 0), 0);

    await this.auditService.record({
      action: 'IMPORT_ARCHIVE',
      utilisateurId,
      entite: 'ReferentielArchive',
      entiteId: dto.anneeSourceId,
      metadonnees: {
        types: dto.types,
        importes: totalImportes,
        dejaImports: totalDejaImports,
        rejets: totalRejets,
        empreinte: dto.empreinte,
        nbErreurs: erreurs.length,
      },
    });

    this.logger.log(
      `Import archive ${dto.anneeSourceId}: ${totalImportes} importés, ${totalDejaImports} déjà importés, ${totalRejets} rejetés`,
    );

    return {
      anneeSourceId: dto.anneeSourceId,
      types: dto.types,
      empreinte: dto.empreinte,
      totalLignes,
      importes: totalImportes,
      dejaImports: totalDejaImports,
      rejets: totalRejets,
      erreurs,
      parType: Object.entries(compteurs).map(([type, c]) => ({
        type: type as TypeImportArchive,
        importes: c.importes,
        dejaImports: c.dejaImports,
        rejets: c.rejets,
      })),
    };
  }
}
