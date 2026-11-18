// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { readFileSync, readdirSync } from 'node:fs';
import { extname, dirname, relative, resolve } from 'node:path';

/** Les onze modules métier attendus par l’architecture TAKT. */
export const MODULES_METIER_ATTENDUS = [
  'auth',
  'users',
  'referentiels',
  'repartition',
  'versions',
  'planning',
  'generation',
  'exports',
  'audit',
  'notifications',
  'events',
] as const;

/** Type d’un module métier référencé dans le graphe. */
export type ModuleMetier = (typeof MODULES_METIER_ATTENDUS)[number];

/** Graphe des dépendances internes, indexé par module source. */
export type GrapheModules = Partial<Record<ModuleMetier, readonly string[]>>;

/** Dépendances internes autorisées pour chaque module métier. */
export const DEPENDANCES_AUTORISEES: Readonly<Record<ModuleMetier, readonly string[]>> = {
  auth: ['common', 'users', 'audit'],
  users: ['common', 'audit', 'auth'],
  referentiels: ['common', 'audit'],
  repartition: ['common', 'referentiels', 'versions', 'audit', 'notifications'],
  versions: ['common', 'referentiels', 'audit'],
  planning: ['common', 'referentiels', 'versions'],
  generation: ['common', 'referentiels', 'versions', 'planning'],
  exports: ['common', 'versions', 'planning', 'notifications'],
  audit: ['common'],
  notifications: ['common', 'audit', 'events', 'users'],
  events: ['common', 'auth'],
};

/** Import interne interdit détecté dans le code. */
export interface ViolationDependanceModule {
  readonly moduleSource: ModuleMetier;
  readonly moduleCible: string;
  readonly fichier: string;
  readonly ligne: number;
}

/** Compare un graphe à la matrice des dépendances autorisées. */
export function analyserDependancesModules(graphe: GrapheModules): ViolationDependanceModule[] {
  const violations: ViolationDependanceModule[] = [];

  for (const [moduleSource, dependances] of Object.entries(graphe) as [
    ModuleMetier,
    readonly string[] | undefined,
  ][]) {
    const autorisees = DEPENDANCES_AUTORISEES[moduleSource];
    for (const moduleCible of dependances ?? []) {
      if (!autorisees.includes(moduleCible)) {
        violations.push({
          moduleSource,
          moduleCible,
          fichier: '',
          ligne: 0,
        });
      }
    }
  }

  return violations;
}

/** Extrait les violations dues aux imports relatifs d’un fichier source. */
export function analyserImportsSource(
  moduleSource: ModuleMetier,
  fichier: string,
  source: string,
): ViolationDependanceModule[] {
  const violations: ViolationDependanceModule[] = [];
  const lignes = source.split('\n');
  const autorisees = DEPENDANCES_AUTORISEES[moduleSource];

  for (const [index, ligne] of lignes.entries()) {
    const correspondance = ligne.match(/from\s+['"](\.\.?\/[^'"]+)['"]/);
    if (!correspondance?.[1]) {
      continue;
    }

    const segments = correspondance[1]
      .split('/')
      .filter((segment) => segment !== '.' && segment !== '..');
    const estPrismaDirect = segments[0] === 'common' && segments[1] === 'prisma';
    const moduleCible = estPrismaDirect ? 'common/prisma' : segments[0];
    if (!moduleCible) {
      continue;
    }
    if (estPrismaDirect || (moduleCible !== 'common' && !autorisees.includes(moduleCible))) {
      violations.push({
        moduleSource,
        moduleCible,
        fichier,
        ligne: index + 1,
      });
    }
  }

  return violations;
}

/** Résultat complet du contrôle des dépendances du backend. */
export interface ResultatControleDependances {
  readonly modulesManquants: string[];
  readonly violations: ViolationDependanceModule[];
  readonly cycles: string[][];
}

/** Liste récursivement les fichiers TypeScript de production d’un répertoire. */
function listerSourcesProduction(repertoire: string): string[] {
  return readdirSync(repertoire, { withFileTypes: true }).flatMap((entree) => {
    const chemin = resolve(repertoire, entree.name);
    if (entree.isDirectory()) {
      return listerSourcesProduction(chemin);
    }
    if (extname(entree.name) !== '.ts' || /\.(spec|test)\.ts$/.test(entree.name)) {
      return [];
    }
    return [chemin];
  });
}

/** Extrait le module métier propriétaire d’un fichier source. */
function identifierModuleSource(fichier: string, racineModules: string): ModuleMetier | undefined {
  const relatif = relative(racineModules, fichier);
  const premierSegment = relatif.split(/[\\/]/)[0];
  return MODULES_METIER_ATTENDUS.includes(premierSegment as ModuleMetier)
    ? (premierSegment as ModuleMetier)
    : undefined;
}

/** Extrait le module métier cible d’un chemin d’import résolu. */
function identifierModuleCible(cheminAbsolu: string, racineModules: string): string | undefined {
  const relatif = relative(racineModules, cheminAbsolu);
  if (relatif.startsWith('..') || relatif === '') {
    return undefined;
  }
  const segments = relatif.split(/[\\/]/);
  if (segments[0] === 'common' && segments[1] === 'prisma') {
    return 'common/prisma';
  }
  return segments[0] && segments[0] !== 'common' ? segments[0] : undefined;
}

/** Analyse tous les imports et construit le graphe réel des modules de production. */
export function controlerDependancesBackend(racineBackend: string): ResultatControleDependances {
  const racineModules = resolve(racineBackend, 'src/modules');
  const modulesManquants = MODULES_METIER_ATTENDUS.filter(
    (module) =>
      !readdirSync(racineModules, { withFileTypes: true }).some(
        (entree) => entree.isDirectory() && entree.name === module,
      ),
  );
  const violations: ViolationDependanceModule[] = [];
  const graphe: Record<string, Set<string>> = {};

  for (const fichier of listerSourcesProduction(racineModules)) {
    const moduleSource = identifierModuleSource(fichier, racineModules);
    if (!moduleSource) {
      continue;
    }

    const source = readFileSync(fichier, 'utf8');
    const lignes = source.split('\n');
    const dependances = (graphe[moduleSource] ??= new Set<string>());

    for (const [index, ligne] of lignes.entries()) {
      const correspondance = ligne.match(/from\s+['"](\.\.?\/[^'"]+)['"]/);
      if (!correspondance?.[1]) {
        continue;
      }

      const cheminRelatif = correspondance[1];
      const cheminAbsolu = resolve(dirname(fichier), cheminRelatif);
      const moduleCible = identifierModuleCible(cheminAbsolu, racineModules);
      if (!moduleCible || moduleCible === 'common' || moduleCible === moduleSource) {
        continue;
      }
      dependances.add(moduleCible);

      if (
        moduleCible === 'common/prisma' ||
        !DEPENDANCES_AUTORISEES[moduleSource].includes(moduleCible)
      ) {
        violations.push({
          moduleSource,
          moduleCible,
          fichier: relative(racineBackend, fichier),
          ligne: index + 1,
        });
      }
    }
  }

  const cycles = detecterCyclesModules(graphe as GrapheModules);
  return { modulesManquants: [...modulesManquants], violations, cycles };
}

/** Détecte les cycles du graphe et retourne chaque cycle avec son point de départ. */
export function detecterCyclesModules(graphe: GrapheModules): string[][] {
  const cycles: string[][] = [];
  const parcourus = new Set<string>();
  const pile: string[] = [];

  const visiter = (module: string): void => {
    const index = pile.indexOf(module);
    if (index >= 0) {
      cycles.push([...pile.slice(index), module]);
      return;
    }
    if (parcourus.has(module)) {
      return;
    }

    parcourus.add(module);
    pile.push(module);
    for (const dependance of graphe[module as ModuleMetier] ?? []) {
      visiter(dependance);
    }
    pile.pop();
  };

  for (const module of Object.keys(graphe)) {
    visiter(module);
  }

  return cycles;
}
