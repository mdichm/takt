# Spécification Gestion des Secrets — TAKT (SPEC_SECRETS.md)

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques
**Version :** 1.0
**Date :** 30 octobre 2026
**Responsable :** DevOps + Architecte
**Statut :** Validé — G4 résolu
**Documents liés :** DEPLOIEMENT.md (§2.1, §6), ST_TAKT.md (§5), PLAN_MACRO.md (§7), docker-compose.prod.yml

---

## 1. Objectif

Définir la stratégie de gestion des secrets pour l'application TAKT, conforme à la règle DEP-ENV-03 : **les secrets ne sont jamais stockés en clair dans le contrôle de version (Git)**.

---

## 2. Principes

| Principe | Description |
|----------|-------------|
| **Zéro secret en clair dans Git** | Aucun mot de passe, clé API, token, certificat privé dans le repo |
| **Injection par fichiers montés** | Docker Secrets (fichiers montés dans `/run/secrets/`) |
| **Chiffrement au repos** | Fichiers `.env.enc` chiffrés avec SOPS + age pour le versionnage des valeurs par défaut |
| **Rotation programmée** | Clés JWT, mots de passe DB, clés SMTP : rotation semestrielle |
| **Séparation par environnement** | Secrets distincts dev / recette / prod |

---

## 3. Liste des secrets requis

| Secret | Description | Environnement | Rotation | Génération |
|--------|-------------|---------------|----------|------------|
| `JWT_ACCESS_SECRET` | Clé signature JWT access token (15 min) | Tous | 6 mois | `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | Clé signature JWT refresh token (7 j) | Tous | 6 mois | `openssl rand -base64 64` |
| `DATABASE_URL` | URL connexion PostgreSQL (avec mot de passe) | Tous | 6 mois | — |
| `POSTGRES_PASSWORD` | Mot de passe utilisateur PostgreSQL | Tous | 6 mois | `openssl rand -base64 32` |
| `SMTP_PASSWORD` | Mot de passe SMTP institutionnel (`cck.rnu.tn`) | Recette/Prod | Selon politique SI | — |
| `PGBACKREST_S3_KEY` | Clé d'accès S3 (sauvegardes) | Prod | 12 mois | Fournisseur cloud |
| `PGBACKREST_S3_SECRET` | Clé secrète S3 | Prod | 12 mois | Fournisseur cloud |
| `GRAFANA_ADMIN_PASSWORD` | Mot de passe admin Grafana | Recette/Prod | 12 mois | `openssl rand -base64 24` |
| `ARGON2ID_COST` | Paramètres argon2id (memory, time, parallelism) | Tous | Jamais | `memory=19456,time=2,parallelism=1` |
---

## 4. Architecture de déploiement des secrets

### 4.1 Développement local

```bash
# Fichier .env.local (non versionné, dans .gitignore)
cp .env.example .env.local
# Éditer .env.local avec les vraies valeurs

# Les conteneurs montent .env.local via docker-compose.override.yml
```

### 4.2 Recette / Production

```
┌─────────────────────────────────────────────────────────────┐
│  Serveur de déploiement                                      │
│  /opt/takt/secrets/                                          │
│  ├── jwt_access_secret.txt          (644, root:root)        │
│  ├── jwt_refresh_secret.txt         (644, root:root)        │
│  ├── database_url.txt               (644, root:root)        │
│  ├── postgres_password.txt          (644, root:root)        │
│  ├── smtp_password.txt              (644, root:root)        │
│  ├── pgbackrest_s3_key.txt          (644, root:root)        │
│  ├── pgbackrest_s3_secret.txt       (644, root:root)        │
│  └── grafana_admin_password.txt     (644, root:root)        │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼ (montage Docker secrets)
┌─────────────────────────────────────────────────────────────┐
│  Conteneurs                                                  │
│  /run/secrets/jwt_access_secret  →  process.env.JWT_ACCESS_SECRET_FILE
│  /run/secrets/database_url       →  process.env.DATABASE_URL_FILE
│  ...                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Fichier .env.example (template)

```bash
# ============================================================================
# TAKT — Variables d'environnement (TEMPLATE)
# Copier vers .env.local pour le développement
# Ne JAMAIS commiter de vraies valeurs !
# ============================================================================

# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# Base de données
DATABASE_URL=postgresql://takt:CHANGE_ME@localhost:5432/takt
POSTGRES_PASSWORD=CHANGE_ME

# JWT (rotation 6 mois)
JWT_ACCESS_SECRET=CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_BASE64_64
JWT_REFRESH_SECRET=CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_BASE64_64
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Argon2id (hachage mots de passe)
ARGON2ID_MEMORY_COST=19456
ARGON2ID_TIME_COST=2
ARGON2ID_PARALLELISM=1

# SMTP (institutionnel cck.rnu.tn)
SMTP_HOST=cck.rnu.tn
SMTP_PORT=587
SMTP_USER=takt@etab.internal
SMTP_PASSWORD=CHANGE_ME
SMTP_FROM="TAKT <noreply@takt.internal>"
SMTP_TLS=true

# Solver CP-SAT
DERIVED_DIR=/data/derived
SCENARIOS_DIR=/data/scenarios
SOLVER_COMMAND=python3 -m takt.solver
WORKER_CONCURRENCY=2

# Monitoring
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000

# pgBackRest (production seulement)
PGBACKREST_REPO1_S3_BUCKET=takt-backups
PGBACKREST_REPO1_S3_REGION=fr-par
PGBACKREST_REPO1_S3_ENDPOINT=s3.fr-par.scw.cloud
PGBACKREST_S3_KEY=CHANGE_ME
PGBACKREST_S3_SECRET=CHANGE_ME

# Frontend
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3000
```
---

## 6. Procédure de chiffrement/déchiffrement (SOPS + age)

### 6.1 Installation

```bash
# SOPS
curl -LO https://github.com/getsops/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
sudo mv sops-v3.8.1.linux.amd64 /usr/local/bin/sops
sudo chmod +x /usr/local/bin/sops

# age (clé de chiffrement)
curl -LO https://github.com/FiloSottile/age/releases/download/v1.1.1/age-v1.1.1-linux-amd64.tar.gz
tar xzf age-v1.1.1-linux-amd64.tar.gz
sudo mv age/age /usr/local/bin/
sudo mv age/age-keygen /usr/local/bin/
```

### 6.2 Génération de la clé age

```bash
# À faire UNE SEULE FOIS, clé stockée dans gestionnaire de mots de passe institutionnel
age-keygen > /secure/path/takt-age-key.txt
# Résultat : AGE-SECRET-KEY-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 6.3 Chiffrement d'un fichier .env

```bash
# Créer le fichier .env.prod avec les vraies valeurs
cp .env.example .env.prod
# Éditer .env.prod

# Chiffrer
sops --encrypt --age AGE-SECRET-KEY-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  .env.prod > .env.prod.enc

# Le fichier .env.prod.enc PEUT être commité dans Git
# Le fichier .env.prod NE DOIT JAMAIS être commité
```

### 6.4 Déchiffrement au déploiement

```bash
# Dans le pipeline CI/CD ou sur le serveur
sops --decrypt --age $AGE_KEY_FILE .env.prod.enc > .env.prod

# Puis extraire les secrets individuels pour Docker
mkdir -p /opt/takt/secrets
grep JWT_ACCESS_SECRET .env.prod | cut -d= -f2- > /opt/takt/secrets/jwt_access_secret.txt
grep JWT_REFRESH_SECRET .env.prod | cut -d= -f2- > /opt/takt/secrets/jwt_refresh_secret.txt
grep DATABASE_URL .env.prod | cut -d= -f2- > /opt/takt/secrets/database_url.txt
# ... etc pour tous les secrets

# Nettoyer
shred .env.prod
```

---

## 7. Configuration Docker Compose (secrets)

```yaml
# Extrait de docker-compose.prod.yml
services:
  backend:
    secrets:
      - jwt_access_secret
      - jwt_refresh_secret
      - database_url
      - smtp_password
    environment:
      - JWT_ACCESS_SECRET_FILE=/run/secrets/jwt_access_secret
      - JWT_REFRESH_SECRET_FILE=/run/secrets/jwt_refresh_secret
      - DATABASE_URL_FILE=/run/secrets/database_url
      - SMTP_PASSWORD_FILE=/run/secrets/smtp_password

secrets:
  jwt_access_secret:
    file: ./secrets/jwt_access_secret.txt
  jwt_refresh_secret:
    file: ./secrets/jwt_refresh_secret.txt
  database_url:
    file: ./secrets/database_url.txt
  smtp_password:
    file: ./secrets/smtp_password.txt
  # ...
```

---

## 8. Code applicatif (lecture des secrets)

```typescript
// apps/backend/src/config/secrets.ts
import * as fs from 'fs';
import * as path from 'path';

export function readSecret(secretName: string): string {
  const filePath = process.env[`${secretName.toUpperCase()}_FILE`];
  if (!filePath) {
    // Fallback pour développement local (variable d'environnement directe)
    const envValue = process.env[secretName.toUpperCase()];
    if (!envValue) {
      throw new Error(`Secret ${secretName} non trouvé (ni fichier, ni variable d'env)`);
    }
    return envValue;
  }

  try {
    return fs.readFileSync(filePath, 'utf-8').trim();
  } catch (err) {
    throw new Error(`Impossible de lire le secret ${secretName} depuis ${filePath}: ${err.message}`);
  }
}

// Usage
export const config = {
  jwt: {
    accessSecret: readSecret('JWT_ACCESS_SECRET'),
    refreshSecret: readSecret('JWT_REFRESH_SECRET'),
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  },
  database: {
    url: readSecret('DATABASE_URL'),
  },
  smtp: {
    password: readSecret('SMTP_PASSWORD'),
  },
};
```

---

## 9. Procédure de rotation des secrets

| Secret | Fréquence | Procédure |
|--------|-----------|-----------|
| JWT_ACCESS_SECRET / JWT_REFRESH_SECRET | 6 mois | 1. Générer nouvelles clés<br>2. Mettre à jour dans vault + fichiers secrets<br>3. Redéployer backend (rolling update)<br>4. Les tokens existants expirent naturellement (15 min / 7 j) |
| POSTGRES_PASSWORD / DATABASE_URL | 6 mois | 1. Créer nouvel utilisateur DB<br>2. Migrer droits<br>3. Mettre à jour secrets<br>4. Redéployer tous les services<br>5. Supprimer ancien utilisateur |
| SMTP_PASSWORD | Selon politique SI | Coordonner avec équipe messagerie |
| PGBACKREST_S3_KEY/SECRET | 12 mois | Via console cloud provider |
| GRAFANA_ADMIN_PASSWORD | 12 mois | Interface Grafana + mise à jour secret |

---

## 10. Checklist de sécurité

- [ ] Aucun fichier `.env*` (sauf `.env.example`) dans `.gitignore`
- [ ] `secrets/` dans `.gitignore`
- [ ] Clé age stockée hors repo (gestionnaire mots de passe institutionnel)
- [ ] Fichiers secrets en 644, owned by root
- [ ] Rotation documentée et planifiée
- [ ] Audit trimestriel des secrets en production

---

## 11. Références

- DEPLOIEMENT.md §2.1 (Stack infrastructure), §6 (Sécurité réseau)
- SOPS Documentation : https://github.com/getsops/sops
- age Documentation : https://github.com/FiloSottile/age
- Docker Secrets : https://docs.docker.com/engine/swarm/secrets/
- PLAN_MACRO.md §7 (Risque P4 : Conflit licence AGPL)

---

*Fin du SPEC_SECRETS.md — TAKT v1.0*