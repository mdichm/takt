// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Injectable } from '@nestjs/common';
import { hash as hacherArgon2, verify as verifierArgon2 } from 'argon2';
import { PASSWORD_ARGON2_OPTIONS, VERSION_ARGON2 } from '../../config/password.config';

/** Paramètres Argon2id publics, utile pour le diagnostic de rehash. */
export { PASSWORD_ARGON2_OPTIONS } from '../../config/password.config';

/**
 * Service de hachage et de vérification des mots de passe.
 *
 * Aucun mot de passe ni hash n'est journalisé. Les erreurs de format sont
 * converties en vérification négative afin de ne pas révéler d'information
 * sur la validité du hash reçu.
 */
@Injectable()
export class PasswordService {
  /** Hache un mot de passe avec les paramètres Argon2id calibrés. */
  async hash(motDePasse: string): Promise<string> {
    return hacherArgon2(motDePasse, PASSWORD_ARGON2_OPTIONS);
  }

  /** Vérifie un mot de passe contre un hash Argon2id. */
  async verify(hash: string, motDePasse: string): Promise<boolean> {
    try {
      return await verifierArgon2(hash, motDePasse);
    } catch {
      return false;
    }
  }

  /**
   * Indique si un hash doit être recalculé avec les paramètres actuels.
   *
   * Un hash absent, mal formé ou produit avec une autre version Argon2 est
   * considéré comme nécessitant un rehash.
   */
  needsRehash(hash: string): boolean {
    const champs = hash.split('$');
    const [, algorithme, version, parametres] = champs;

    if (algorithme !== 'argon2id' || version !== `v=${VERSION_ARGON2}` || !parametres) {
      return true;
    }

    const valeurs = new Map<string, number>();
    for (const parametre of parametres.split(',')) {
      const [cle, valeur] = parametre.split('=');
      if (!cle || !valeur || !/^\d+$/.test(valeur)) {
        return true;
      }
      valeurs.set(cle, Number(valeur));
    }

    return (
      valeurs.get('m') !== PASSWORD_ARGON2_OPTIONS.memoryCost ||
      valeurs.get('t') !== PASSWORD_ARGON2_OPTIONS.timeCost ||
      valeurs.get('p') !== PASSWORD_ARGON2_OPTIONS.parallelism
    );
  }

  /** Mesure en millisecondes le temps nécessaire pour produire un hash. */
  async measureHashDuration(motDePasse: string): Promise<number> {
    const debut = performance.now();
    await this.hash(motDePasse);
    return performance.now() - debut;
  }
}
