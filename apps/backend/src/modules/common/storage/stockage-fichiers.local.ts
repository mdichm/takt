// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { StockageFichiers, ContenuFichier } from '../di/stockage-fichiers.token';
/**
 * Implémentation disque du stockage de fichiers (exports, fichiers dérivés).
 * Le répertoire racine est configurable via la variable d'environnement
 * `STOCKAGE_FICHIERS_RACINE` (défaut : `<cwd>/storage`).
 */
@Injectable()
export class StockageFichiersLocal implements StockageFichiers {
  private readonly racine: string;

  constructor() {
    this.racine = process.env.STOCKAGE_FICHIERS_RACINE ?? 'storage';
  }

  private cheminComplet(chemin: string): string {
    return path.join(this.racine, chemin);
  }

  async ecrire(chemin: string, contenu: ContenuFichier): Promise<void> {
    const cible = this.cheminComplet(chemin);
    await fs.mkdir(path.dirname(cible), { recursive: true });
    await fs.writeFile(cible, contenu.donnees);
  }

  async lire(chemin: string): Promise<ContenuFichier> {
    const cible = this.cheminComplet(chemin);
    const donnees = await fs.readFile(cible);
    const typeMime = path.extname(cible) === '.json' ? 'application/json' : 'application/octet-stream';
    return { donnees, typeMime };
  }
}
