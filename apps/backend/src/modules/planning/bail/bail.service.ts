// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient, Prisma } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';

const PURGE_INTERVALLE_MS = 5 * 60 * 1000; // 5 minutes

interface Detenteur {
  nom: string;
  prenom: string;
}

interface BailAvecDetenteur {
  id: string;
  versionId: string;
  utilisateurId: string;
  dateDebut: Date;
  dateFin: Date;
  derniereActivite: Date;
  utilisateur: Detenteur;
}

export interface BailReponse {
  id: string;
  versionId: string;
  utilisateurId: string;
  dateDebut: string;
  dateFin: string;
  derniereActivite: string;
  detenteur: string;
}

/**
 * Service du bail d'édition exclusif (TAKT-L06-07).
 *
 * Règles :
 * - Un seul bail actif par version (contrainte SQL UNIQUE sur versionId).
 * - Durée 30 min, renouvelable.
 * - Seul le détenteur peut renouveler / libérer ; un `admin` peut forcer.
 * - Un bail expiré est immédiatement ré-acquérable (premier arrivé, premier servi).
 * - Toute mutation métier écrit une entrée `JournalAudit` (GG-07).
 */
@Injectable()
export class BailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BailService.name);
  timerPurge?: NodeJS.Timeout;

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  onModuleInit() {
    // Tâche planifiée de purge des baux expirés (toutes les 5 min).
    // Aucun import @nestjs/schedule (GG-02) : setInterval natif + unref().
    this.timerPurge = setInterval(() => this.purgerBauxExpires(), PURGE_INTERVALLE_MS);
    this.timerPurge.unref();
  }

  onModuleDestroy() {
    if (this.timerPurge) {
      clearInterval(this.timerPurge);
      this.timerPurge = undefined;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Acquisition / vérification / renouvellement / libération           */
  /* ------------------------------------------------------------------ */

  /**
   * Acquiert (ou ré-acquiert) le bail d'édition sur une version.
   * Retourne le bail avec le nom du détenteur.
   * Lève 423 `SEANCE_LOCKED` si un autre utilisateur détient un bail actif.
   */
  async acquerir(versionId: string, utilisateurId: string): Promise<BailReponse> {
    await this.verifierVersionExiste(versionId);

    const maintenant = new Date();
    const dureeBailMs = await this.getDureeBailMs();

    // Purge idempotente des baux expirés sur cette version avant tentative de création.
    await this.prisma.bailEdition.deleteMany({
      where: { versionId, dateFin: { lt: maintenant } },
    });

    try {
      const bail = await this.prisma.bailEdition.create({
        data: {
          versionId,
          utilisateurId,
          dateDebut: maintenant,
          dateFin: new Date(maintenant.getTime() + dureeBailMs),
          derniereActivite: maintenant,
        },
        include: { utilisateur: { select: { nom: true, prenom: true } } },
      });
      await this.audit('POSE_VERROU', utilisateurId, 'BailEdition', bail.id, { versionId });
      return this.formaterBail(bail as unknown as BailAvecDetenteur);
    } catch (erreur) {
      if (erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === 'P2002') {
        // Contrainte UNIQUE sur versionId : un bail existe déjà.
        const existant = await this.prisma.bailEdition.findUnique({
          where: { versionId },
          include: { utilisateur: { select: { nom: true, prenom: true } } },
        });

        if (!existant) {
          throw erreur;
        }

        const existantAvecDetenteur = existant as unknown as BailAvecDetenteur;

        // Bail expiré entre-temps → reprise.
        if (existantAvecDetenteur.dateFin < maintenant) {
          await this.prisma.bailEdition.delete({ where: { id: existantAvecDetenteur.id } });
          return this.acquerir(versionId, utilisateurId);
        }

        // Même utilisateur → renouvellement idempotent.
        if (existantAvecDetenteur.utilisateurId === utilisateurId) {
          return this.renouveler(versionId, utilisateurId);
        }

        // Bail actif détenu par un autre utilisateur → 423.
        throw this.erreurVerrouille(existantAvecDetenteur);
      }
      throw erreur;
    }
  }

  /**
   * Renouvelle le bail d'édition sur une version (prolonge de 30 min).
   * Seul le détenteur peut renouveler.
   */
  async renouveler(versionId: string, utilisateurId: string): Promise<BailReponse> {
    const maintenant = new Date();
    const bail = await this.prisma.bailEdition.findUnique({
      where: { versionId },
      include: { utilisateur: { select: { nom: true, prenom: true } } },
    });

    if (!bail) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Aucun bail actif sur cette version');
    }

    const bailAvecDetenteur = bail as unknown as BailAvecDetenteur;

    if (bailAvecDetenteur.dateFin < maintenant) {
      // Bail expiré : on traite comme une acquisition.
      return this.acquerir(versionId, utilisateurId);
    }

    if (bailAvecDetenteur.utilisateurId !== utilisateurId) {
      throw new ApiError(
        CODES_ERREUR_API.FORBIDDEN,
        403,
        "Vous n'êtes pas le détenteur de ce bail d'édition.",
        { detenteur: `${bailAvecDetenteur.utilisateur.prenom} ${bailAvecDetenteur.utilisateur.nom}` },
      );
    }

    const dureeBailMs = await this.getDureeBailMs();
    const dateFin = new Date(maintenant.getTime() + dureeBailMs);
    const misAJour = await this.prisma.bailEdition.update({
      where: { id: bailAvecDetenteur.id },
      data: { dateFin, derniereActivite: maintenant },
      include: { utilisateur: { select: { nom: true, prenom: true } } },
    });

    await this.audit(
      'RENOUVELLEMENT_VERROU',
      utilisateurId,
      'BailEdition',
      bailAvecDetenteur.id,
      { versionId },
    );

    return this.formaterBail(misAJour as unknown as BailAvecDetenteur);
  }

  /**
   * Libère le bail d'édition sur une version.
   * Seul le détenteur (ou un admin) peut libérer.
   */
  async liberer(versionId: string, utilisateurId: string, estAdmin = false) {
    const bail = await this.prisma.bailEdition.findUnique({
      where: { versionId },
      include: { utilisateur: { select: { nom: true, prenom: true } } },
    });

    if (!bail) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Aucun bail actif sur cette version');
    }

    const bailAvecDetenteur = bail as unknown as BailAvecDetenteur;

    if (!estAdmin && bailAvecDetenteur.utilisateurId !== utilisateurId) {
      throw new ApiError(
        CODES_ERREUR_API.FORBIDDEN,
        403,
        "Vous n'êtes pas le détenteur de ce bail d'édition.",
        { detenteur: `${bailAvecDetenteur.utilisateur.prenom} ${bailAvecDetenteur.utilisateur.nom}` },
      );
    }

    await this.prisma.bailEdition.delete({ where: { id: bailAvecDetenteur.id } });

    await this.audit('LEVEE_VERROU', utilisateurId, 'BailEdition', bailAvecDetenteur.id, {
      versionId,
    });

    return { id: bailAvecDetenteur.id };
  }

  /**
   * Force la libération d'un bail par son identifiant (réservé à l'admin).
   * Lève 403 si l'appelant n'est pas admin (vérifié aussi par le guard).
   */
  async forcer(bailId: string, utilisateurId: string, estAdmin = false) {
    if (!estAdmin) {
      throw new ApiError(CODES_ERREUR_API.FORBIDDEN, 403, 'Seul un administrateur peut forcer la libération d\'un bail.');
    }

    const bail = await this.prisma.bailEdition.findUnique({
      where: { id: bailId },
      include: { utilisateur: { select: { nom: true, prenom: true } } },
    });

    if (!bail) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Bail d\'édition introuvable');
    }

    const bailAvecDetenteur = bail as unknown as BailAvecDetenteur;

    await this.prisma.bailEdition.delete({ where: { id: bailAvecDetenteur.id } });

    await this.audit('FORCAGE_BAIL', utilisateurId, 'BailEdition', bailAvecDetenteur.id, {
      versionId: bailAvecDetenteur.versionId,
      detenteurForce: `${bailAvecDetenteur.utilisateur.prenom} ${bailAvecDetenteur.utilisateur.nom}`,
    });

    return { id: bailAvecDetenteur.id };
  }

  /**
   * Vérifie le droit d'éditer une version (appelé avant toute mutation de séance).
   * Lève 423 `SEANCE_LOCKED` si un autre utilisateur détient un bail actif.
   * Retourne le bail si l'appelant en est le détenteur, null s'il n'y a pas de bail actif.
   */
  async verifierBail(versionId: string, utilisateurId: string) {
    const maintenant = new Date();
    const bail = await this.prisma.bailEdition.findUnique({
      where: { versionId },
      include: { utilisateur: { select: { nom: true, prenom: true } } },
    });

    if (!bail) {
      return null;
    }

    const bailAvecDetenteur = bail as unknown as BailAvecDetenteur;

    if (bailAvecDetenteur.dateFin < maintenant) {
      return null; // expiré → considéré comme absent
    }

    if (bailAvecDetenteur.utilisateurId === utilisateurId) {
      return bailAvecDetenteur;
    }

    throw this.erreurVerrouille(bailAvecDetenteur);
  }

  /**
   * Purge tous les baux expirés (dateFin < now). Tâche planifiée.
   * Retourne le nombre de baux supprimés.
   */
  async purgerBauxExpires(): Promise<number> {
    const maintenant = new Date();
    const resultat = await this.prisma.bailEdition.deleteMany({
      where: { dateFin: { lt: maintenant } },
    });
    const count = resultat.count;
    if (count > 0) {
      this.logger.log(`Purge planifiée : ${count} bail(x) d'édition expiré(x) supprimé(x).`);
    }
    return count;
  }

  /* ------------------------------------------------------------------ */
  /* Privés                                                             */
  /* ------------------------------------------------------------------ */

  private async getDureeBailMs(): Promise<number> {
    const config = await this.prisma.configSysteme.findFirst();
    const minutes = config?.bailEditionDureeMinutes ?? 30;
    return minutes * 60 * 1000;
  }

  private async verifierVersionExiste(versionId: string): Promise<void> {
    const version = await this.prisma.version.findUnique({
      where: { id: versionId },
      select: { id: true },
    });
    if (!version) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Version introuvable');
    }
  }

  private erreurVerrouille(bail: BailAvecDetenteur): ApiError {
    const detenteur = `${bail.utilisateur.prenom} ${bail.utilisateur.nom}`;
    return new ApiError(
      CODES_ERREUR_API.LOCKED,
      423,
      `Cette version est en cours d'édition par ${detenteur}.`,
      { detenteur },
    );
  }

  private async audit(
    action: string,
    utilisateurId: string,
    entite: string,
    entiteId: string,
    metadonnees: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.journalAudit.create({
      data: {
        action,
        utilisateurId,
        entite,
        entiteId,
        metadonnees,
      },
    });
  }

  private formaterBail(bail: BailAvecDetenteur): BailReponse {
    return {
      id: bail.id,
      versionId: bail.versionId,
      utilisateurId: bail.utilisateurId,
      dateDebut: bail.dateDebut.toISOString(),
      dateFin: bail.dateFin.toISOString(),
      derniereActivite: bail.derniereActivite.toISOString(),
      detenteur: `${bail.utilisateur.prenom} ${bail.utilisateur.nom}`,
    };
  }
}
