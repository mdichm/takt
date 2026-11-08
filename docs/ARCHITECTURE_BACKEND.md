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

## Sécurité et autorisation (RBAC)

Les endpoints métier sont protégés par une chaîne de guards NestJS située dans
`apps/backend/src/modules/common/guards/` et des décorateurs déclaratifs dans
`apps/backend/src/modules/common/decorators/`.

| Guard / Décorateur           | Fichier                                                 | Rôle                                                                                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `JwtAuthGuard`               | `common/guards/jwt-auth.guard.ts`                       | Valide l’access token JWT (signature, claims, expiration) et attache l’identité utilisateur (`req.user`). Retourne 401 en cas d’échec. Dépend du jeton `VERIFICATEUR_JWT` fourni par le module `auth` (respect de la règle common → auth). |
| `RolesGuard`                 | `common/guards/roles.guard.ts`                          | Vérifie que le rôle de l’utilisateur figure parmi les rôles autorisés par `@Roles(...)`. Retourne 403 `FORBIDDEN` (jamais 404) en cas d’insuffisance.                                                                                      |
| `DepartmentScopeGuard`       | `common/guards/department-scope.guard.ts`               | Vérifie la portée par département quand `@DepartmentScope()` est présent. Attache `req.departementIds` pour le filtrage Prisma en base. Retourne 403 si l’utilisateur n’a pas de département (rôles `rdep`).                               |
| `VersionStateGuard`          | `common/guards/version-state.guard.ts`                  | Vérifie que l’état courant de la version figure parmi les états autorisés par `@RequireVersionStates(...)`. Retourne 403 en cas d’état non autorisé.                                                                                       |
| `@Roles(...)`                | `common/decorators/roles.decorator.ts`                  | Déclare les rôles autorisés sur un endpoint.                                                                                                                                                                                               |
| `@DepartmentScope()`         | `common/decorators/department-scope.decorator.ts`       | Marque un endpoint comme nécessitant une portée par département.                                                                                                                                                                           |
| `@RequireVersionStates(...)` | `common/decorators/require-version-states.decorator.ts` | Déclare les états de version autorisés sur un endpoint.                                                                                                                                                                                    |

### Matrice rôle × endpoint (users)

L’implémentation actuelle couvre les endpoints du module `users` :

| Endpoint                   | Méthode       | Rôles autorisés        | Scope département          |
| -------------------------- | ------------- | ---------------------- | -------------------------- |
| `GET /api/v1/users`        | Liste         | admin, gest, rdep, dir | Oui (filtrage Prisma)      |
| `GET /api/v1/users/:id`    | Détail        | admin, gest, rdep, dir | Oui (vérification service) |
| `POST /api/v1/users`       | Création      | admin, gest            | Non                        |
| `PATCH /api/v1/users/:id`  | Modification  | admin, gest            | Oui (vérification service) |
| `DELETE /api/v1/users/:id` | Désactivation | admin                  | Non                        |

Réponse en cas d’accès hors périmètre : `403 FORBIDDEN` (jamais `404`), conformément à ST_TAKT §3.4.

Le module `RbacModule` (`common/rbac/rbac.module.ts`) regroupe `RolesGuard`,
`DepartmentScopeGuard` et `VersionStateGuard`. `JwtAuthGuard` est fourni par
le module `auth` (qui possède `TokenService`) afin de respecter la règle de
dépendance : `common` ne doit pas importer `auth`.
