---
paths:
  - "docs/tools/**"
  - "docs/BACKLOG_TAKT.md"
  - "docs/SUIVI_VELOCITE_TAKT.md"
  - "docs/PROMPTS_CLINE_TAKT.md"
---
# Backlog & Vélocité – source de vérité unique & génération automatisée

## Source de vérité
- `docs/tools/tickets_data.py` : liste **unique** des 89 tickets avec champs  
  `id, lot, titre, sp, status (À faire|En cours|Bloqué|Terminé), deps, exigences[]`

## Scripts fournis (à créer dans `docs/tools/`)
| Script | Rôle | Déclencheur |
|--------|------|-------------|
| `build_backlog.py` | Génère `dist/Backlog_TAKT_tickets.csv`, `dist/Backlog_TAKT.xlsx`, `dist/tools/correspondance_tickets.json` | Claim (En cours) + Ready (Terminé) |
| `velocity_tracker.py` | Calcule `V_moy`, `D_moy`, projections P50/P80, écrit `dist/VELOCITE.md` | Chaque lundi + à chaque ticket Terminé |
| `verifier_coherence.py` | Vérifie traçabilité (chaque `EX-*`/`EC-*` couvert ≥ 1 ticket), unicité des IDs, SP cohérents | CI (job `doc-check`) |

## Rituel d'exécution (flux continu)
1. **Claim** → `En cours` → `build_backlog.py` (artefacts `dist/`) → commit `docs: mark TAKT-Lxx-nn En cours` → push draft PR.  
2. **Développement** → tests → `Terminé` → `build_backlog.py` + `velocity_tracker.py` → commit `feat: …` → push → `gh pr ready`.  
3. **Merge** → CI verte → artefacts `dist/` mis à jour sur `main` (non versionnés, `.gitignore`).  

## Tableaux de pilotage (lisibles par l'humain)
- `dist/VELOCITE.md` → burn‑up, projection P50/P80, 3 scénarios (S/M/L) – formules identiques à `SUIVI_VELOCITE_TAKT.md §3`.  
- `dist/TRACABILITE_TAKT.md` → matrice exigence ↔ ticket (vérifiée par `verifier_coherence.py`).  

## Règles immuables
- **Jamais** d'édition manuelle des fichiers `dist/**` (générés).  
- Conflit sur `tickets_data.py` → conserver **tous** les statuts, puis régénérer.  
- Les artefacts `dist/` sont **ignorés par Git** (`.gitignore`).