// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/** Résultat du parsing d'un fichier CSV. */
export interface CsvResultat {
  /** En-têtes normalisées (trim, minuscules, sans accents). */
  readonly entetes: readonly string[];
  /** Lignes de données, avec le numéro de ligne réel dans le fichier (en-tête = ligne 1).
   *  Une ligne de données qui occupe plusieurs lignes du fichier (champ multiligne
   *  entre guillemets) garde le numéro de sa première ligne. */
  readonly lignes: readonly {
    readonly numero: number;
    readonly valeurs: Record<string, string>;
  }[];
}

/**
 * Supprime le BOM UTF-8 (\uFEFF) en début de contenu s'il est présent.
 */
function supprimerBom(contenu: string): string {
  return contenu.startsWith('\uFEFF') ? contenu.slice(1) : contenu;
}

/**
 * Normalise les sauts de ligne : CRLF et CR isolés → LF.
 */
function normaliserSautsDeLigne(contenu: string): string {
  return contenu.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Normalise une en-tête : trim, minuscules, suppression des accents.
 */
function normaliserEntete(entete: string): string {
  return entete
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Détecte le séparateur de champs (';' prioritaire ou ',') en inspectant la
 * première ligne logique du fichier (hors guillemets).
 */
function detecterSeparateur(texte: string): ';' | ',' {
  let dansGuillemets = false;
  let nbPointVirgule = 0;
  let nbVirgule = 0;

  for (let i = 0; i < texte.length; i += 1) {
    const c = texte[i];
    if (dansGuillemets) {
      if (c === '"') {
        if (i + 1 < texte.length && texte[i + 1] === '"') {
          i += 1; // caractère échappé ""
        } else {
          dansGuillemets = false;
        }
      }
      continue;
    }
    if (c === '"') {
      dansGuillemets = true;
      continue;
    }
    if (c === '\n' || c === '\r') {
      break;
    }
    if (c === ';') {
      nbPointVirgule += 1;
    } else if (c === ',') {
      nbVirgule += 1;
    }
  }

  return nbPointVirgule > nbVirgule ? ';' : ',';
}

/**
 * Parse un contenu CSV texte (UTF-8, séparateur `;` ou `,`, guillemets
 * gérés avec échappement `""`, champs multilignes).
 *
 * Le numéro de ligne est celui du fichier source (la ligne d'en-têtes est
 * la ligne 1), ce qui permet de pointer précisément vers une ligne dans le
 * rapport d'erreurs.
 *
 * @throws nothing — ne lève jamais ; les lignes malformées produisent des
 * champs vides plutôt qu'une exception.
 */
export function analyserCsv(contenu: string): CsvResultat {
  const texte = normaliserSautsDeLigne(supprimerBom(contenu));
  const separateur = detecterSeparateur(texte);

  // Chaque entrée : { champs de la ligne CSV, numéro de ligne de fichier où elle commence }.
  const lignesCsv: { readonly champs: string[]; readonly numero: number }[] = [];
  let champs: string[] = [];
  let courant = '';
  let dansGuillemets = false;
  let numeroLigneCourant = 1; // numéro de ligne du fichier source
  let numeroDebutLigneCsv = 1; // ligne de fichier où commence la ligne CSV en cours
  let i = 0;
  const n = texte.length;

  while (i < n) {
    const c = texte[i];
    if (dansGuillemets) {
      if (c === '"') {
        if (i + 1 < n && texte[i + 1] === '"') {
          courant += '"';
          i += 2;
          continue;
        }
        dansGuillemets = false;
        i += 1;
        continue;
      }
      courant += c;
      if (c === '\n') {
        numeroLigneCourant += 1;
      }
      i += 1;
      continue;
    }
    if (c === '"' && courant.length === 0) {
      dansGuillemets = true;
      i += 1;
      continue;
    }
    if (c === separateur) {
      champs.push(courant);
      courant = '';
      i += 1;
      continue;
    }
    if (c === '\n') {
      champs.push(courant);
      courant = '';
      lignesCsv.push({ champs, numero: numeroDebutLigneCsv });
      champs = [];
      numeroLigneCourant += 1;
      numeroDebutLigneCsv = numeroLigneCourant;
      i += 1;
      continue;
    }
    courant += c;
    i += 1;
  }

  // Dernier champ / dernière ligne (fichier sans saut de ligne final).
  if (courant.length > 0 || champs.length > 0) {
    champs.push(courant);
    lignesCsv.push({ champs, numero: numeroDebutLigneCsv });
  }

  // Ignore une ligne finale totalement vide (trailing newline).
  if (lignesCsv.length > 0) {
    const derniere = lignesCsv[lignesCsv.length - 1]!;
    if (derniere.champs.every((champ) => champ.trim() === '')) {
      lignesCsv.pop();
    }
  }

  if (lignesCsv.length === 0) {
    return { entetes: [], lignes: [] };
  }

  const entetes = lignesCsv[0]!.champs.map(normaliserEntete);
  const lignes: { numero: number; valeurs: Record<string, string> }[] = [];

  for (const ligneCsv of lignesCsv.slice(1)) {
    const champsLigne = ligneCsv.champs;
    const numero = ligneCsv.numero;
    // Ignore les lignes de données totalement vides.
    if (champsLigne.every((champ) => champ.trim() === '')) {
      continue;
    }
    const valeurs: Record<string, string> = {};
    champsLigne.forEach((champ: string, index: number) => {
      const cle = entetes[index] ?? `colonne_${index + 1}`;
      valeurs[cle] = champ;
    });
    lignes.push({ numero, valeurs });
  }

  return { entetes, lignes };
}
