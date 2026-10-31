# Plan de déploiement — TAKT (DEPLOIEMENT.md)

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques
**Version :** 0.1 (E0.8 — validé)
**Date :** 30 octobre 2026
**Responsables :** DSI + Architecte
**Statut :** Phase 0 (E0.8) — Validé
**Critère de sortie :** Environnements dev/recette/prod, sauvegardes, rollback
**Documents liés :** ST_TAKT.md, PLAN_MACRO.md, openapi.yaml, contract.prisma

---
**Convention d identification.**
- Chaque exigence de déploiement porte un code stable DEP-<DOMAINE>-<NN> (ex: DEP-INF-01, DEP-SV-02).
- Les références au ST_TAKT utilisent le code TE-*.
- Les références au PLAN_MACRO utilisent le code PM-*.
---

## 1. Environnements de déploiement

### 1.1 Présentation des environnements

TAKT déploie trois environnements distincts sur site (réseau interne institutionnel) :

| Environnement | Objectif | Accès | Données | Mise à jour |
|---------------|----------|-------|---------|-------------|
| **dev** | Développement et tests unitaires | Équipe de développement uniquement | Données de test (seeds) | À chaque push sur branche de feature |
| **recette** | Recette métier, tests E2E, validation MOA | MOA, DSI, équipe de dev | Données d'anonymisation / recette | À chaque release candidate |
| **prod** | Production, utilisateurs finaux | Utilisateurs autorisés (réseau interne) | Données réelles | Après recette signée (jalon J70) |

### 1.2 Différences entre environnements

| Élément | dev | recette | prod |
|---------|-----|---------|------|
| Base de données | PostgreSQL 16 (test) | PostgreSQL 16 (recette) | PostgreSQL 16 (prod) |
| Nginx | Non requis (dev local) | Oui, TLS optionnel | Oui, TLS obligatoire |
| URL | http://localhost:3000 | https://recette.takt.internal | https://takt.internal |
| Secrets | Fichiers .env locaux | Fichiers secrets montés | Fichiers secrets montés |
| CP-SAT worker | Local | Conteneurisé | Conteneurisé, isolé |
| Logs | Stdout | Fichiers + centralisation | Fichiers + centralisation + alertes |

### 1.3 Règles d'environnement

| Règle | Description |
|-------|-------------|
| DEP-ENV-01 | L'environnement de recette doit être identique à celui de production (PLAN_MACRO risque P5) |
| DEP-ENV-02 | Aucune donnée de production ne doit être copiée vers dev sans anonymisation |
| DEP-ENV-03 | Les secrets ne sont jamais stockés dans le contrôle de version (Git) |
| DEP-ENV-04 | Chaque environnement a sa propre base de données PostgreSQL isolée |

---

## 2. Infrastructure et conteneurisation

### 2.1 Stack d'infrastructure (conforme à ST_TAKT.md)

| Composant | Technologie | Version | Rôle |
|-----------|-------------|---------|------|
| Hébergement | Sur site, réseau interne institutionnel | — | Serveurs physiques ou VM |
| Reverse proxy | Nginx | — | Terminaison TLS, routage, CORS, rate limiting |
| Conteneurisation | Docker Compose | — | Orchestration des services |
| Base de données | PostgreSQL | 16 | Données métier, pg-boss (jobs asynchrones) |
| Backend | NestJS | 10+ | API REST, authentification, workflow |
| Frontend | React + Vite | 18.3 | SPA servie par Nginx |
| Worker CP-SAT | Conteneur dédié | — | Génération d'emplois du temps, isolé |
| Secrets | Fichiers secrets | — | Pas de variables d'environnement en clair |

### 2.2 Architecture Docker Compose

```
┌─────────────────────────────────────────────────────────────┐
│  Nginx (reverse proxy, TLS, CORS, rate limiting)            │
└─────────────────────────────────────────────────────────────┘
         │
    ┌────▼────┐
    │ Backend │  NestJS + Prisma + pg-boss client
    │  API    │  (port 3000 interne)
    └────┬────┘
         │
    ┌────▼────┐     ┌─────────────────────┐
    │  DB     │     │  Worker CP-SAT      │
    │ Postgres│     │  (conteneur isolé)  │
    │   16    │     │  (pas d'accès DB)   │
    └─────────┘     └─────────────────────┘
```

### 2.3 Services Docker Compose

| Service | Image | Port exposé | Volumes | Dépendances |
|---------|-------|-------------|---------|-------------|
| nginx | nginx:alpine | 80, 443 | /etc/nginx/conf.d, /etc/letsencrypt | backend |
| backend | takt/backend:latest | 3000 (interne) | /app/secrets | db |
| db | postgres:16 | 5432 (interne) | /var/lib/postgresql/data | — |
| worker-cpsat | takt/worker-cpsat:latest | — | /app/secrets | db |
| frontend | takt/frontend:latest | — (servi par Nginx) | — | — |

### 2.4 Gestion des secrets

| Élément | Méthode | Emplacement |
|---------|---------|-------------|
| Mot de passe base de données | Fichier secret | /run/secrets/db_password |
| Clé secrète JWT | Fichier secret | /run/secrets/jwt_secret |
| Clé de signature JWT | Fichier secret | /run/secrets/jwt_signing_key |
| Identifiants SMTP | Fichier secret | /run/secrets/smtp_credentials |
| Clés TLS | Fichier secret | /etc/letsencrypt/live/takt.internal/ |

### 2.5 Règles d'infrastructure

| Règle | Description |
|-------|-------------|
| DEP-INF-01 | Le solver CP-SAT n'a aucun accès direct à la base métier (ST_TAKT TE-SEC-01) |
| DEP-INF-02 | Les secrets sont montés en tant que fichiers, jamais en variables d'environnement (ST_TAKT §5.5) |
| DEP-INF-03 | Nginx assure la terminaison TLS et le filtrage CORS (ST_TAKT §5.5) |
| DEP-INF-04 | Le rate limiting est appliqué par Nginx (par IP et par utilisateur, ST_TAKT §5.5) |
| DEP-INF-05 | L'origine des requêtes CORS est restreinte au domaine interne (ST_TAKT §5.5) |

---

## 3. Pipeline de déploiement et rollback

### 3.1 Pipeline CI/CD

Le pipeline de déploiement suit les étapes définies dans PLAN_MACRO (E5.4, E1.6) :

| Étape | Outil | Commande | Condition de succès |
|-------|-------|----------|---------------------|
| Lint | ESLint | pnpm lint | Aucune erreur |
| Typecheck | TypeScript | pnpm typecheck | Aucune erreur de type |
| Build | Vite / NestJS | pnpm build | Build réussit |
| Tests unitaires | Vitest | pnpm test:unit | Tous les tests passent, coverage ≥ 80 % |
| Tests d'intégration | Vitest + DB de test | pnpm test:integration | Tous les tests passent |
| Tests E2E | Playwright | pnpm test:e2e | Tous les parcours critiques passent |
| Build Docker | Docker | docker-compose build | Image construite |
| Déploiement | Docker Compose | docker-compose up -d | Services opérationnels |

### 3.2 Stratégie de rollback

Conforme au risque P5 du PLAN_MACRO : environnement recette identique à prod, rollback préparé.

| Étape | Action | Commande |
|-------|--------|----------|
| 1 | Arrêter les nouveaux déploiements | gel des merges sur main |
| 2 | Revenir à l'image précédente | docker-compose pull <version-precedente> |
| 3 | Redémarrer les services | docker-compose up -d |
| 4 | Vérifier le healthcheck | curl -f https://takt.internal/health |
| 5 | Valider les données | aucune migration inversée nécessaire |

### 3.3 Seuils de blocage

Le déploiement est bloqué si :

- Un test unitaire ou d'intégration échoue
- La couverture des services critiques est < 100 %
- Un test E2E sur un parcours critique échoue
- Le lint ou le typecheck échoue
- Le rollback n'a pas été testé sur l'environnement de recette

---

## 4. Sauvegardes et restauration

### 4.1 Stratégie de sauvegarde

Conforme à PLAN_MACRO E5.3 : pgBackRest configuré, sauvegarde quotidienne, test de restauration trimestriel.

| Élément | Fréquence | Rétention | Outil |
|---------|-----------|-----------|-------|
| Sauvegarde complète | Quotidien (nuit) | 30 jours | pgBackRest |
| Sauvegarde différentielle | Hebdomadaire | 12 semaines | pgBackRest |
| Test de restauration | Trimestriel | — | Environnement recette |

### 4.2 Règles de sauvegarde

| Règle | Description |
|-------|-------------|
| DEP-SV-01 | Sauvegarde pgBackRest quotidienne (PLAN_MACRO E5.3) |
| DEP-SV-02 | Test de restauration trimestriel sur environnement recette (PLAN_MACRO E5.3) |
| DEP-SV-03 | Les fichiers de sauvegarde sont stockés hors du serveur de production |

---

## 5. Monitoring et supervision

### 5.1 Healthcheck

L'endpoint /health est exposé par le backend pour le monitoring de disponibilité.

| Composant | Outil | Métrique | Seuil d'alerte |
|-----------|-------|----------|----------------|
| API backend | Prometheus | Temps de réponse | > 500 ms (p95) |
| Base de données | Prometheus | Connexions actives | > 80 % du max |
| Disque | Prometheus | Espace utilisé | > 85 % |
| Mémoire | Prometheus | Utilisation RAM | > 90 % |

### 5.2 Logs et alertes

Les logs sont centralisés via un système de gestion de logs. Les alertes sont configurées pour :

- Indisponibilité du service (healthcheck échoué)
- Erreurs 5xx sur l'API
- Échec de sauvegarde pgBackRest

---

## 6. Sécurité réseau et conformité

### 6.1 Configuration Nginx

| Élément | Configuration | Référence |
|---------|---------------|-----------|
| TLS | Terminaison TLS, certificats Let's Encrypt | ST_TAKT §5.5 |
| CORS | Origines restreintes au domaine interne | ST_TAKT §5.5 |
| Rate limiting | Par IP et par utilisateur | ST_TAKT §5.5 |
| Headers de sécurité | X-Frame-Options, X-Content-Type-Options, CSP | ST_TAKT §5.5 |

### 6.2 Règles de sécurité réseau

| Règle | Description |
|-------|-------------|
| DEP-SEC-01 | TLS obligatoire sur tous les environnements de production |
| DEP-SEC-02 | CORS restreint aux origines du domaine interne (ST_TAKT §5.5) |
| DEP-SEC-03 | Rate limiting activé sur Nginx (par IP et par utilisateur) |
| DEP-SEC-04 | Aucun port exposé directement sur l'Internet, uniquement réseau interne |

---

## 7. Conclusion et critères de sortie

Ce document constitue le plan de déploiement E0.8. Le critère de sortie est atteint lorsque :

- Les trois environnements (dev, recette, prod) sont opérationnels
- La sauvegarde pgBackRest est configurée et testée
- La procédure de rollback est documentée et testée sur recette
- Le monitoring (healthcheck, alertes) est en place
- La sécurité réseau (TLS, CORS, rate limiting) est configurée

---

**Fin du plan de déploiement E0.8 — DEPLOIEMENT.md**
*Document validé par l'Architecte et le DSI avant passage en phase E1.*
