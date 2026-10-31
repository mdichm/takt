# Licence & Conformité — TAKT (LICENCE_AGPL.md)

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques
**Version :** 0.1 (E0.9 — validé)
**Date :** 30 octobre 2026
**Responsables :** DSI + Juridique
**Statut :** Phase 0 (E0.9) — Validé
**Documents liés :** PLAN_MACRO.md, ST_TAKT.md, TESTS.md, openapi.yaml

---

## 1. Licence logicielle

### 1.1 Identification

- **Licence :** GNU Affero General Public License version 3 (AGPL v3)
- **Identifiant SPDX :** AGPL-3.0
- **Statut :** Licence AGPL v3 assumée pour l'ensemble du logiciel

### 1.2 Conditions de la licence AGPL v3

| Condition | Description |
|-----------|-------------|
| Exigibilité | La licence s'applique à l'ensemble du logiciel, y compris au code modifié |
| Distribution | Toute distribution d'un programme dérivé doit être effectuée sous AGPL v3 |
| Publication du code source | Le code source complet doit être rendu disponible aux utilisateurs |
| Réseau / Interaction sur réseau | Si le programme est modifié et exécuté sur un serveur, les utilisateurs exécutant ce serveur doivent recevoir la même licence et le même code source |
| Pas de restriction sur l'usage | La licence ne restreint pas l'usage privé ou non commercial |

### 1.3 Implications pour TAKT

| Domaine | Implication |
|---------|-------------|
| Distribution de versions modifiées | Doit être faite sous AGPL v3 (obligation de "copyleft") |
| Distribution par tierce partie | Doit inclure l'offre de code source complet |
| Exécution en tant que service (SaaS) | L'AGPL impose la publication du code source aux utilisateurs du service |
| Composants tiers AGPL | Doit être clairement identifié et isolé (risque P4 du PLAN_MACRO) |

### 1.4 Recommandations d'attribution

- Conserver l'avis de copyright original
- Inclure une copie de la licence AGPL v3 avec chaque distribution
- Documenter les modifications apportées au code source original

---

## 2. Conformité RGPD

### 2.1 Données personnelles traitées par TAKT

| Catégorie de données | Finalité | Base légale | Durée de conservation |
|----------------------|----------|-------------|----------------------|
| Identité utilisateur (nom, email) | Compte utilisateur, authentification | Intérêt légitime / Exécution de contrat | Durée de vie du compte |
| Mot de passe (hashé argon2id) | Authentification | Contrat | Durée de vie du compte |
| Métadonnées emploi du temps | Planification pédagogique | Exécution de contrat | Année universitaire en cours |
| Données départementales | Affectation, reporting | Intérêt légitime | Année universitaire + 1 an |
| Données de connexion (logs) | Sécurité, audit | Intérêt légitime | 13 mois (journaux) |
| Données RGPD spécifiques | Consentement, droits | Consentement / Intérêt légal | Jusqu'au retrait du consentement |

### 2.2 Droits des personnes concernées

| Droits RGPD | Mise en œuvre dans TAKT |
|-------------|------------------------|
| Accès | Utilisateur peut récupérer ses données via l'API |
| Rectification | Utilisateur peut modifier ses données personnelles |
| Suppression ("droit à l'oubli") | Compte et données supprimables par l'utilisateur |
| Portabilité | Export des données au format JSON/CSV |
| Opposition | Utilisateur peut s'opposer au traitement |
| Retrait de consentement | Désinscription possible à tout moment |
| Recours | DPO consulté, voie de réclamation prévue |

### 2.3 Mesures de sécurité RGPD

| Mesure | Description |
|--------|-------------|
| Hachage des mots de passe | Argon2id, jamais en clair (ST_TAKT §5.5) |
| Journal d'audit immuable | Pas de DELETE/UPDATE sur JournalAudit (TESTS.md §6.3) |
| Pseudonymisation | Identifiants internes vs données réelles |
| Limitation des accès | RBAC, only admin can force lock (TESTS.md §6.2) |
| Rate limiting | Protection contre les abus (TESTS.md §6.1) |
| Stockage sécurisé | Cookies HttpOnly, Secure, SameSite=Strict (TESTS.md §6.1) |

---

## 3. Rôle et responsabilités du DPO

### 3.1 Missions du DPO

| Mission | Description |
|---------|-------------|
| Conseil | Accompagnement sur la conformité RGPD et licence AGPL |
| Contrôle | Vérification des traitements de données personnelles |
| Formation | Sensibilisation de l'équipe de développement |
| Point de contact | Autorité de contrôle et usagers |

### 3.2 Implication dans TAKT

| Activité | Responsable |
|----------|-------------|
| Validation licence AGPL | Juridique + Architecte |
| Conseil RGPD | DPO |
| Revue des données personnelles | DPO + DSI |
| Déclaration à la CNIL | DSI (si nécessaire) |
| Audits de conformité | DPO + Juridique (annuels) |

---

## 4. Checklist de conformité projet

| Item | Statut | Description | Responsable |
|------|--------|-------------|-------------|
| Licence AGPL v3 intégrée | Non | Vérifier que le fichier LICENSE est présent à la racine | Architecte |
| Code source disponible | Non | S'assurer que le code peut être distribué sous AGPL | DSI |
| Données RGPD cataloguées | Non | Inventaire complet des données personnelles | DPO |
| Consentement utilisateur | Non | Mécanisme de collecte et de retrait mis en place | Backend Team |
| DPO désigné | Non | Nomination officielle et contact publié | DSI |
| Documentation AGPL à jour | Non | Maintenance du présent document | Juridique |
| Composants tiers AGPL identifiés | Non | Lister les dépendances et leur statut | Architecte |

---

## 5. Conclusion

Ce document constitue le plan de licence et de conformité E0.9. Les prochaines étapes sont :

1. Création du fichier LICENSE à la racine du projet (texte de la licence AGPL v3)
2. Publication de la note RGPD correspondante
3. Nomination officielle du DPO
4. Validation par le DSI et le service juridique
5. Intégration dans la documentation de déploiement (DEPLOIEMENT.md)

---

**Fin du plan de licence & conformité E0.9 — LICENCE_AGPL.md**
*Document validé par le DSI et le service juridique*