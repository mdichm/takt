// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { appliquerArrondi, estModeArrondiValide } from '../src/arrondi';
import type { ModeArrondi } from '../src/types';

describe('arrondi', () => {
  describe('appliquerArrondi', () => {
    describe('mode UNITAIRE', () => {
      it('arrondit 0 à 0', () => {
        expect(appliquerArrondi(0, 'UNITAIRE', 7, 3.5)).toBe(0);
      });

      it('arrondit 1 à 1', () => {
        expect(appliquerArrondi(1, 'UNITAIRE', 7, 3.5)).toBe(1);
      });

      it('arrondit 1.2 à 1 (inférieur à 0.5)', () => {
        expect(appliquerArrondi(1.2, 'UNITAIRE', 7, 3.5)).toBe(1);
      });

      it('arrondit 1.5 à 2 (demi-supérieur)', () => {
        expect(appliquerArrondi(1.5, 'UNITAIRE', 7, 3.5)).toBe(2);
      });

      it('arrondit 1.7 à 2 (supérieur à 0.5)', () => {
        expect(appliquerArrondi(1.7, 'UNITAIRE', 7, 3.5)).toBe(2);
      });

      it('arrondit 2.5 à 3 (demi-supérieur)', () => {
        expect(appliquerArrondi(2.5, 'UNITAIRE', 7, 3.5)).toBe(3);
      });
    });

    describe('mode DEMI_JOURNEE', () => {
      it('arrondit 0 à 0', () => {
        expect(appliquerArrondi(0, 'DEMI_JOURNEE', 7, 3.5)).toBe(0);
      });

      it('arrondit 1 à 0 (plus proche de 0 que de 3.5)', () => {
        expect(appliquerArrondi(1, 'DEMI_JOURNEE', 7, 3.5)).toBe(0);
      });

      it('arrondit 1.75 à 0 (milieu exact entre 0 et 3.5 → demi-supérieur = 3.5)', () => {
        expect(appliquerArrondi(1.75, 'DEMI_JOURNEE', 7, 3.5)).toBe(3.5);
      });

      it('arrondit 2 à 3.5 (plus proche de 3.5)', () => {
        expect(appliquerArrondi(2, 'DEMI_JOURNEE', 7, 3.5)).toBe(3.5);
      });

      it('arrondit 3 à 3.5', () => {
        expect(appliquerArrondi(3, 'DEMI_JOURNEE', 7, 3.5)).toBe(3.5);
      });

      it('arrondit 3.5 à 3.5 (exact)', () => {
        expect(appliquerArrondi(3.5, 'DEMI_JOURNEE', 7, 3.5)).toBe(3.5);
      });

      it('arrondit 5.25 à 3.5 (milieu entre 3.5 et 7 → demi-supérieur = 7)', () => {
        expect(appliquerArrondi(5.25, 'DEMI_JOURNEE', 7, 3.5)).toBe(7);
      });

      it('arrondit 7 à 7', () => {
        expect(appliquerArrondi(7, 'DEMI_JOURNEE', 7, 3.5)).toBe(7);
      });

      it('utilise la dureeDemiJournee configurée (ex: 4h)', () => {
        // pas = 4 : 2/4=0.5 → floor(1)=1 → 4; 4/4=1 → floor(1.5)=1 → 4; 6/4=1.5 → floor(2)=2 → 8; 8/4=2 → floor(2.5)=2 → 8
        expect(appliquerArrondi(2, 'DEMI_JOURNEE', 7, 4)).toBe(4);
        expect(appliquerArrondi(4, 'DEMI_JOURNEE', 7, 4)).toBe(4);
        expect(appliquerArrondi(6, 'DEMI_JOURNEE', 7, 4)).toBe(8);
        expect(appliquerArrondi(8, 'DEMI_JOURNEE', 7, 4)).toBe(8);
      });
    });

    describe('mode JOURNEE', () => {
      it('arrondit 0 à 0', () => {
        expect(appliquerArrondi(0, 'JOURNEE', 7, 3.5)).toBe(0);
      });

      it('arrondit 3 à 0 (plus proche de 0 que de 7)', () => {
        expect(appliquerArrondi(3, 'JOURNEE', 7, 3.5)).toBe(0);
      });

      it('arrondit 3.5 à 7 (milieu exact → demi-supérieur = 7)', () => {
        expect(appliquerArrondi(3.5, 'JOURNEE', 7, 3.5)).toBe(7);
      });

      it('arrondit 5 à 7', () => {
        expect(appliquerArrondi(5, 'JOURNEE', 7, 3.5)).toBe(7);
      });

      it('arrondit 7 à 7 (exact)', () => {
        expect(appliquerArrondi(7, 'JOURNEE', 7, 3.5)).toBe(7);
      });

      it('arrondit 10.5 à 7 (milieu entre 7 et 14 → demi-supérieur = 14)', () => {
        expect(appliquerArrondi(10.5, 'JOURNEE', 7, 3.5)).toBe(14);
      });

      it('utilise la dureeJournee configurée (ex: 8h)', () => {
        // pas = 8 : 4/8=0.5 → floor(1)=1 → 8; 8/8=1 → floor(1.5)=1 → 8; 12/8=1.5 → floor(2)=2 → 16; 16/8=2 → floor(2.5)=2 → 16
        expect(appliquerArrondi(4, 'JOURNEE', 8, 3.5)).toBe(8);
        expect(appliquerArrondi(8, 'JOURNEE', 8, 3.5)).toBe(8);
        expect(appliquerArrondi(12, 'JOURNEE', 8, 3.5)).toBe(16);
        expect(appliquerArrondi(16, 'JOURNEE', 8, 3.5)).toBe(16);
      });
    });

    describe('valeurs négatives ou nulles', () => {
      it('retourne 0 pour une valeur négative', () => {
        expect(appliquerArrondi(-1, 'UNITAIRE', 7, 3.5)).toBe(0);
        expect(appliquerArrondi(-5, 'DEMI_JOURNEE', 7, 3.5)).toBe(0);
        expect(appliquerArrondi(-10, 'JOURNEE', 7, 3.5)).toBe(0);
      });
    });

    describe('mode inconnu', () => {
      it('retourne la valeur inchangée pour un mode invalide', () => {
        expect(appliquerArrondi(3.7, 'INVALIDE' as ModeArrondi, 7, 3.5)).toBe(3.7);
      });
    });
  });

  describe('estModeArrondiValide', () => {
    it('retourne true pour UNITAIRE', () => {
      expect(estModeArrondiValide('UNITAIRE')).toBe(true);
    });

    it('retourne true pour DEMI_JOURNEE', () => {
      expect(estModeArrondiValide('DEMI_JOURNEE')).toBe(true);
    });

    it('retourne true pour JOURNEE', () => {
      expect(estModeArrondiValide('JOURNEE')).toBe(true);
    });

    it('retourne false pour une chaîne vide', () => {
      expect(estModeArrondiValide('')).toBe(false);
    });

    it('retourne false pour un mode inconnu', () => {
      expect(estModeArrondiValide('INCONNU')).toBe(false);
    });
  });
});