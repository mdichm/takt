# Gouvernance des règles Cline – Projet TAKT

## Principe
Les règles Cline (`.clinerules` + `.cline/rules/*.md`) sont **documentation vivante** du projet.
Toute modification suit un processus **PR doc‑only** avec **2 approbations** (Product Owner + Architecte).

## Processus de modification

1. **Créer une branche** `docs/rule-<sujet>` depuis `main`.
2. **Éditer** uniquement les fichiers `.md` concernés (pas de code).
3. **Commit** avec message `docs(rule): <description courte>`.
4. **Ouvrir une PR** en **draft** → `gh pr ready` quand prêt.
5. **Revue** : PO valide l'alignement métier, Architecte valide la cohérence technique.
6. **Merge** (merge commit, pas de rebase) → les règles sont actives immédiatement sur `main`.

## Règles immuables
- Aucun contournement (GG‑13, GG‑14).
- Toute nouvelle règle doit être **traçable** à une exigence du dossier conceptuel (EX-*, EC-*).
- Les garde‑fous globaux (GG‑01…GG‑17) ne peuvent être **assouplis** qu'avec accord explicite PO + Architecte + note de décision archivée.

## Versionnage
- Les règles ne sont **pas versionnées** séparément ; elles vivent dans le repo au même rythme que le code.
- Un tag `rules-YYYYMMDD` peut être posé pour référence historique.

## Application automatique
- Cline lit `.clinerules` au démarrage de chaque session et charge les fichiers listés dans `includes:`.
- Les `paths:` de chaque fichier limitent l'application aux zones concernées.
- En cas de conflit entre règles, la plus **restrictive** l'emporte (ex. GG‑04 `strict:true` prime sur toute tolérance `any`).

## Audit
- Job CI `doc-check` exécute `verifier_coherence.py` → valide que le backlog couvre toutes les exigences.
- Rapport `dist/TRACABILITE_TAKT.md` joint en artefact CI pour revue humaine.

---
*Document généré le 2026‑10‑31 – à maintenir à jour lors de chaque évolution des règles.*