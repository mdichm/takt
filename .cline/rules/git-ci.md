---
paths: []
---
# Git, Branching, CI – workflow TAKT (adapté mono‑poste, inspiré ISAMK)

## 1. Début de session (chaque ticket)
```bash
git fetch --prune
git status -sb
git switch -c feat/TAKT-L<lot>-<nn>-<slug> origin/develop
```
- Nom de branche **exact** : `feat/TAKT-Lxx-nn-<kebab-slug>` (regex `^feat/TAKT-L\d{2}-\d{2}-[a-z0-9-]+$`)
- Branche d'intégration : `develop` ; `main` est réservée à la production et au déploiement.

## 2. Claim & Draft PR
```bash
# Marquer le ticket « En cours » dans docs/tools/tickets_data.py
python3 docs/tools/build_backlog.py   # régénère artefacts dist/
git add docs/tools/tickets_data.py
git commit -m "docs: mark TAKT-L<lot>-<nn> En cours"
git push -u origin HEAD
gh pr create --draft --base develop --title "feat(TAKT-L<lot>-<nn>): <titre>" --body "Claimed. In progress."
```

## 3. Développement (TDD)
- Écrire le test **rouge** (unit / intégration / E2E) → implémenter → refactor
- **Un seul push** par ticket (amend autorisé avant push) – GG‑12
- Commits **Conventional Commits** en **français** : `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `ci:` – GG‑03

## 4. Fin de session / Prêt pour revue
```bash
# 1. Tests locaux complets
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test
# 2. Si backend touché
(cd apps/backend && pnpm db:generate && pnpm test:integration)
# 3. Marquer « Terminé », régénérer artefacts
python3 docs/tools/build_backlog.py && python3 docs/tools/velocity_tracker.py
git add docs/tools/tickets_data.py
git commit -m "feat: implement TAKT-L<lot>-<nn> …"
git push
gh pr ready   # déclenche la CI de la PR vers develop
gh pr checks --watch
```

## 5. CI (`.github/workflows/ci.yml` – aligné sur SPEC_CI)
- Jobs : `lint-and-typecheck` → `test` (unit + int + coverage) → `build` → `docker-build` → `e2e` (Playwright).
- CI déclenchée **uniquement** à la PR prête pour revue vers `develop`, puis au push/merge dans `develop`.
- Aucun lancement sur push de branche de ticket, ouverture de PR ou mise à jour d'une PR draft.
- Le job requis par la protection de `develop` est `CI gate`.
- `concurrency` annule les runs supersédés ; `develop` est mis en file d'attente.
- Le déploiement recette est isolé dans `.github/workflows/deploy-recette.yml` et déclenché par push sur `main`.
- Images Docker taguées `sha-${GITHUB_SHA}` ; `latest` déplacé seulement après déploiement recette vert.

## 6. Sync avec `develop` (merge, pas de rebase forcé)
```bash
git fetch --prune
git merge origin/develop   # résoudre conflits manuellement, expliquer la résolution
```

## 7. Nettoyage post‑merge (local)
```bash
git fetch --prune
git for-each-ref --format='%(refname:short) %(upstream:track)' refs/heads |
awk '$2=="[gone]" {print $1}' | xargs -r git branch -d
```

## 8. Sécurité
- `git-secrets` + `pnpm audit` dans CI
- Aucun secret en clair (GG‑11) – variables via `.env.local` (dev) ou Docker secrets (recette/prod)