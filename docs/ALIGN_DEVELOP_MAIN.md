# Alignement develop ↔ main (lot L04)

Ce fichier est un marqueur temporaire permettant de déclencher le CI gate sur la PR #46.

Contexte : après le squash-merge du lot L04 sur `main` (commit `1d11bb2`), `develop` conservait 33 commits d'historique alors que les deux branches avaient le même arbre de fichiers. Cette branche porte le contenu de `main` afin de réaligner `develop` via une PR classique (squash-merge, sans commit de merge, conformément à la protection de la branche `develop`).

Une fois la PR merger, ce fichier peut être supprimé dans une PR distincte si souhaité.