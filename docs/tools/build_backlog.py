#!/usr/bin/env python3
"""
Génère les artefacts backlog (CSV, XLSX, JSON correspondance) depuis tickets_data.py.
Appelé deux fois par ticket : au claim (En cours) et au ready (Terminé).
"""
import csv, json, os, sys
from pathlib import Path
from tickets_data import tickets_to_dicts

try:
    import openpyxl
except ImportError:
    openpyxl = None

DIST = Path("dist")
DIST.mkdir(exist_ok=True)
(DIST / "tools").mkdir(exist_ok=True)

CSV_PATH = DIST / "Backlog_TAKT_tickets.csv"
XLSX_PATH = DIST / "Backlog_TAKT.xlsx"
JSON_PATH = DIST / "tools" / "correspondance_tickets.json"

def _flatten(row: dict) -> dict:
    """Convertit les listes en chaînes CSV pour export tabulaire."""
    out = {}
    for k, v in row.items():
        if isinstance(v, list):
            out[k] = ", ".join(v)
        else:
            out[k] = v
    return out

def main() -> None:
    raw_rows = tickets_to_dicts()
    rows = [_flatten(r) for r in raw_rows]

    # CSV
    with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    # JSON correspondance (id -> index)
    corr = {r["id"]: i for i, r in enumerate(raw_rows)}
    JSON_PATH.write_text(json.dumps(corr, ensure_ascii=False, indent=2))

    # XLSX (optionnel)
    if openpyxl:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Backlog"
        ws.append(list(rows[0].keys()))
        for r in rows:
            ws.append(list(r.values()))
        wb.save(XLSX_PATH)

    print(f"✓ Artefacts générés : {CSV_PATH}, {JSON_PATH}" + (f", {XLSX_PATH}" if openpyxl else ""))

if __name__ == "__main__":
    main()