---
paths:
  - "apps/frontend/**"
  - "packages/design-tokens/**"
---
# Frontend – React 18 + Vite 5 (SPA, pas de Next.js)

## Stack imposée (ST_TAKT §0.1, UI_FRONTEND_SPECS §1)
- React 18.3, TypeScript 5.5 `strict:true`, Vite 5.4
- Zustand 4 (stores), TanStack Query 5 (fetch/cache), React Hook Form 7 + Zod (`@takt/contracts`)
- @dnd‑kit 6 (grille EDT), Tailwind CSS + composants shadcn/ui **via design‑tokens** (`packages/design-tokens`)
- i18n **français uniquement** – toute chaîne UI passe par clés de traduction (GG‑03)
- Polices auto‑hébergées, pas de CDN externe

## Architecture composants (UI_FRONTEND_SPECS §2)
- Atomic Design : `atoms/`, `molecules/`, `organisms/`, `templates/`, `pages/` (1 page = 1 écran `EC-*`)
- Chaque composant : props typées, 4 états (vide, chargé, erreur, succès), navigation clavier, `aria-*`, focus visible
- **0 couleur en dur** – toute valeur visuelle provient d'un design token (GG‑01, GG‑15)

## Routing & Guards (UI_FRONTEND_SPECS §5, UI_ARBORESCENCE §7‑8)
- React Router 6, lazy‑loading par écran
- `ProtectedRoute` (401 → `EC-COM-01`), `RoleGuard` (table `UI_ARBORESCENCE` 26 écrans), `DepartmentScopeGuard` (RB‑UI‑01)
- Thème Normal / Ramadan switchable, persistant (`localStorage`)

## Tests & Accessibilité (TESTS.md, SPEC_ACCESSIBILITE.md)
- Vitest + Testing Library (unit / intégration) – seuil ≥ 80 % lignes, 100 % branches sur utilitaires critiques
- Playwright 1.4x (E2E) – 12 parcours `UF-*` couverts
- axe‑core (`wcag2aa`, `wcag21aa`, `best-practice`) – job CI `accessibility` **bloquant**
- Pas de `any` sans justification (GG‑04)

## Garde‑fous Frontend (GG‑01…GG‑15 + GG‑16, GG‑17)
- GG‑16 : interdiction d'importer directement `prisma` ou `pg` côté client
- GG‑17 : pas de `localStorage` pour les tokens (access token en mémoire, refresh en cookie HttpOnly)