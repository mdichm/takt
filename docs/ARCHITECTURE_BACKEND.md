# Architecture du backend TAKT

## Principes

Le backend est un monolithe modulaire NestJS composé de onze modules métier. Chaque
module possède une responsabilité unique et ne dépend que des modules situés amont
dans le graphe ci-dessous. Le module `common` est transverse : il expose les
services techniques communs et le module Prisma.

Les dépendances entre modules métier sont déclarées dans les imports NestJS et
vérifiées automatiquement. Un module métier ne doit jamais importer directement
`common/prisma` ; il utilise le service Prisma exporté par `CommonModule`.

## Modules métier

| Module          | Responsabilité                               | Dépendances internes autorisées                   |
| --------------- | -------------------------------------------- | ------------------------------------------------- |
| `auth`          | Authentification, JWT et mots de passe       | `common`, `users`                                 |
| `users`         | Utilisateurs, rôles et portée départementale | `common`, `audit`                                 |
| `referentiels`  | Données de référence de l’établissement      | `common`                                          |
| `repartition`   | Répartition pédagogique et charge horaire    | `common`, `referentiels`, `versions`              |
| `versions`      | Cycle de vie des versions de planning        | `common`, `referentiels`                          |
| `planning`      | Séances, contraintes, verrous et conflits    | `common`, `referentiels`, `versions`              |
| `generation`    | Préparation et exécution des générations     | `common`, `referentiels`, `versions`, `planning`  |
| `exports`       | Génération asynchrone des exports            | `common`, `versions`, `planning`, `notifications` |
| `audit`         | Journal d’audit des mutations métier         | `common`                                          |
| `notifications` | Notifications in-app et e-mails              | `common`, `audit`, `events`, `users`              |
| `events`        | Diffusion temps réel des événements          | `common`, `auth`                                  |

Le graphe est acyclique. `common` peut être importé par n’importe quel module,
mais ne doit importer aucun module métier.

## Injection des collaborateurs externes

Les frontières externes sont isolées derrière des tokens NestJS définis dans
`apps/backend/src/modules/common/di/` :

- `SOLVEUR` pour le solveur CP-SAT ;
- `SMTP` pour le transport d’e-mail ;
- `STOCKAGE_FICHIERS` pour les exports et fichiers dérivés.

Chaque token est associé à un contrat TypeScript minimal. Les implémentations
réelles seront fournies par des adaptateurs dédiés ; les tests utilisent des
doubles injectés via `overrideProvider` ou un module de test NestJS.

## Contrôle automatisé

La commande suivante vérifie la présence des onze modules, les imports interdits
et les cycles :

```bash
pnpm check-module-dependencies
```

Le job CI `Check Module Dependencies` exécute ce contrôle et fait partie du job
requis `CI gate`. Les fichiers de test (`*.spec.ts`, `*.test.ts`) sont exclus
de l’analyse des imports de production.
