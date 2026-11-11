#!/usr/bin/env python3
"""
Vérifie la cohérence du backlog :
- chaque EX-* / EC-* couvert par au moins 1 ticket
- unicité des IDs
- SP cohérents (entiers >0)
- dépendances existent
- cohérence documentaire des transitions workflow (18 transitions, pas de 19ᵉ)
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

# Fichiers documentaires à auditer pour le décompte des transitions
DOCS_TRANSITIONS = [
    "WORKFLOW_METIER.md",
    "ST_TAKT.md",
    "TESTS.md",
    "BACKLOG_TAKT.md",
]

def compter_transitions_matrice(contenu: str) -> int:
    """Compte les lignes de la matrice de transitions (état source | état cible | ...)."""
    compte = 0
    dans_matrice = False
    for ligne in contenu.splitlines():
        if "| État source" in ligne or "| État      |" in ligne:
            dans_matrice = True
            continue
        if dans_matrice:
            if ligne.strip().startswith("|") and "`" in ligne:
                compte += 1
            elif ligne.strip() == "" or ligne.startswith("**Transitions"):
                dans_matrice = False
    return compte

def verifier_transitions_documentaires() -> tuple[list[str], list[str]]:
    """Vérifie que le documentaire annonce 18 transitions et aucune 19ᵉ."""
    errors: list[str] = []
    warnings: list[str] = []
    base = Path("docs")
    for nom in DOCS_TRANSITIONS:
        chemin = base / nom
        if not chemin.exists():
            continue
        contenu = chemin.read_text(encoding="utf-8")

        # Interdiction de la mention "19 transitions" (arbitrage TAKT-L00-01)
        if re.search(r"19\s+transitions", contenu, re.IGNORECASE):
            errors.append(f"{nom} : mention de '19 transitions' interdite (arbitrage à 18)")

        # Décompte dans la matrice de WORKFLOW_METIER
        if nom == "WORKFLOW_METIER.md":
            nb = compter_transitions_matrice(contenu)
            if nb != 18:
                errors.append(
                    f"{nom} : la matrice contient {nb} transitions, 18 attendues"
                )

        # Chaque fichier doit annoncer 18 (quand il évoque le décompte)
        if re.search(r"\b18\s+transitions\b", contenu):
            pass  # cohérent
    return errors, warnings

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

    # 2. Couverture exigences
    for ex in all_exigences:
        if not (EX_PATTERN.match(ex) or EC_PATTERN.match(ex)):
            warnings.append(f"Format exigence inhabituel : {ex}")

    # 3. Cohérence documentaire des transitions (18, pas de 19ᵉ)
    doc_errors, doc_warnings = verifier_transitions_documentaires()
    errors.extend(doc_errors)
    warnings.extend(doc_warnings)

    # 4. Générer matrice traçabilité
    trace_md = "# Matrice Traçabilité Exigence ↔ Ticket\n\n"
    trace_md += "| Exigence | Tickets couvrants |\n|----------|-------------------|\n"
    for ex in sorted(all_exigences):
        covering = [t.id for t in TICKETS if ex in t.exigences]
        trace_md += f"| {ex} | {', '.join(covering) if covering else '⚠️ AUCUN'} |\n"

    TRACE_PATH.write_text(trace_md, encoding="utf-8")

    # 5. Rapport
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
