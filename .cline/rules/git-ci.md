---
paths: []
---
# Git, Branching, CI – workflow TAKT (adapté mono‑poste, inspiré ISAMK)

## 1. Début de session (chaque ticket)
```bash
git fetch --prune
git status -sb
git switch -c feat/TAKT-L<lot>-<nn>-<slug> origin/main
```
- Nom de branche **exact** : `feat/TAKT-Lxx-nn-<kebab-slug>` (regex `^feat/TAKT-L\d{2}-\d{2}-[a-z0-9-]+$`)

## 2. Claim & Draft PR
```bash
# Marquer le ticket « En cours » dans docs/tools/tickets_data.py
python3 docs/tools/build_backlog.py   # régénère artefacts dist/
git add docs/tools/tickets_data.py
git commit -m "docs: mark TAKT-L<lot>-<nn> En cours"
git push -u origin HEAD
gh pr create --draft --title "feat(TAKT-L<lot>-<nn>): <titre>" --body "Claimed. In progress."
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
gh pr ready
gh pr checks --watch
```

## 5. CI (`.github/workflows/ci.yml` – aligné sur SPEC_CI)
- Jobs : `lint-and-typecheck` → `test` (unit + int + coverage) → `build` → `docker-build` → `e2e` (Playwright) → `deploy-recette` (auto sur `main` vert)
- **Seul `CI gate` est requis** sur la PR (path‑filtering évite jobs inutiles)
- `concurrency` annule les runs PR supersédés ; `main` queue ; déploiement sérialisé
- Images Docker taguées `sha-${GITHUB_SHA}` ; `latest` déplacé seulement après `deploy-recette` vert

## 6. Sync avec `main` (merge, pas de rebase forcé)
```bash
git fetch --prune
git merge origin/main   # résoudre conflits manuellement, expliquer la résolution
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