# PR TAKT — <titre du ticket>

## Ticket
`TAKT-Lxx-nn` — [lien vers le ticket dans BACKLOG_TAKT.md]

## Type de changement
- [ ] `feat:` nouvelle fonctionnalité
- [ ] `fix:` correction de bug
- [ ] `docs:` documentation uniquement
- [ ] `refactor:` refactor sans changement de comportement
- [ ] `test:` ajout ou modification de tests
- [ ] `ci:` configuration CI/CD

## DoR (Definition of Ready)
- [ ] Ticket marqué `En cours` dans `docs/tools/tickets_data.py`
- [ ] Branche nommée `feat/TAKT-Lxx-nn-<slug>`
- [ ] Dépendances du ticket toutes en `Terminé`
- [ ] Périmètre défini et non négociable

## DoD (Definition of Done)
- [ ] Tests écrits (rouge → vert → refactor)
- [ ] `pnpm lint && pnpm typecheck && pnpm test` passent localement
- [ ] Si backend touché : `pnpm db:generate && pnpm test:integration` passent
- [ ] Aucun fichier `dist/` committé (généré uniquement)
- [ ] Ticket marqué `Terminé` dans `docs/tools/tickets_data.py`
- [ ] Artefacts régénérés (`build_backlog.py` + `velocity_tracker.py`)
- [ ] Un seul push par ticket (amend autorisé avant push)
- [ ] Commit en Conventional Commits (français)

## Sécurité
- [ ] Aucun secret en clair (GG-11)
- [ ] Pas de `import prisma` / `pg` côté frontend ou worker (GG-16)
- [ ] En-tête AGPL v3 sur chaque nouveau fichier source (GG-01)

## Revue
- [ ] PO a validé l'alignement métier
- [ ] Architecte a validé la cohérence technique
- [ ] 2 approbations avant merge (PO + Architecte)

---
*Template généré automatiquement — ne pas modifier manuellement hors PR doc‑only.*