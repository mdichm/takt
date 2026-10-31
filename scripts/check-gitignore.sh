#!/usr/bin/env bash
# Vérifie que .gitignore couvre les 5 cas requis par le DoD de TAKT-L01-01
set -euo pipefail

CASES=(.env node_modules dist coverage .turbo)
FAILED=0

echo "🔍 Vérification du .gitignore..."

for pattern in "${CASES[@]}"; do
    if git check-ignore -q "$pattern" 2>/dev/null; then
        echo "  ✅ $pattern ignoré"
    else
        echo "  ❌ $pattern NON ignoré"
        FAILED=1
    fi
done

if [ "$FAILED" -eq 1 ]; then
    echo ""
    echo "💥 Échec : certains patterns ne sont pas ignorés."
    exit 1
else
    echo ""
    echo "✅ Tous les patterns .gitignore sont couverts."
    exit 0
fi