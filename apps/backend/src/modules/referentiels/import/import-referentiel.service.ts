// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import * as crypto from 'node:crypto';
import {
  ImportReferentielCsv,
  ImportReferentielCsvConfirme,
  TypeReferentielImportable,
  ApercuImport,
  RapportImport,
  ErreurLigneImport,
  ENTETES_CSV_PAR_TYPE,
} from '@takt/contracts';
import { analyserCsv } from './csv-parser';
import { adaptateurPour, chargerCaches, type ContexteImport } from './import-adaptateurs';

const LIGNES_APERCU = 10;

/** Empreinte SHA-256 du contenu CSV (contrôle d'intégrité entre aperçu et exécution). */
function empreinteSha256(contenu: string): string {
  return crypto.createHash('sha256').update(contenu, 'utf8').digest('hex');
}

/** Les en-têtes reçues doivent être exactement celles attendues (même jeu, peu importe l'ordre). */
function entetesCorrespondent(recues: readonly string[], attendus: readonly string[]): boolean {
  if (recues.length !== attendus.length) {
    return false;
  }
  const ensemble = new Set(attendus);
  return recues.every((e) => ensemble.has(e));
}

function erreurLigne(
  ligne: number,
  champ: string,
  valeur: string,
  motif: string,
): ErreurLigneImport {
  return { ligne, champ, valeur, motif };
}

/**
 * Les en-têtes CSV sont normalisées (minuscules, sans accents) par le parseur,
 * mais les schémas Zod attendent les clés camelCase (ex. `typeSalle`). On mappe
 * les clés normalisées vers les clés des schémas avant validation.
 */
const CLEFS_SCHEMA: Record<TypeReferentielImportable, Record<string, string>> = {
  site: {},
  'type-salle': {},
  equipement: {},
  salle: { typesalle: 'typeSalle' },
  groupe: {},
  enseignant: {},
};

function donneesPourSchema(
  donnees: Record<string, string>,
  type: TypeReferentielImportable,
): Record<string, string> {
  const mapping = CLEFS_SCHEMA[type];
  const resultat: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(donnees)) {
    resultat[mapping[cle] ?? cle] = valeur;
  }
  return resultat;
}

@Injectable()
export class ImportReferentielService {
  private readonly logger = new Logger(ImportReferentielService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Aperçu avant confirmation (TE-MET-10). Aucune écriture en base. */
  async apercu(dto: ImportReferentielCsv): Promise<ApercuImport> {
    const { entetes, lignes } = analyserCsv(dto.contenu);
    const entetesAttendus = ENTETES_CSV_PAR_TYPE[dto.type];

    if (!entetesCorrespondent(entetes, entetesAttendus)) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'En-têtes CSV invalides pour ce type de référentiel',
        { attendus: entetesAttendus, recues: entetes },
      );
    }

    const adaptateur = adaptateurPour(dto.type);
    const erreurs: ErreurLigneImport[] = [];
    const vus: { codes: Set<string>; matricules: Set<string>; emails: Set<string> } = {
      codes: new Set(),
      matricules: new Set(),
      emails: new Set(),
    };

    let lignesValides = 0;
    const apercuLignes: ApercuImport['apercuLignes'] = [];

    for (const ligne of lignes) {
      const donnees = { __ligne: String(ligne.numero), ...ligne.valeurs } as Record<
        string,
        string
      > & { __ligne: string };
      const validation = adaptateur.schemaLigne.safeParse(donneesPourSchema(donnees, dto.type));
      if (!validation.success) {
        const issue = validation.error.issues[0] ?? { path: [], message: 'Erreur de validation' };
        const donneesMappees = donneesPourSchema(donnees, dto.type);
        erreurs.push(
          erreurLigne(
            ligne.numero,
            issue.path.join('.') || 'corps',
            String(donneesMappees[issue.path.join('.') as keyof typeof donneesMappees] ?? ''),
            issue.message,
          ),
        );
        continue;
      }

      const donneesValidees = validation.data as Record<string, unknown>;
      const cleCle = donneesValidees.matricule !== undefined ? 'matricule' : 'code';
      const valeurCle = String(donneesValidees[cleCle]);

      if (cleCle === 'matricule') {
        if (vus.matricules.has(valeurCle)) {
          erreurs.push(
            erreurLigne(
              ligne.numero,
              'matricule',
              valeurCle,
              'Ce matricule est déjà utilisé dans le fichier',
            ),
          );
          continue;
        }
        vus.matricules.add(valeurCle);
      } else {
        if (vus.codes.has(valeurCle)) {
          erreurs.push(
            erreurLigne(
              ligne.numero,
              'code',
              valeurCle,
              'Ce code est déjà utilisé dans le fichier',
            ),
          );
          continue;
        }
        vus.codes.add(valeurCle);
      }

      if (donneesValidees.email !== undefined && donneesValidees.email !== '') {
        const email = String(donneesValidees.email);
        if (vus.emails.has(email)) {
          erreurs.push(
            erreurLigne(
              ligne.numero,
              'email',
              email,
              'Cet e-mail est déjà utilisé dans le fichier',
            ),
          );
          continue;
        }
        vus.emails.add(email);
      }

      lignesValides += 1;
      if (apercuLignes.length < LIGNES_APERCU) {
        apercuLignes.push({
          ligne: ligne.numero,
          code: String(donneesValidees.code ?? donneesValidees.matricule ?? ''),
          libelle:
            typeof donneesValidees.libelle === 'string' ? donneesValidees.libelle : undefined,
        });
      }
    }

    return {
      type: dto.type,
      empreinte: empreinteSha256(dto.contenu),
      totalLignes: lignes.length,
      lignesValides,
      lignesInvalides: lignes.length - lignesValides,
      erreurs,
      apercuLignes,
    };
  }

  /**
   * Exécute l'import après aperçu.
   *
   * - Vérifie l'empreinte SHA-256 (idempotence + détection de modification du fichier).
   * - Exécute dans une transaction Prisma avec un savepoint par ligne (R1) : un
   *   échec sur une ligne est rollbacké au savepoint sans annuler les autres.
   * - Journalise la mutation (GG-07).
   */
  async executer(dto: ImportReferentielCsvConfirme, utilisateurId: string): Promise<RapportImport> {
    // 1. L'empreinte doit correspondre à celle de l'aperçu.
    if (empreinteSha256(dto.contenu) !== dto.empreinte) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Le fichier a été modifié depuis l’aperçu. Relancez un aperçu.',
        { empreinte: empreinteSha256(dto.contenu) },
      );
    }

    const { entetes, lignes } = analyserCsv(dto.contenu);
    const entetesAttendus = ENTETES_CSV_PAR_TYPE[dto.type];
    if (!entetesCorrespondent(entetes, entetesAttendus)) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'En-têtes CSV invalides pour ce type de référentiel',
        { attendus: entetesAttendus, recues: entetes },
      );
    }

    const adaptateur = adaptateurPour(dto.type);
    const caches = await chargerCaches(this.prisma);

    // vus ne contient que les doublons INTERNES au fichier courant.
    // L'existant en base réside dans ctx.caches (rechargé par chargerCaches).
    const vus: ContexteImport['vus'] = {
      codes: new Set(),
      matricules: new Set(),
      emails: new Set(),
    };

    const erreurs: ErreurLigneImport[] = [];
    let importes = 0;
    let rejets = 0;

    // 2. Exécution avec savepoints : isolation ligne à ligne (R1).
    await this.prisma.$transaction(async (tx) => {
      for (const ligne of lignes) {
        const donneesBrutes = { __ligne: String(ligne.numero), ...ligne.valeurs } as Record<
          string,
          string
        > & { __ligne: string };
        const donnees = donneesPourSchema(donneesBrutes, dto.type);
        const savepoint = `sp_import_${ligne.numero}`;

        await tx.$queryRawUnsafe(`SAVEPOINT "${savepoint}"`);
        try {
          const resultat = await adaptateur.creer(donnees, { tx, caches, vus } as ContexteImport);
          await tx.$queryRawUnsafe(`RELEASE SAVEPOINT "${savepoint}"`);
          if ('id' in resultat) {
            importes += 1;
          } else {
            erreurs.push(resultat.erreur);
            rejets += 1;
          }
        } catch (err) {
          await tx.$queryRawUnsafe(`ROLLBACK TO SAVEPOINT "${savepoint}"`);
          const message = err instanceof Error ? err.message : String(err);
          erreurs.push(erreurLigne(ligne.numero, 'corps', '', `Échec de création : ${message}`));
          rejets += 1;
        }
      }
    });

    // 3. Audit de la mutation (GG-07).
    await this.auditService.record({
      action: 'IMPORT_REFERENTIEL',
      utilisateurId,
      entite: 'ReferentielImport',
      entiteId: dto.type,
      metadonnees: {
        type: dto.type,
        importes,
        rejets,
        empreinte: dto.empreinte,
        nbErreurs: erreurs.length,
      },
    });

    this.logger.log(`Import ${dto.type}: ${importes} importés, ${rejets} rejets`);

    return {
      type: dto.type,
      empreinte: dto.empreinte,
      importes,
      rejets,
      erreurs,
    };
  }
}
