# Design Tokens — TAKT (UI_DESIGN_TOKENS.md)

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques  
**Version :** 0.1 (E0.3e — validé)  
**Date :** 30 octobre 2026  
**Responsables :** UX Designer + MOA  
**Statut :** Phase 0 (E0.3e) — Validé  
**Critère de sortie :** Design tokens figés pour les thèmes Normal et Ramadan  
**Documents liés :** UI_ARBORESCENCE.md (E0.3a), UI_WIREFRAMES.md (E0.3c), SF_TAKT.md (§12 EX-UI-01)

---

**Convention d'identification.**
- Chaque token porte un code stable `DT-<CATÉGORIE>-<NN>` (ex: `DT-COLOR-01`, `DT-TYPO-02`).
- Les thèmes sont nommés `normal` et `ramadan`.
- Les tokens sont stockés dans `packages/design-tokens/`.

---

## §1. Vue d'ensemble des design tokens

| Catégorie | Code | Description | Thèmes concernés |
|-----------|------|-------------|------------------|
| Couleurs primaires | `DT-COLOR-*` | Couleurs de marque, états, surfaces | Normal, Ramadan |
| Typographie | `DT-TYPO-*` | Tailles de police, graisses, interlignage | Normal, Ramadan |
| Espacements | `DT-SPACE-*` | Marge, padding, grille | Normal, Ramadan |
| Bordures et ombres | `DT-BORDER-*` | Rayons, bordures, ombres portées | Normal, Ramadan |
| Composants | `DT-COMP-*` | Tokens spécifiques aux composants (boutons, grille EDT, etc.) | Normal, Ramadan |
| Animations | `DT-MOTION-*` | Durées, courbes de transition | Normal, Ramadan |

**Total :** 6 catégories de tokens, déclinées sur 2 thèmes (Normal et Ramadan).

---

## §2. Tokens de couleur

### Palette de base (commune aux deux thèmes)

| Code | Nom | Valeur hex | Usage |
|------|-----|------------|-------|
| `DT-COLOR-01` | Primary | #2563EB | Couleur principale de marque |
| `DT-COLOR-02` | Primary hover | #1D4ED8 | État survol |
| `DT-COLOR-03` | Primary active | #1E40AF | État actif/cliqué |
| `DT-COLOR-04` | Secondary | #64748B | Couleur secondaire |
| `DT-COLOR-05` | Surface | #FFFFFF | Fond des cartes |
| `DT-COLOR-06` | Surface variant | #F8FAFC | Fond alternatif |
| `DT-COLOR-07` | Background | #F1F5F9 | Fond de page |
| `DT-COLOR-08` | Text primary | #0F172A | Texte principal |
| `DT-COLOR-09` | Text secondary | #475569 | Texte secondaire |
| `DT-COLOR-10` | Text disabled | #94A3B8 | Texte désactivé |
| `DT-COLOR-11` | Border | #E2E8F0 | Bordures |
| `DT-COLOR-12` | Divider | #CBD5E1 | Séparateurs |

### Tokens sémantiques (états)

| Code | Nom | Valeur Normal | Valeur Ramadan | Usage |
|------|-----|---------------|----------------|-------|
| `DT-COLOR-20` | Success | #10B981 | #059669 | Succès, validation |
| `DT-COLOR-21` | Warning | #F59E0B | #D97706 | Alerte, attention |
| `DT-COLOR-22` | Error | #EF4444 | #DC2626 | Erreur, conflit |
| `DT-COLOR-23` | Info | #3B82F6 | #2563EB | Information |
| `DT-COLOR-24` | Lock | #94A3B8 | #64748B | Verrou de séance |
| `DT-COLOR-25` | Lock incompatible | #EF4444 | #DC2626 | Verrou bloquant |

### Thème Ramadan (spécifique)

| Code | Nom | Valeur Normal | Valeur Ramadan | Usage |
|------|-----|---------------|----------------|-------|
| `DT-COLOR-30` | Primary Ramadan | #2563EB | #7C3AED | Couleur principale en thème Ramadan |
| `DT-COLOR-31` | Surface Ramadan | #FFFFFF | #FAF5FF | Fond des cartes Ramadan |
| `DT-COLOR-32` | Accent Ramadan | #F59E0B | #FBBF24 | Couleur d'accentuation Ramadan |

---

## §3. Tokens de typographie

| Code | Nom | Taille | Graisse | Interlignage | Usage |
|------|-----|--------|---------|--------------|-------|
| `DT-TYPO-01` | H1 | 2rem | 700 | 1.2 | Titre de page |
| `DT-TYPO-02` | H2 | 1.5rem | 600 | 1.25 | Titre de section |
| `DT-TYPO-03` | H3 | 1.25rem | 600 | 1.3 | Sous-titre |
| `DT-TYPO-04` | Body | 1rem | 400 | 1.5 | Texte courant |
| `DT-TYPO-05` | Body small | 0.875rem | 400 | 1.4 | Texte secondaire |
| `DT-TYPO-06` | Caption | 0.75rem | 400 | 1.4 | Légende, aide |
| `DT-TYPO-07` | Button | 0.875rem | 500 | 1.2 | Texte des boutons |
| `DT-TYPO-08` | Badge | 0.75rem | 600 | 1.2 | Badges d'état |


---

## §4. Tokens d'espacement

| Code | Nom | Valeur | Usage |
|------|-----|--------|-------|
| `DT-SPACE-01` | XXS | 0.25rem (4px) | Espacement très serré |
| `DT-SPACE-02` | XS | 0.5rem (8px) | Espacement serré |
| `DT-SPACE-03` | S | 0.75rem (12px) | Espacement standard réduit |
| `DT-SPACE-04` | M | 1rem (16px) | Espacement standard |
| `DT-SPACE-05` | L | 1.5rem (24px) | Espacement large |
| `DT-SPACE-06` | XL | 2rem (32px) | Espacement très large |
| `DT-SPACE-07` | XXL | 3rem (48px) | Espacement maximal |
| `DT-SPACE-08` | Grid gutter | 1rem (16px) | Gouttière de grille |

---

## §5. Tokens de bordure et ombre

| Code | Nom | Valeur | Usage |
|------|-----|--------|-------|
| `DT-BORDER-01` | Radius SM | 0.25rem (4px) | Petits composants |
| `DT-BORDER-02` | Radius MD | 0.5rem (8px) | Boutons, cartes |
| `DT-BORDER-03` | Radius LG | 0.75rem (12px) | Modals, grands panneaux |
| `DT-BORDER-04` | Radius XL | 1rem (16px) | Éléments arrondis |
| `DT-BORDER-05` | Border width | 1px | Épaisseur de bordure standard |
| `DT-BORDER-06` | Shadow SM | 0 1px 2px rgba(0,0,0,0.05) | Ombre légère |
| `DT-BORDER-07` | Shadow MD | 0 4px 6px rgba(0,0,0,0.07) | Ombre standard |
| `DT-BORDER-08` | Shadow LG | 0 10px 15px rgba(0,0,0,0.1) | Ombre forte (modals) |
**Police principale :** Inter (fallback : police système sans-serif)

---

## §6. Tokens de composants

| Code | Nom | Valeur Normal | Valeur Ramadan | Usage |
|------|-----|---------------|----------------|-------|
| `DT-COMP-01` | Button height | 2.5rem (40px) | 2.5rem (40px) | Hauteur des boutons |
| `DT-COMP-02` | Button padding X | 1rem (16px) | 1rem (16px) | Padding horizontal bouton |
| `DT-COMP-03` | Input height | 2.5rem (40px) | 2.5rem (40px) | Hauteur des champs |
| `DT-COMP-04` | Card padding | 1.5rem (24px) | 1.5rem (24px) | Padding des cartes |
| `DT-COMP-05` | Table row height | 3rem (48px) | 3rem (48px) | Hauteur des lignes tableau |
| `DT-COMP-06` | Badge padding X | 0.5rem (8px) | 0.5rem (8px) | Padding horizontal badge |
| `DT-COMP-07` | Grid EDT cell height | 4rem (64px) | 4rem (64px) | Hauteur des cellules grille EDT |
| `DT-COMP-08` | Sidebar width | 16rem (256px) | 16rem (256px) | Largeur de la sidebar |

---

## §7. Tokens d'animation et mouvement

| Code | Nom | Durée | Courbe | Usage |
|------|-----|-------|--------|-------|
| `DT-MOTION-01` | Fast | 150ms | ease-out | Micro-interactions |
| `DT-MOTION-02` | Normal | 250ms | ease-in-out | Transitions standard |
| `DT-MOTION-03` | Slow | 350ms | ease-in-out | Ouverture de modals |
| `DT-MOTION-04` | Drag&drop | 200ms | ease-out | Déplacement séance |
| `DT-MOTION-05` | Toast appear | 150ms | ease-out | Apparition notification |

---

## §8. Règles d'application des tokens

| Règle | Description |
|-------|-------------|
| `RB-DT-01` | Aucun code couleur en dur dans les composants ; tous utilisent des tokens |
| `RB-DT-02` | Les états ne sont jamais rendus par la seule couleur (libellé + icône requis, WCAG AA) |
| `RB-DT-03` | Le thème Ramadan s'active via une variable CSS ou une classe sur l'élément racine |
| `RB-DT-04` | Le contraste minimal WCAG AA (4.5:1 pour le texte normal, 3:1 pour le texte large) doit être respecté sur les deux thèmes |
| `RB-DT-05` | Le passage d'un thème à l'autre doit être instantané (pas de rechargement de page) |

---

## §9. Decision Log Design Tokens

| # | Décision | Conséquence |
|---|----------|-------------|
| DL-DT-01 | Deux thèmes : Normal et Ramadan | Switch de thème via variable CSS, pas de rechargement |
| DL-DT-02 | Tokens au format CSS custom properties | `packages/design-tokens/` avec fichiers `.css` ou `.js` exportant les tokens |
| DL-DT-03 | WCAG AA sur les deux thèmes | Contrastes vérifiés pour Normal et Ramadan |
| DL-DT-04 | Pas de mode sombre en v1.0 | Seuls Normal et Ramadan sont prévus |

---

### Livrables prévus

1. `docs/UI_DESIGN_TOKENS.md` — ce document de spécification
2. `packages/design-tokens/tokens-normal.css` — tokens du thème Normal
3. `packages/design-tokens/tokens-ramadan.css` — tokens du thème Ramadan
4. `packages/design-tokens/index.js` — export programmatique des tokens (JS)

---

### Dépendances

Aucune dépendance technique requise pour la rédaction du document. Les fichiers CSS/JS de tokens seront créés lors de l'implémentation frontend (phase ultérieure).

---

*Fin du UI_DESIGN_TOKENS.md — TAKT v0.1 (E0.3e — validé)*