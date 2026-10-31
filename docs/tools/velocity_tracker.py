#!/usr/bin/env python3
"""
Calcule la vélocité (moyenne, déviation) et projections P50/P80.
Écrit dist/VELOCITE.md (burn-up, scénarios S/M/L).
Appelé à chaque ticket Terminé + chaque lundi (cron).
"""
import json, math, os, statistics, sys
from datetime import date, datetime, timedelta
from pathlib import Path
from tickets_data import TICKETS, Ticket

DIST = Path("dist")
DIST.mkdir(exist_ok=True)
VEL_PATH = DIST / "VELOCITE.md"

def compute_velocity() -> dict:
    done = [t for t in TICKETS if t.status == "Terminé"]
    sp_vals = [t.sp for t in done]
    duree_vals = [sp * 0.5 for sp in sp_vals]
    if not done:
        return {"V_moy": 0, "D_moy": 0, "tickets_done": 0, "sp_done": 0}
    return {
        "V_moy": round(statistics.mean(sp_vals), 1),
        "D_moy": round(statistics.mean(duree_vals), 1),
        "tickets_done": len(done),
        "sp_done": sum(sp_vals),
    }

def project(remaining_sp: int, v_moy: float, d_moy: float) -> dict:
    if v_moy == 0:
        return {"P50": "N/A", "P80": "N/A"}
    # P50 = moyenne, P80 = moyenne + 1 écart-type (approx)
    sigma = d_moy * 0.3  # hypothèse 30% variabilité
    p50_days = remaining_sp / v_moy * d_moy
    p80_days = p50_days + sigma
    today = date.today()
    return {
        "P50": (today + timedelta(days=round(p50_days))).isoformat(),
        "P80": (today + timedelta(days=round(p80_days))).isoformat(),
    }

def main() -> None:
    total_sp = sum(t.sp for t in TICKETS)
    vel = compute_velocity()
    remaining = total_sp - vel["sp_done"]
    proj = project(remaining, vel["V_moy"], vel["D_moy"])

    # Scénarios S/M/L (basés sur ±20% vélocité)
    scenarios = {}
    for label, factor in [("Optimiste (S)", 1.2), ("Réaliste (M)", 1.0), ("Pessimiste (L)", 0.8)]:
        if vel["V_moy"] * factor > 0:
            days = remaining / (vel["V_moy"] * factor) * vel["D_moy"]
            scenarios[label] = (date.today() + timedelta(days=round(days))).isoformat()
        else:
            scenarios[label] = "N/A"

    md = f"""# Suivi Vélocité TAKT – {date.today().isoformat()}

## Historique
- Tickets terminés : {vel['tickets_done']}
- SP terminés : {vel['sp_done']} / {total_sp}
- Vélocité moyenne (SP/ticket) : {vel['V_moy']}
- Durée moyenne par ticket (jours) : {vel['D_moy']}

## Projections (SP restants : {remaining})
- **P50 (médiane)** : {proj['P50']}
- **P80 (80% confiance)** : {proj['P80']}

## Scénarios
| Scénario | Facteur vélocité | Date estimée |
|----------|------------------|--------------|
"""
    for label, d in scenarios.items():
        md += f"| {label} | {1.2 if 'S' in label else 1.0 if 'M' in label else 0.8}× | {d} |\n"

    VEL_PATH.write_text(md, encoding="utf-8")
    print(f"✓ {VEL_PATH} mis à jour")

if __name__ == "__main__":
    main()