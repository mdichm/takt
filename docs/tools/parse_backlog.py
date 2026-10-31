#!/usr/bin/env python3
"""
Parse BACKLOG_TAKT.md and generate tickets_data.py with the full list of 89 tickets.
Run from repo root: python3 docs/tools/parse_backlog.py
"""
import re
import sys
from pathlib import Path
from dataclasses import dataclass
from typing import List

@dataclass
class Ticket:
    id: str
    lot: str
    titre: str
    sp: int
    status: str
    deps: List[str]
    exigences: List[str]

def parse_backlog(md_text: str) -> List[Ticket]:
    # Find all ticket headings
    ticket_pattern = re.compile(r'####\s+(TAKT-L\d{2}-\d{2})\s*—\s*([^\n]+)')
    matches = list(ticket_pattern.finditer(md_text))
    tickets = []
    for i, m in enumerate(matches):
        ticket_id = m.group(1)
        titre = m.group(2).strip()
        lot = ticket_id.split('-')[1]  # Lxx
        start = m.end()
        end = matches[i+1].start() if i+1 < len(matches) else len(md_text)
        block = md_text[start:end]

        # SP - flexible patterns
        sp_match = re.search(r'\*\*SP\*\*[^:\d]*[:]?\s*(\d+)', block)
        if not sp_match:
            sp_match = re.search(r'\*\*SP :\*\*\s*(\d+)', block)
        sp = int(sp_match.group(1)) if sp_match else 0

        # Dépend de - flexible
        deps = []
        dep_match = re.search(r'\*\*Dépend de\*\*[^:\d]*[:]?\s*([^·\n]+)', block)
        if not dep_match:
            dep_match = re.search(r'\*\*Dépend de :\*\*\s*([^·\n]+)', block)
        if dep_match:
            dep_raw = dep_match.group(1)
            deps = [d.strip().strip('`') for d in dep_raw.split(',') if d.strip() and d.strip() != '—']

        # Exigences - flexible
        exigences = []
        ex_match = re.search(r'\*\*Exigences\*\*[^:\d]*[:]?\s*([^\n]+)', block)
        if not ex_match:
            ex_match = re.search(r'\*\*Exigences :\*\*\s*([^\n]+)', block)
        if ex_match:
            ex_raw = ex_match.group(1)
            ex_raw = ex_raw.replace('`', '')
            parts = [p.strip() for p in ex_raw.split(',')]
            for p in parts:
                if p:
                    exigences.append(p)

        status = "À faire"
        tickets.append(Ticket(ticket_id, lot, titre, sp, status, deps, exigences))
    return tickets

def generate_tickets_py(tickets: List[Ticket], out_path: Path):
    lines = []
    lines.append('#!/usr/bin/env python3')
    lines.append('"""')
    lines.append('Source de vérité unique du backlog TAKT.')
    lines.append('Contient la liste complète des 89 tickets avec leurs métadonnées.')
    lines.append('Ne pas éditer les fichiers générés dans dist/ – modifier uniquement ce fichier.')
    lines.append('"""')
    lines.append('from dataclasses import dataclass, asdict')
    lines.append('from typing import List')
    lines.append('import json')
    lines.append('')
    lines.append('@dataclass')
    lines.append('class Ticket:')
    lines.append('    id: str')
    lines.append('    lot: str')
    lines.append('    titre: str')
    lines.append('    sp: int')
    lines.append('    status: str')
    lines.append('    deps: List[str]')
    lines.append('    exigences: List[str]')
    lines.append('')
    lines.append('TICKETS: List[Ticket] = [')
    for t in tickets:
        safe_titre = t.titre.replace('\\', '\\\\').replace('"', '\\"')
        lines.append(f'    Ticket(')
        lines.append(f'        id="{t.id}",')
        lines.append(f'        lot="{t.lot}",')
        lines.append(f'        titre="{safe_titre}",')
        lines.append(f'        sp={t.sp},')
        lines.append(f'        status="{t.status}",')
        lines.append(f'        deps={t.deps},')
        lines.append(f'        exigences={t.exigences},')
        lines.append(f'    ),')
    lines.append(']')
    lines.append('')
    lines.append('def tickets_to_dicts() -> List[dict]:')
    lines.append('    return [t.__dict__ for t in TICKETS]')
    lines.append('')
    lines.append('def write_json(path: str) -> None:')
    lines.append('    with open(path, "w", encoding="utf-8") as f:')
    lines.append('        json.dump(tickets_to_dicts(), f, ensure_ascii=False, indent=2)')
    lines.append('')
    lines.append('if __name__ == "__main__":')
    lines.append('    import os')
    lines.append('    os.makedirs("dist/tools", exist_ok=True)')
    lines.append('    write_json("dist/tools/correspondance_tickets.json")')
    lines.append('    print("✓ correspondance_tickets.json généré")')
    out_path.write_text('\n'.join(lines), encoding='utf-8')
    print(f'Generated {out_path} with {len(tickets)} tickets')

def main():
    md_path = Path('docs/BACKLOG_TAKT.md')
    if not md_path.exists():
        print('BACKLOG_TAKT.md not found')
        sys.exit(1)
    md_text = md_path.read_text(encoding='utf-8')
    tickets = parse_backlog(md_text)
    print(f'Parsed {len(tickets)} tickets')
    for t in tickets[:5]:
        print(t.id, t.titre, t.sp, t.deps, t.exigences[:3])
    out_path = Path('docs/tools/tickets_data.py')
    generate_tickets_py(tickets, out_path)

if __name__ == '__main__':
    main()