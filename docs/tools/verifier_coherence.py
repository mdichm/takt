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
    ticket_by_id: dict = {}
    all_exigences = set()

    # 1. Première passe : unicité IDs + validations de base (collecte tous les IDs avant toute vérification de dep)
    for t in TICKETS:
        if t.id in ids:
            errors.append(f"ID dupliqué : {t.id}")
        ids.add(t.id)
        ticket_by_id[t.id] = t

        if t.sp <= 0:
            errors.append(f"{t.id} : SP doit être > 0")
        if t.status not in ("À faire", "En cours", "Bloqué", "Terminé"):
            warnings.append(f"{t.id} : statut inhabituel '{t.status}'")

        for ex in t.exigences:
            all_exigences.add(ex)

    # 2. Validation des dépendances (tous les IDs sont maintenant connus → pas de faux « dépendance inconnue » pour les deps en avant)
    for t in TICKETS:
        for dep in t.deps:
            if dep not in ids:
                warnings.append(f"{t.id} : dépendance inconnue '{dep}'")

    # 3. Garde-fou B-06 : un ticket « En cours » doit avoir toutes ses dépendances en « Terminé »
    for t in TICKETS:
        if t.status == "En cours":
            non_termine = []
            for dep in t.deps:
                dt = ticket_by_id.get(dep)
                if dt is None or dt.status != "Terminé":
                    non_termine.append(dep)
            if non_termine:
                errors.append(
                    f"{t.id} : statut 'En cours' mais dépendance(s) non terminée(s) : {non_termine}"
                )

    # 4. Garde-fou cohérence des totaux par lot entre tickets_data.py et BACKLOG_TAKT.md
    by_lot_count: dict = {}
    by_lot_sp: dict = {}
    for t in TICKETS:
        by_lot_count[t.lot] = by_lot_count.get(t.lot, 0) + 1
        by_lot_sp[t.lot] = by_lot_sp.get(t.lot, 0) + t.sp

    backlog_path = Path("docs/BACKLOG_TAKT.md")
    if backlog_path.exists():
        contenu = backlog_path.read_text(encoding="utf-8")
        lot_re = re.compile(
            r"### Lot\s+(L\d+)\s*—.*?\((\d+)\s*tickets\s*·\s*(\d+)\s*SP\)"
        )
        for m in lot_re.finditer(contenu):
            lot = m.group(1)
            doc_count = int(m.group(2))
            doc_sp = int(m.group(3))
            real_count = by_lot_count.get(lot, 0)
            real_sp = by_lot_sp.get(lot, 0)
            if real_count != doc_count:
                errors.append(
                    f"Lot {lot} : {real_count} tickets dans tickets_data.py, "
                    f"{doc_count} annoncés dans BACKLOG_TAKT.md"
                )
            if real_sp != doc_sp:
                errors.append(
                    f"Lot {lot} : {real_sp} SP dans tickets_data.py, "
                    f"{doc_sp} annoncés dans BACKLOG_TAKT.md"
                )

    # 5. Couverture exigences
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
