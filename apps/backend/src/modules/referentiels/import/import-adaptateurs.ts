// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Prisma } from '@takt/db';
import { z, type ZodTypeAny } from 'zod';
import {
  TypeReferentielImportable,
  ENTETES_CSV_PAR_TYPE,
  type ErreurLigneImport,
} from '@takt/contracts';

type PrismaTx = Prisma.TransactionClient;

/** Caches de résolution des clés étrangères par code (chargés en une requête par table). */
export interface CachesFk {
  readonly sites: Map<string, string>;
  readonly typesSalle: Map<string, string>;
  readonly niveaux: Map<string, string>;
  readonly grades: Map<string, string>;
}

/** Valeurs déjà vues dans le fichier courant (détection des doublons internes). */
export interface VusImport {
  readonly codes: Set<string>;
  readonly matricules: Set<string>;
  readonly emails: Set<string>;
}

/** Contexte passé à chaque adaptateur lors de la création d'une entité. */
export interface ContexteImport {
  readonly tx: PrismaTx;
  readonly caches: CachesFk;
  readonly vus: VusImport;
}

/** Résultat de la création d'une entité par un adaptateur. */
export type ResultatCreation = { readonly id: string } | { readonly erreur: ErreurLigneImport };

/** Adaptateur d'import pour un type de référentiel donné. */
export interface ImportAdaptateur {
  readonly type: TypeReferentielImportable;
  readonly libelle: string;
  readonly entetesAttendus: readonly string[];
  readonly schemaLigne: ZodTypeAny;
  /** Crée l'entité dans la transaction fournie. Retourne son id ou une erreur de ligne. */
  readonly creer: (donnees: Record<string, string>, ctx: ContexteImport) => Promise<ResultatCreation>;
}

// ---------------------------------------------------------------------------
// Schémas de validation d'une ligne CSV (messages en français)
// ---------------------------------------------------------------------------

const zLigneSite = z.object({
  code: z.string().trim().min(1, 'Le code est requis').max(50, 'Le code est trop long'),
  libelle: z.string().trim().min(1, 'Le libellé est requis').max(100, 'Le libellé est trop long'),
});

const zLigneTypeSalle = z.object({
  code: z.string().trim().min(1, 'Le code est requis').max(50, 'Le code est trop long'),
  libelle: z.string().trim().min(1, 'Le libellé est requis').max(100, 'Le libellé est trop long'),
});

const zLigneEquipement = z.object({
  code: z.string().trim().min(1, 'Le code est requis').max(50, 'Le code est trop long'),
  libelle: z.string().trim().min(1, 'Le libellé est requis').max(100, 'Le libellé est trop long'),
});

const zLigneSalle = z.object({
  code: z.string().trim().min(1, 'Le code est requis').max(50, 'Le code est trop long'),
  libelle: z.string().trim().min(1, 'Le libellé est requis').max(100, 'Le libellé est trop long'),
  typeSalle: z.string().trim().min(1, 'Le type de salle est requis'),
  capacite: z
    .coerce
    .number({ invalid_type_error: 'La capacité doit être un nombre' })
    .int('La capacité doit être un nombre entier')
    .positive('La capacité doit être supérieure à 0'),
  site: z.string().trim().min(1, 'Le site est requis'),
});

const zLigneGroupe = z.object({
  code: z.string().trim().min(1, 'Le code est requis').max(50, 'Le code est trop long'),
  libelle: z.string().trim().min(1, 'Le libellé est requis').max(100, 'Le libellé est trop long'),
  niveau: z.string().trim().min(1, 'Le niveau est requis'),
});

const zLigneEnseignant = z.object({
  matricule: z.string().trim().min(1, 'Le matricule est requis').max(50, 'Le matricule est trop long'),
  nom: z.string().trim().min(1, 'Le nom est requis').max(100, 'Le nom est trop long'),
  prenom: z.string().trim().min(1, 'Le prénom est requis').max(100, 'Le prénom est trop long'),
  email: z.string().email('Adresse e-mail invalide'),
  grade: z.string().trim().min(1).max(50, 'Le grade est trop long').optional(),
  actif: z
    .preprocess(
      (valeur) => {
        if (valeur === undefined || valeur === '') {
          return undefined;
        }
        const s = String(valeur).trim().toLowerCase();
        if (s === 'true' || s === 'oui' || s === '1') {
          return true;
        }
        if (s === 'false' || s === 'non' || s === '0') {
          return false;
        }
        return s;
      },
      z.boolean().optional(),
    )
    .optional(),
});

// ---------------------------------------------------------------------------
// Chargement des caches (une requête par table, pas de N+1)
// ---------------------------------------------------------------------------

/** Charge en mémoire les référentiels de clé étrangère indexés par leur code. */
export async function chargerCaches(tx: PrismaTx): Promise<CachesFk> {
  const [sites, typesSalle, niveaux, grades] = await Promise.all([
    tx.site.findMany({ select: { code: true, id: true } }),
    tx.typeSalle.findMany({ select: { code: true, id: true } }),
    tx.niveau.findMany({ select: { code: true, id: true } }),
    tx.grade.findMany({ select: { code: true, id: true } }),
  ]);

  return {
    sites: new Map(sites.map((s) => [s.code, s.id])),
    typesSalle: new Map(typesSalle.map((t) => [t.code, t.id])),
    niveaux: new Map(niveaux.map((n) => [n.code, n.id])),
    grades: new Map(grades.map((g) => [g.code, g.id])),
  };
}

/** Contraintes d'unicité déjà présentes en base pour un type d'import. */
export interface UniciteExistante {
  readonly codes: Set<string>;
  readonly matricules: Set<string>;
  readonly emails: Set<string>;
}

/** Vérifie l'unicité déjà en base pour un type d'import. */
export async function verifierUniciteExistante(
  tx: PrismaTx,
  type: TypeReferentielImportable,
): Promise<UniciteExistante> {
  const codes = new Set<string>();
  const matricules = new Set<string>();
  const emails = new Set<string>();
  switch (type) {
    case 'site': {
      const rows = await tx.site.findMany({ select: { code: true } });
      rows.forEach((r) => codes.add(r.code));
      break;
    }
    case 'type-salle': {
      const rows = await tx.typeSalle.findMany({ select: { code: true } });
      rows.forEach((r) => codes.add(r.code));
      break;
    }
    case 'equipement': {
      const rows = await tx.equipement.findMany({ select: { code: true } });
      rows.forEach((r) => codes.add(r.code));
      break;
    }
    case 'salle': {
      const rows = await tx.salle.findMany({ select: { code: true } });
      rows.forEach((r) => codes.add(r.code));
      break;
    }
    case 'groupe': {
      const rows = await tx.groupe.findMany({ select: { code: true } });
      rows.forEach((r) => codes.add(r.code));
      break;
    }
    case 'enseignant': {
      const rows = await tx.enseignant.findMany({ select: { matricule: true, email: true } });
      rows.forEach((r) => {
        matricules.add(r.matricule);
        emails.add(r.email);
      });
      break;
    }
  }

  return { codes, matricules, emails };
}

// ---------------------------------------------------------------------------
// Adaptateurs par type
// ---------------------------------------------------------------------------

function erreurLigne(ligne: number, champ: string, valeur: string, motif: string): ErreurLigneImport {
  return { ligne, champ, valeur, motif };
}

const ADAPTATEURS: ImportAdaptateur[] = [
  {
    type: 'site',
    libelle: 'Site',
    entetesAttendus: ENTETES_CSV_PAR_TYPE.site,
    schemaLigne: zLigneSite,
    creer: async (donnees, ctx) => {
      const validation = zLigneSite.safeParse(donnees);
      if (!validation.success) {
        const issue = validation.error.issues[0] ?? { path: [], message: 'Erreur de validation' };
        return {
          erreur: erreurLigne(
            Number(donnees.__ligne),
            issue.path.join('.') || 'corps',
            String(donnees[issue.path.join('.')] ?? ''),
            issue.message,
          ),
        };
      }
      const { code, libelle } = validation.data;
      if (ctx.vus.codes.has(code)) {
        return { erreur: erreurLigne(Number(donnees.__ligne), 'code', code, 'Ce code est déjà utilisé dans le fichier') };
      }
      if (ctx.caches.sites.has(code)) {
        return { erreur: erreurLigne(Number(donnees.__ligne), 'code', code, 'Ce code existe déjà en base') };
      }
      const cree = await ctx.tx.site.create({ data: { code, libelle }, select: { id: true } });
      ctx.vus.codes.add(code);
      ctx.caches.sites.set(code, cree.id);
      return { id: cree.id };
    },
  },
  {
    type: 'type-salle',
    libelle: 'Type de salle',
    entetesAttendus: ENTETES_CSV_PAR_TYPE['type-salle'],
    schemaLigne: zLigneTypeSalle,
    creer: async (donnees, ctx) => {
      const validation = zLigneTypeSalle.safeParse(donnees);
      if (!validation.success) {
        const issue = validation.error.issues[0] ?? { path: [], message: 'Erreur de validation' };
        return {
          erreur: erreurLigne(
            Number(donnees.__ligne),
            issue.path.join('.') || 'corps',
            String(donnees[issue.path.join('.')] ?? ''),
            issue.message,
          ),
        };
      }
      const { code, libelle } = validation.data;
      if (ctx.vus.codes.has(code)) {
        return { erreur: erreurLigne(Number(donnees.__ligne), 'code', code, 'Ce code est déjà utilisé dans le fichier') };
      }
      if (ctx.caches.typesSalle.has(code)) {
        return { erreur: erreurLigne(Number(donnees.__ligne), 'code', code, 'Ce code existe déjà en base') };
      }
      const cree = await ctx.tx.typeSalle.create({ data: { code, libelle }, select: { id: true } });
      ctx.vus.codes.add(code);
      ctx.caches.typesSalle.set(code, cree.id);
      return { id: cree.id };
    },
  },
  {
    type: 'equipement',
    libelle: 'Équipement',
    entetesAttendus: ENTETES_CSV_PAR_TYPE.equipement,
    schemaLigne: zLigneEquipement,
    creer: async (donnees, ctx) => {
      const validation = zLigneEquipement.safeParse(donnees);
      if (!validation.success) {
        const issue = validation.error.issues[0] ?? { path: [], message: 'Erreur de validation' };
        return {
          erreur: erreurLigne(
            Number(donnees.__ligne),
            issue.path.join('.') || 'corps',
            String(donnees[issue.path.join('.')] ?? ''),
            issue.message,
          ),
        };
      }
      const { code, libelle } = validation.data;
      if (ctx.vus.codes.has(code)) {
        return { erreur: erreurLigne(Number(donnees.__ligne), 'code', code, 'Ce code est déjà utilisé dans le fichier') };
      }
      const cree = await ctx.tx.equipement.create({ data: { code, libelle }, select: { id: true } });
      ctx.vus.codes.add(code);
      return { id: cree.id };
    },
  },
  {
    type: 'salle',
    libelle: 'Salle',
    entetesAttendus: ENTETES_CSV_PAR_TYPE.salle,
    schemaLigne: zLigneSalle,
    creer: async (donnees, ctx) => {
      const validation = zLigneSalle.safeParse(donnees);
      if (!validation.success) {
        const issue = validation.error.issues[0] ?? { path: [], message: 'Erreur de validation' };
        return {
          erreur: erreurLigne(
            Number(donnees.__ligne),
            issue.path.join('.') || 'corps',
            String(donnees[issue.path.join('.')] ?? ''),
            issue.message,
          ),
        };
      }
      const { code, libelle, typeSalle: typeSalleCode, capacite, site: siteCode } = validation.data;
      if (ctx.vus.codes.has(code)) {
        return { erreur: erreurLigne(Number(donnees.__ligne), 'code', code, 'Ce code est déjà utilisé dans le fichier') };
      }
      const siteId = ctx.caches.sites.get(siteCode);
      if (!siteId) {
        return { erreur: erreurLigne(Number(donnees.__ligne), 'site', siteCode, `Le site "${siteCode}" n'existe pas`) };
      }
      const typeSalleId = ctx.caches.typesSalle.get(typeSalleCode);
      if (!typeSalleId) {
        return { erreur: erreurLigne(Number(donnees.__ligne), 'typeSalle', typeSalleCode, `Le type de salle "${typeSalleCode}" n'existe pas`) };
      }
      const cree = await ctx.tx.salle.create({
        data: { code, libelle, typeSalleId, capacite, siteId },
        select: { id: true },
      });
      ctx.vus.codes.add(code);
      return { id: cree.id };
    },
  },
  {
    type: 'groupe',
    libelle: 'Groupe',
    entetesAttendus: ENTETES_CSV_PAR_TYPE.groupe,
    schemaLigne: zLigneGroupe,
    creer: async (donnees, ctx) => {
      const validation = zLigneGroupe.safeParse(donnees);
      if (!validation.success) {
        const issue = validation.error.issues[0] ?? { path: [], message: 'Erreur de validation' };
        return {
          erreur: erreurLigne(
            Number(donnees.__ligne),
            issue.path.join('.') || 'corps',
            String(donnees[issue.path.join('.')] ?? ''),
            issue.message,
          ),
        };
      }
      const { code, libelle, niveau: niveauCode } = validation.data;
      if (ctx.vus.codes.has(code)) {
        return { erreur: erreurLigne(Number(donnees.__ligne), 'code', code, 'Ce code est déjà utilisé dans le fichier') };
      }
      const niveauId = ctx.caches.niveaux.get(niveauCode);
      if (!niveauId) {
        return { erreur: erreurLigne(Number(donnees.__ligne), 'niveau', niveauCode, `Le niveau "${niveauCode}" n'existe pas`) };
      }
      const cree = await ctx.tx.groupe.create({ data: { code, libelle, niveauId }, select: { id: true } });
      ctx.vus.codes.add(code);
      return { id: cree.id };
    },
  },
  {
    type: 'enseignant',
    libelle: 'Enseignant',
    entetesAttendus: ENTETES_CSV_PAR_TYPE.enseignant,
    schemaLigne: zLigneEnseignant,
    creer: async (donnees, ctx) => {
      const validation = zLigneEnseignant.safeParse(donnees);
      if (!validation.success) {
        const issue = validation.error.issues[0] ?? { path: [], message: 'Erreur de validation' };
        return {
          erreur: erreurLigne(
            Number(donnees.__ligne),
            issue.path.join('.') || 'corps',
            String(donnees[issue.path.join('.')] ?? ''),
            issue.message,
          ),
        };
      }
      const { matricule, nom, prenom, email, grade: gradeCode, actif } = validation.data;
      if (ctx.vus.matricules.has(matricule)) {
        return { erreur: erreurLigne(Number(donnees.__ligne), 'matricule', matricule, 'Ce matricule est déjà utilisé dans le fichier') };
      }
      if (ctx.vus.emails.has(email)) {
        return { erreur: erreurLigne(Number(donnees.__ligne), 'email', email, 'Cet e-mail est déjà utilisé dans le fichier') };
      }
      let gradeId: string | undefined;
      if (gradeCode !== undefined && gradeCode !== '') {
        gradeId = ctx.caches.grades.get(gradeCode);
        if (!gradeId) {
          return { erreur: erreurLigne(Number(donnees.__ligne), 'grade', gradeCode, `Le grade "${gradeCode}" n'existe pas`) };
        }
      }
      const cree = await ctx.tx.enseignant.create({
        data: { matricule, nom, prenom, email, gradeId, estActif: actif ?? true },
        select: { id: true },
      });
      ctx.vus.matricules.add(matricule);
      ctx.vus.emails.add(email);
      return { id: cree.id };
    },
  },
];

/** Retourne l'adaptateur pour un type d'import. */
export function adaptateurPour(type: TypeReferentielImportable): ImportAdaptateur {
  const adaptateur = ADAPTATEURS.find((a) => a.type === type);
  if (!adaptateur) {
    throw new Error(`Aucun adaptateur d'import pour le type "${type}"`);
  }
  return adaptateur;
}

/** Liste des adaptateurs disponibles avec leurs en-têtes attendus. */
export const LISTE_ADAPTATEURS: readonly {
  readonly type: TypeReferentielImportable;
  readonly libelle: string;
  readonly entetesAttendus: readonly string[];
}[] = ADAPTATEURS.map((a) => ({
  type: a.type,
  libelle: a.libelle,
  entetesAttendus: a.entetesAttendus,
}));

export type { PrismaTx };
