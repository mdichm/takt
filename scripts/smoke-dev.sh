#!/usr/bin/env bash
# Copyright (C) 2026 TAKT
# SPDX-License-Identifier: AGPL-3.0-only
# Smoke test de la stack Docker de développement (TAKT-L01-06).
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE"

ENV_CI="${ENV_CI:-.env.local}"
cleanup() {
  docker compose --env-file "$ENV_CI" down -v --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

if [[ ! -f "$ENV_CI" ]]; then
  echo "Fichier $ENV_CI absent : créer un .env.local avant d'exécuter ce test." >&2
  exit 1
fi

if ! grep -q '^DATABASE_URL=' "$ENV_CI"; then
  echo "DATABASE_URL est requis dans $ENV_CI (service PostgreSQL interne)." >&2
  exit 1
fi

echo "Construction et démarrage de la stack de développement..."
docker compose --env-file "$ENV_CI" up -d --build --wait --wait-timeout 180

echo "Vérification du backend..."
curl --fail --silent --show-error http://localhost:3000/health

echo "Vérification du frontend sur une route profonde..."
curl --fail --silent --show-error http://localhost:8080/accueil | grep -q '<div id="root">'

echo "Stack Docker de développement : OK"
