// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  STOCKAGE_FICHIERS,
  StockageFichiers,
} from '../../common/di/stockage-fichiers.token';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { SnapshotService } from '../../versions/snapshot/snapshot.service';
import { buildDerivedFile, type DerivedFileOptions } from './derived-file-builder';

export interface FichierDeriveResultat {
  snapshotId: string;
  versionId: string;
  generationId: string;
  chemin: string;
  checksum: string;
  tailleOctets: number;
}

/**
 * Service de construction et d'écriture du fichier dérivé d'entrée du solveur
 * (TAKT-L07-01). Dépend uniquement de modules amont (versions → snapshot),
 * jamais de la base métier directement.
 *
 * Règles :
 * - Le builder est pur (pas d'accès DB) ; le service orchestre lecture snapshot
 *   + écriture store.
 * - Le fichier est écrit sous `derived/{snapshotId}.json`.
 * - Toute écriture est journalisée (GG-07).
 */
@Injectable()
export class DerivedFileService {
  private readonly logger = new Logger(DerivedFileService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(STOCKAGE_FICHIERS) private readonly stockage: StockageFichiers,
    private readonly snapshotService: SnapshotService,
  ) {}

  async construireEtEcrire(
    versionId: string,
    options: DerivedFileOptions,
  ): Promise<FichierDeriveResultat> {
    // 1. Récupère le snapshot courant de la version (données figées, EX-DAT-01)
    const snapshot = await this.snapshotService.obtenirSnapshotCourant(versionId);

    // 2. Construit le fichier dérivé (builder pur, pas d'accès DB)
    const { fichier, checksum } = buildDerivedFile(snapshot.donnees, options);

    // 3. Écriture dans le store de fichiers
    const contenu = Buffer.from(JSON.stringify(fichier, null, 2), 'utf8');
    const chemin = `derived/${snapshot.id}.json`;
    await this.stockage.ecrire(chemin, {
      donnees: contenu,
      typeMime: 'application/json',
    });

    this.logger.log(
      `Fichier dérivé écrit : ${chemin} (checksum ${checksum.slice(0, 16)}…)`,
    );

    return {
      snapshotId: snapshot.id,
      versionId,
      generationId: options.generationId,
      chemin,
      checksum,
      tailleOctets: contenu.length,
    };
  }

  async lire(versionId: string): Promise<{ fichier: unknown; chemin: string }> {
    const snapshot = await this.snapshotService.obtenirSnapshotCourant(versionId);
    const chemin = `derived/${snapshot.id}.json`;
    const contenu = await this.stockage.lire(chemin);
    return { fichier: JSON.parse(Buffer.from(contenu.donnees).toString('utf8')), chemin };
  }
}
