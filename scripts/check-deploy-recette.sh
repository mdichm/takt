#!/usr/bin/env bash
# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only
#
# Vérifie le contrat du déploiement de recette éphémère par Docker Compose.
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE"

COMPOSE="docker-compose.recette.yml"
WORKFLOW=".github/workflows/deploy-recette.yml"

[[ -f "$COMPOSE" ]] || { echo "Fichier $COMPOSE absent." >&2; exit 1; }
[[ -f "$WORKFLOW" ]] || { echo "Fichier $WORKFLOW absent." >&2; exit 1; }

if grep -Eq 'appleboy/ssh-action|RECETTE_HOST|RECETTE_USER|RECETTE_SSH_KEY' "$WORKFLOW"; then
  echo "Le workflow éphémère ne doit pas utiliser SSH." >&2
  exit 1
fi

grep -q 'docker compose -f docker-compose.recette.yml build' "$WORKFLOW"
grep -q 'docker compose -f docker-compose.recette.yml up -d --wait' "$WORKFLOW"
grep -q 'docker compose -f docker-compose.recette.yml down -v --remove-orphans' "$WORKFLOW"
grep -q 'http://localhost:3000/health' "$WORKFLOW"
grep -q 'http://localhost:8080/health' "$WORKFLOW"
grep -q "http://localhost:8080/accueil" "$WORKFLOW"
grep -q 'if: always()' "$WORKFLOW"

if grep -q 'api/v1/health' "$WORKFLOW"; then
  echo "Le smoke test ne doit pas utiliser la route inexistante /api/v1/health." >&2
  exit 1
fi

export POSTGRES_USER=takt
export POSTGRES_DB=takt_recette
export DATABASE_URL="postgresql://takt:test-password@postgres:5432/takt_recette"
export JWT_ACCESS_SECRET=test-access-secret
export JWT_REFRESH_SECRET=test-refresh-secret
export SMTP_PASSWORD=test-smtp-password

mkdir -p secrets
printf 'test-only-value\n' > secrets/postgres_password.txt
trap 'rm -f secrets/postgres_password.txt' EXIT

for service in postgres backend frontend; do
  docker compose -f "$COMPOSE" config --services | grep -qx "$service"
done

echo "Contrôle du déploiement de recette éphémère : OK"
