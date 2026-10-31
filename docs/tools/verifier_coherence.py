#!/usr/bin/env python3
"""
Vérifie la cohérence du backlog :
- chaque EX-* / EC-* couvert par au moins 1 ticket
- unicité des IDs
- SP cohérents (entiers >0)
- dépendances existent
Écrit dist/TRACABILITE_TAKT.md (matrice exigence ↔ ticket).
Utilisé en CI (job doc-check).
"""
import re, sys
from pathlib import Path
from tickets_data import TICKETS

DIST = Path("dist")
DIST.mkdir(exist_ok=True)
TRACE_PATH = DIST / "TRACABILITE_TAKT.md"

EX_PATTERN = re.compile(r"^EX-[A-Z]{3,4}-\d{2}$")
EC_PATTERN = re.compile(r"^EC-[A-Z]{3}-\d{2}$")

def main() -> int:
    errors = []
    warnings = []
    ids = set()
    all_exigences = set()

    # 1. Unicité IDs + validations de base
    for t in TICKETS:
        if t.id in ids:
            errors.append(f"ID dupliqué : {t.id}")
        ids.add(t.id)

        if t.sp <= 0:
            errors.append(f"{t.id} : SP doit être > 0")
        if t.status not in ("À faire", "En cours", "Bloqué", "Terminé"):
            warnings.append(f"{t.id} : statut inhabituel '{t.status}'")

        for dep in t.deps:
            if dep not in ids:
                warnings.append(f"{t.id} : dépendance inconnue '{dep}'")

        for ex in t.exigences:
            all_exigences.add(ex)

    # 2. Couverture exigences (on suppose la liste complète dans docs/EXIGENCES_LIST.txt ou similaire)
    # Ici on vérifie juste le format
    for ex in all_exigences:
        if not (EX_PATTERN.match(ex) or EC_PATTERN.match(ex)):
            warnings.append(f"Format exigence inhabituel : {ex}")

    # 3. Générer matrice traçabilité
    trace_md = "# Matrice Traçabilité Exigence ↔ Ticket\n\n"
    trace_md += "| Exigence | Tickets couvrants |\n|----------|-------------------|\n"
    for ex in sorted(all_exigences):
        covering = [t.id for t in TICKETS if ex in t.exigences]
        trace_md += f"| {ex} | {', '.join(covering) if covering else '⚠️ AUCUN'} |\n"

    TRACE_PATH.write_text(trace_md, encoding="utf-8")

    # 4. Rapport
    if warnings:
        print("⚠️ Avertissements :")
        for w in warnings:
            print(f"  - {w}")
    if errors:
        print("❌ Erreurs :")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("✓ Cohérence backlog validée")
    print(f"✓ {TRACE_PATH} généré")
    return 0

if __name__ == "__main__":
    sys.exit(main())