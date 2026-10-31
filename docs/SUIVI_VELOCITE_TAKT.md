# SUIVI DE VÉLOCITÉ & ESTIMATION DE FIN DE PROJET — TAKT

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques
**Version :** 1.0 — Date : 30 octobre 2026
**Modèle :** Flux continu (Kanban) — **sans sprints**
**Documents liés :** `docs/BACKLOG_TAKT.md`, `PLAN_MACRO.md`, `docs/TESTS.md`

---

## §1. Objetif et principes

### 1.1 Objetif

Ce document est l'instrument de pilotage du projet TAKT. Il répond à trois questions, et seulement trois :

1. **Avançons-nous au rythme prévu ?** → vélocité, débit, burn-up.
2. **Quand livrons-nous ?** → projection de date de fin P50 / P80.
3. **Avons-nous dévié ?** → analyse d'écart et actions correctives.

### 1.2 Pourquoi le flux continu plutôt que les sprints

| Critère | Sprint de 2 semaines (`PLAN_MACRO`) | Flux continu retenu | Décision |
|---------|------------------------------------|---------------------|----------|
| Granularité de livraison | Binaire : fin de sprint | Continue : journalière | Le `PLAN_MACRO` raisonne en jalons de 2 semaines pour la gouvernance MOA ; l'exécution technique gagne à livrer en continu pour ne pas accumuler un lot d'intégration à J14. |
| Mesure de la performance | Points par sprint | SP/semaine glissante + débit | Un sprint fige la mesure et masque les pics ; la moyenne glissante sur 4 semaines absorbe le bruit. |
| Adaptation du périmètre | Gelée en début de sprint | Backlog priorisé en continu | Le `BACKLOG_TAKT.md` compte 89 tickets ; le gel par sprint serait artificiel. |
| Reporting MOA | Binaire | Continu + jalons | Les jalons J10/J14/J28/J42/J56/J70 du `PLAN_MACRO` restent la contractualisation externe. |

**Ce qui ne change pas :** les jalons contractuels du `PLAN_MACRO §4` restent opposables à la MOA. Le flux continu est un mode d'exécution interne, pas une renegociation du calendrier contractuel.

### 1.3 Règles cardinales

- **R-01** — Un ticket passe à « Terminé » uniquement après preuve de tests verts et DoD satisfaite. Aucun « ça marche en local ».
- **R-02** — La vélocité se mesure sur ce qui est **terminé**, jamais sur ce qui est **commencé**.
- **R-03** — Aucun ticket n'est估 estimé à la baisse pour « faire entrer dans le sprint ». La sous-estimation détruit la fiabilité de la projection.
- **R-04** — Le WIP (travaux en cours) est plafonné : sans cela, le flux continu dérive en travail parallèle non fini, qui gonfle la variance.
- **R-05** — Toute estimation de date de fin porte **deux horizons** (P50 et P80). Communiquer une date unique est une faute managériale.

---

## §2. Unités de mesure

### 2.1 Story Points

- Échelle : **1, 2, 3, 5, 8, 13, 21**.
- 1 SP ≈ une demi-journée de conception + implémentation + test sur un ticket de faible risque.
- 13 SP = ticket complexe (grille EDT drag&drop) ; au-delà, le ticket doit être découpé.
- Les SP sont fixés **à la création du ticket** (voir `BACKLOG_TAKT.md §1.3`) et ne sont modifiés qu'en comité de backlog, avec justification écrite.

### 2.2 Débit (throughput)

Nombre de tickets terminés par semaine. Complément indispensable des SP en flux continu : le débit est **insensible à la dérive d'estimation**, alors que les SP y sont sensibles. Une divergence entre les deux projections est un signal d'alerte fort.

### 2.3 Work In Progress (WIP)

| Lots | WIP max | Justification |
|------|---------|---------------|
| L00–L03 (socle) | 2 | Fort couplage ; le parallélisme y est faible |
| L04–L07 (métier) | 4 | Lot structuré, tâches découpables |
| L08–L10 (frontend, exports) | 5 | Parallelisme élevé, faible couplage |
| L11 (recette) | 3 | Phase de stabilisation, WIP réduit |

**Règle** : un agent ne démarre un nouveau ticket que si `WIP en cours < WIP max du lot`. Le dépassement est traité comme un incident de flux (cf. §7.3).

---

## §3. Formules de calcul

Toutes les formules sont exprimées sur une base **semaine calendaire** (S1 = première semaine d'exécution).

### 3.1 Vélocité lissée

```
V_moy(S) = 0,50 × V(S-1) + 0,20 × V(S-2) + 0,20 × V(S-3) + 0,10 × V(S-4)
```

où `V(S)` = SP terminés en semaine S. Les coefficients décroissants donnent un poids dominant à la semaine la plus récente tout en lissant le bruit des semaines_anomalie (congés, incidents).

Avant 4 semaines d'historique : `V_moy = moyenne simple des semaines disponibles`.

### 3.2 Débit lissé

```
D_moy(S) = (Σ tickets terminés sur S-3..S) / 4
```

### 3.3 Reste à faire

```
SP_restants(S) = SP_total_backlog − SP_livrés(S) − SP_en_cours(S)
SP_en_cours(S)  = Σ SP des tickets engagés (≠ terminés)
```

### 3.4 Projection de date de fin

```
Date_fin_P50_bySP(S)    = S + (SP_restants(S) / V_moy(S)) semaines
Date_fin_P80_bySP(S)    = S + (SP_restants(S) / (V_moy(S) × 0,75)) semaines
Date_fin_P50_byDébit(S) = S + (Tickets_restants(S) / D_moy(S)) semaines
Date_fin_P80_byDébit(S) = S + (Tickets_restants(S) / (D_moy(S) × 0,75)) semaines

Date_fin_retenue(S) = max( P50_bySP , P50_byDébit , P80_bySP )
```

**Justification du facteur 0,75** : la décote de 25 % sur l'horizon P80 encode l'aléa technique (performance du solver, surprises de format PDF), l'absence et le rework. Ce n'est pas une marge de sécurité décorative : elle est confrontée au réalisé après 4 semaines puis recalée.

**Règle de prudence** : la date retenue est la **plus conservatrice** des projections disponibles. Le principe est explicite — annoncer une date trop tardive coûte de la crédibilité de pilotage ; annoncer une date trop tôt coûte des engagements non tenus auprès de la MOA.

### 3.5 Taux d'avancement

```
Avancement_SP(S)    = (SP_livrés(S) / 492) × 100 %
Avancement_tickets(S)= (Tickets terminés(S) / 89) × 100 %
Couverture_forecast  = SP_livrés(S) / (SP_total × (S / S_proj))   //Detection du retard
```

`Couverture_forecast` < 1 signifie que le projet est **en retard** par rapport à la projection.

<!-- ANCRE -->

## §4. 3 scénarios de calibrage (sans hypothèse figée)

Le tableau ci‑dessous donne des bornes de vélocité et de débit pour trois profils d'équipe. Les formules de projection (§3) restent identiques ; seul le couple (V_moy, D_moy) change.

| Paramètre | Scénario **S** — Équipe réduite (1 dev + Cline) | Scénario **M** — Équipe standard (2 devs + Cline) | Scénario **L** — Équipe élargie (4+ devs, 2 lots //) |
|-----------|-----------------------------------------------|--------------------------------------------------|---------------------------------------------------|
| Composition | 1 fullstack | 1 fullstack + 1 frontend | 2 fullstack + 1 frontend + 1 DevOps |
| Vélocité SP/sem (hypothèse départ) | 12 – 15 | 25 – 30 | 55 – 60 |
| Débit tickets/sem | 4 – 6 | 8 – 11 | 16 – 20 |
| WIP max global | 2 | 4 | 7 |
| Charge backlog (504 SP, 89 tickets) | 504 SP / 89 tickets | 504 SP / 89 tickets | 504 SP / 89 tickets |
| **Date fin P50** (à partir de S0 = sem 1) | **≈ 34 – 42 sem** (≈ fin juin – août 2027) | **≈ 17 – 20 sem** (≈ mars – avril 2027) | **≈ 9 – 10 sem** (≈ janvier 2027) |
| **Date fin P80** (facteur 0,75) | **≈ 45 – 56 sem** (≈ oct 2027 – jan 2028) | **≈ 23 – 27 sem** (≈ juil – oct 2027) | **≈ 12 – 13 sem** (≈ mars 2027) |
| **Date retenue (max conservateur)** | **≈ 56 sem** (jan 2028) | **≈ 27 sem** (oct 2027) | **≈ 13 sem** (mars 2027) |

> **Lecture** : les dates sont des *bornes* basées sur les hypothèses de vélocité initiale. Après 4 semaines réelles, `V_moy` et `D_moy` sont mesurés et les projections sont recalculées automatiquement (voir §5).

## §5. Tableau de suivi hebdomadaire (vierge — à remplir chaque lundi)

| Semaine (S) | Date lundi | SP terminés (Σ) | SP cumulés | Tickets terminés | Tickets cumulés | V_moy (formule §3.1) | D_moy (formule §3.2) | SP restants | Tickets restants | Date fin P50 (SP) | Date fin P50 (Débit) | Date fin P80 (SP) | **Date retenue** | Écarts / Actions |
|-------------|------------|----------------|-----------|------------------|----------------|----------------------|----------------------|------------|------------------|-------------------|----------------------|-------------------|------------------|------------------|
| 1 | 2026‑11‑02 |   |   |   |   |   |   | 504 | 89 |   |   |   |   |   |
| 2 | 2026‑11‑09 |   |   |   |   |   |   |   |   |   |   |   |   |   |
| 3 | 2026‑11‑16 |   |   |   |   |   |   |   |   |   |   |   |   |   |
| 4 | 2026‑11‑23 |   |   |   |   |   |   |   |   |   |   |   |   |   |
| 5 | 2026‑11‑30 |   |   |   |   |   |   |   |   |   |   |   |   |   |
| … | … |   |   |   |   |   |   |   |   |   |   |   |   |   |

> **Règle de remplissage** : seules les colonnes « SP terminés » et « Tickets terminés » sont saisies manuellement (issues du `BACKLOG_TAKT.md` et du `SUIVI_VELOCITE_TAKT.md §6`). Toutes les autres colonnes sont des formules (copier‑coller la ligne précédente et étendre).

## §6. Tableau de suivi par ticket (état, SP, dates réelles)

| Ticket | Lot | SP | État | Date début réel | Date fin réel | SP gagnés | Commentaire |
|--------|-----|----|------|-----------------|--------------|----------|-------------|
| TAKT-L00-01 | L00 | 3 | À faire |   |   |   |   |
| TAKT-L00-02 | L00 | 2 | À faire |   |   |   |   |
| TAKT-L00-03 | L00 | 3 | À faire |   |   |   |   |
| TAKT-L00-04 | L00 | 3 | À faire |   |   |   |   |
| TAKT-L00-05 | L00 | 2 | À faire |   |   |   |   |
| TAKT-L01-01 | L01 | 2 | À faire |   |   |   |   |
| TAKT-L01-02 | L01 | 5 | À faire |   |   |   |   |
| TAKT-L01-03 | L01 | 3 | À faire |   |   |   |   |
| TAKT-L01-04 | L01 | 5 | À faire |   |   |   |   |
| TAKT-L01-05 | L01 | 3 | À faire |   |   |   |   |
| TAKT-L01-06 | L01 | 3 | À faire |   |   |   |   |
| TAKT-L01-07 | L01 | 3 | À faire |   |   |   |   |
| TAKT-L02-01 | L02 | 5 | À faire |   |   |   |   |
| TAKT-L02-02 | L02 | 5 | À faire |   |   |   |   |
| TAKT-L02-03 | L02 | 5 | À faire |   |   |   |   |
| TAKT-L02-04 | L02 | 4 | À faire |   |   |   |   |
| TAKT-L02-05 | L02 | 4 | À faire |   |   |   |   |
| TAKT-L02-06 | L02 | 4 | À faire |   |   |   |   |
| TAKT-L03-01 | L03 | 5 | À faire |   |   |   |   |
| TAKT-L03-02 | L03 | 5 | À faire |   |   |   |   |
| TAKT-L03-03 | L03 | 5 | À faire |   |   |   |   |
| TAKT-L03-04 | L03 | 5 | À faire |   |   |   |   |
| TAKT-L03-05 | L03 | 5 | À faire |   |   |   |   |
| TAKT-L03-06 | L03 | 5 | À faire |   |   |   |   |
| TAKT-L03-07 | L03 | 4 | À faire |   |   |   |   |
| TAKT-L04-01 | L04 | 5 | À faire |   |   |   |   |
| TAKT-L04-02 | L04 | 6 | À faire |   |   |   |   |
| TAKT-L04-03 | L04 | 5 | À faire |   |   |   |   |
| TAKT-L04-04 | L04 | 6 | À faire |   |   |   |   |
| TAKT-L04-05 | L04 | 5 | À faire |   |   |   |   |
| TAKT-L04-06 | L04 | 8 | À faire |   |   |   |   |
| TAKT-L04-07 | L04 | 5 | À faire |   |   |   |   |
| TAKT-L04-08 | L04 | 4 | À faire |   |   |   |   |
| TAKT-L05-01 | L05 | 5 | À faire |   |   |   |   |
| TAKT-L05-02 | L05 | 6 | À faire |   |   |   |   |
| TAKT-L05-03 | L05 | 8 | À faire |   |   |   |   |
| TAKT-L05-04 | L05 | 5 | À faire |   |   |   |   |
| TAKT-L05-05 | L05 | 5 | À faire |   |   |   |   |
| TAKT-L05-06 | L05 | 8 | À faire |   |   |   |   |
| TAKT-L06-01 | L06 | 8 | À faire |   |   |   |   |
| TAKT-L06-02 | L06 | 8 | À faire |   |   |   |   |
| TAKT-L06-03 | L06 | 5 | À faire |   |   |   |   |
| TAKT-L06-04 | L06 | 5 | À faire |   |   |   |   |
| TAKT-L06-05 | L06 | 8 | À faire |   |   |   |   |
| TAKT-L06-06 | L06 | 6 | À faire |   |   |   |   |
| TAKT-L06-07 | L06 | 6 | À faire |   |   |   |   |
| TAKT-L06-08 | L06 | 6 | À faire |   |   |   |   |
| TAKT-L06-09 | L06 | 5 | À faire |   |   |   |   |
| TAKT-L06-10 | L06 | 6 | À faire |   |   |   |   |
| TAKT-L07-01 | L07 | 8 | À faire |   |   |   |   |
| TAKT-L07-02 | L07 | 6 | À faire |   |   |   |   |
| TAKT-L07-03 | L07 | 8 | À faire |   |   |   |   |
| TAKT-L07-04 | L07 | 8 | À faire |   |   |   |   |
| TAKT-L07-05 | L07 | 5 | À faire |   |   |   |   |
| TAKT-L07-06 | L07 | 5 | À faire |   |   |   |   |
| TAKT-L07-07 | L07 | 7 | À faire |   |   |   |   |
| TAKT-L08-01 | L08 | 8 | À faire |   |   |   |   |
| TAKT-L08-02 | L08 | 5 | À faire |   |   |   |   |
| TAKT-L08-03 | L08 | 5 | À faire |   |   |   |   |
| TAKT-L08-04 | L08 | 6 | À faire |   |   |   |   |
| TAKT-L08-05 | L08 | 8 | À faire |   |   |   |   |
| TAKT-L08-06 | L08 | 3 | À faire |   |   |   |   |
| TAKT-L08-07 | L08 | 3 | À faire |   |   |   |   |
| TAKT-L09-01 | L09 | 5 | À faire |   |   |   |   |
| TAKT-L09-02 | L09 | 8 | À faire |   |   |   |   |
| TAKT-L09-03 | L09 | 5 | À faire |   |   |   |   |
| TAKT-L09-04 | L09 | 13 | À faire |   |   |   |   |
| TAKT-L09-05 | L09 | 8 | À faire |   |   |   |   |
| TAKT-L09-06 | L09 | 10 | À faire |   |   |   |   |
| TAKT-L09-07 | L09 | 8 | À faire |   |   |   |   |
| TAKT-L09-08 | L09 | 8 | À faire |   |   |   |   |
| TAKT-L09-09 | L09 | 13 | À faire |   |   |   |   |
| TAKT-L09-10 | L09 | 6 | À faire |   |   |   |   |
| TAKT-L09-11 | L09 | 8 | À faire |   |   |   |   |
| TAKT-L09-12 | L09 | 10 | À faire |   |   |   |   |
| TAKT-L09-13 | L09 | 10 | À faire |   |   |   |   |
| TAKT-L10-01 | L10 | 6 | À faire |   |   |   |   |
| TAKT-L10-02 | L10 | 6 | À faire |   |   |   |   |
| TAKT-L10-03 | L10 | 8 | À faire |   |   |   |   |
| TAKT-L10-04 | L10 | 6 | À faire |   |   |   |   |
| TAKT-L10-05 | L10 | 8 | À faire |   |   |   |   |
| TAKT-L10-06 | L10 | 5 | À faire |   |   |   |   |
| TAKT-L10-07 | L10 | 5 | À faire |   |   |   |   |
| TAKT-L11-01 | L11 | 6 | À faire |   |   |   |   |
| TAKT-L11-02 | L11 | 8 | À faire |   |   |   |   |
| TAKT-L11-03 | L11 | 6 | À faire |   |   |   |   |
| TAKT-L11-04 | L11 | 10 | À faire |   |   |   |   |
| TAKT-L11-05 | L11 | 8 | À faire |   |   |   |   |
| TAKT-L11-06 | L11 | 6 | À faire |   |   |   |   |
| TAKT-L11-07 | L11 | 5 | À faire |   |   |   |   |

> **Mise à jour** : à chaque ticket passé en « Terminé », renseigner *Date fin réel* et *SP gagnés* (= SP du ticket). L'état prend les valeurs : `À faire`, `En cours`, `Bloqué`, `Terminé`.

## §7. Burn‑up et projection de date de fin (graphique descriptif)

Le burn‑up se trace avec :
- **Axe X** : semaines (S1, S2, …).
- **Axe Y** : SP cumulés (0 → 504).
- **Courbe réalisée** : points `(S, SP_cumulés)` du tableau §5.
- **Courbe idéale P50** : droite reliant `(S0, 0)` à `(S_fin_P50, 504)` où `S_fin_P50` est la projection courante.
- **Courbe idéale P80** : droite reliant `(S0, 0)` à `(S_fin_P80, 504)`.

**Interprétation** :
- Si la courbe réalisée reste **au‑dessus** de la droite P50 → le projet est en avance.
- Si elle passe **sous** la droite P80 → alerte : ré‑évaluer la vélocité, réduire WIP, ajouter de la capacité.
- La **date retenue** affichée dans le tableau §5 est le maximum des trois projections (P50_SP, P50_Débit, P80_SP).

## §8. Règles de mise à jour et rituel hebdomadaire

| Rituel | Fréquence | Participants | Entrées | Sorties |
|--------|-----------|--------------|---------|---------|
| **Mise à jour suivi** | Chaque lundi (30 min) | Chef de projet + Tech Lead | Tableau §5 (SP terminés, tickets terminés), tableau §6 (états) | Tableau §5 complété, projections recalculées, écarts documentés |
| **Revue de vélocité** | Tous les 4 semaines | Équipe complète | `V_moy`, `D_moy`, burn‑up | Décision d'ajustement (WIP, capacité, découpage tickets) |
| **Alerte dépassement P80** | Immédiat | Chef de projet + Direction | Courbe burn‑up sous P80 | Plan d'action écrit (répartition, priorisation, renfort) |

**Seuils d'alerte automatiques** (implémentés dans un script `scripts/velocity-check.ts` exécuté en CI hebdo) :
- `Couverture_forecast < 0,9` → warning.
- `Couverture_forecast < 0,75` → alerte critique (déclenche rituel « Alerte dépassement P80 »).
- `WIP > WIP_max` pendant 2 semaines consécutives → warning.

---

*Fin du SUIVI_VELOCITE_TAKT.md — modèle complet pour pilotage en flux continu.*
