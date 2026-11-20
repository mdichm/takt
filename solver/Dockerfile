# syntax=docker/dockerfile:1
# Image du worker CP-SAT : python:3.11-slim + OR-Tools CP-SAT.
# Aucune variable DATABASE_URL ni aucun accès réseau métier (GG-10, GG-16).
# Build : docker build -f solver/Dockerfile -t takt/solver-worker .  (depuis la racine du repo)

FROM python:3.11-slim AS base

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Dépendance runtime unique (imposée par SPEC_SOLVER_CPSAT §7 et le garde-fou solver-worker).
COPY solver/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Code applicatif (hors tests, exclus par .dockerignore).
COPY solver/ ./solver/

# Utilisateur non-root ; pas de secret en dur (GG-11).
RUN useradd --create-home --shell /bin/bash solver
USER solver

ENTRYPOINT ["python", "-m", "solver.cp_sat_model"]
CMD ["--help"]
