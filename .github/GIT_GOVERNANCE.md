# Gouvernance Git — Projet TAKT

Ce document décrit la gouvernance Git appliquée au projet TAKT. Il satisfait les exigences `PLAN_MACRO §6`, `GG-12` et `TAKT-L00-04`.

## Branches

- `main` est la branche de production. Elle est protégée : aucun push direct ni merge direct n'est autorisé.
- `develop` est la branche d'intégration. Toute pull request est ouverte vers `develop`.
- Une branche de ticket suit la convention stricte `feat/TAKT-Lxx-nn-<slug-kebab-case>`.
- La branche de ticket est créée depuis `origin/develop` au début du ticket et supprimée après fusion.

Exemple :

```bash
git fetch --prune
git switch -c feat/TAKT-L01-01-initialiser-depot-git origin/develop
```

## Cycle de vie d'un ticket

1. Marquer le ticket `En cours` dans `docs/tools/tickets_data.py` et régénérer les artefacts.
2. Créer la branche de ticket depuis `origin/develop`.
3. Effectuer un seul push de la branche, avec amend autorisé avant ce push.
4. Ouvrir une pull request draft vers `develop`.
5. Après validation locale et CI verte, passer la pull request en revue.
6. Fusionner avec un merge commit, sans réécriture d'historique.
7. Supprimer la branche de ticket locale et distante après fusion.

## Commits

Les messages respectent Conventional Commits et sont rédigés en français :

```text
feat: ajouter la gestion des rôles
fix: corriger la validation du refresh token
docs: documenter la procédure de déploiement
refactor: simplifier le client Prisma
test: couvrir la rotation du jeton
ci: isoler le job de documentation
```

## Protection de `main`

La protection de `main` est configurée dans les règles du dépôt GitHub avec les exigences suivantes :

- pull request obligatoire avant fusion ;
- aucune fusion lorsque `CI gate` échoue ;
- aucune suppression ni réécriture de l'historique ;
- approbation requise selon la politique du dépôt ;
- Linear history désactivée afin de conserver les merge commits de traçabilité.

La configuration distante est vérifiée avec l'API GitHub ou l'interface d'administration du dépôt. Une règle locale documentée ne peut pas, à elle seule, garantir la protection distante.

## Sécurité

- Les secrets ne sont jamais committés. `.env` et `.env.*` sont ignorés, à l'exception de `.env.example`.
- Les artefacts de dépendances, de build, de test et de couverture sont ignorés.
- `git diff --cached` et `git status` sont contrôlés avant chaque commit.
- Un seul push est autorisé par ticket.

## Vérification du dépôt

Le script suivant vérifie les cinq cas d'ignorance exigés par la Definition of Done de `TAKT-L01-01` :

```bash
bash scripts/check-gitignore.sh
```
