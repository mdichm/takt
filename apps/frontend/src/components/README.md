# Design System TAKT — Composants Frontend

Ce dossier regroupe les composants d'interface du design system TAKT, organisés selon le design atomic :

- `atoms/` — briques de base (Bouton, Input, Select, Checkbox, Badge, Chip, Icone, Spinner, Tooltip, Alerte)
- `molecules/` — assemblages d'atomes (FormField, SearchBar, DataTableRow, Paginator, Breadcrumb, Modal, Tabs, EtatVide, EtatChargement, EtatErreur)
- `organisms/` — composants complexes (FormulaireEntite, PanneauConflits, IndicateurCharge, TimelineWorkflow, SelecteurScenario, ShowcaseDesignSystem)

## Règles de conception

1. **0 couleur en dur** : toute valeur de couleur provient des variables CSS des design tokens (`var(--color-*)`).
2. **Accessibilité** : chaque composant est testé avec axe-core (0 violation WCAG2AA).
3. **Props typées** : tous les composants utilisent des interfaces TypeScript explicites, étendant `PropsBase`.
4. **Tests** : chaque composant a un fichier `.test.tsx` (unitaires) et `.a11y.test.tsx` (accessibilité).
5. **i18n français** : toutes les chaînes UI passent par le dictionnaire `src/i18n/fr.ts`.

## Lancer les tests

```bash
# Tous les tests composants
pnpm exec vitest run src/components/

# Uniquement l'accessibilité (axe-core)
pnpm exec vitest run src/components/ --reporter=verbose | grep a11y

# TypeScript
pnpm exec tsc --noEmit

# Lint
pnpm exec eslint src/components/
```

## Structure des tests

| Composant | Test unitaire | Test a11y |
|-----------|--------------|-----------|
| Atomes (10) | ✅ | ✅ |
| Molécules (10) | ✅ | ✅ |
| Organismes (6) | ✅ | ✅ (Showcase uniquement) |