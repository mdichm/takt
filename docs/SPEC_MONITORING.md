# Spécification Monitoring — TAKT (SPEC_MONITORING.md)

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques
**Version :** 1.0
**Date :** 30 octobre 2026
**Responsable :** DevOps + Architecte
**Statut :** Validé — G5 résolu
**Documents liés :** DEPLOIEMENT.md (§5), PLAN_MACRO.md (§6), ST_TAKT.md, docker-compose.prod.yml

---

## 1. Objectif

Étendre le monitoring au-delà du simple healthcheck pour couvrir l'infrastructure, l'application métier et le solver CP-SAT, avec alerting proactif.

---

## 2. Stack de monitoring

| Composant | Technologie | Version | Rôle |
|-----------|-------------|---------|------|
| Collecte métriques | Prometheus | v2.47 | Scraping, stockage TSDB, alerting |
| Visualisation | Grafana | 10.2 | Dashboards, exploration, alerting UI |
| Logs centralisés | Loki + Promtail | 2.9 | Agrégation logs structurés |
| Alerting | Alertmanager | 0.26 | Routage, déduplication, notification |
---

## 3. Métriques techniques (Infrastructure)

| Métrique | Source | PromQL | Seuil alerte | Criticité |
|----------|--------|--------|--------------|-----------|
| Disponibilité API | Healthcheck | `up{job="backend"} == 0` | 1min | Critique |
| Latence HTTP p95 | Backend (Prometheus middleware) | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` | > 500ms | Avertissement |
| Taux d'erreur 5xx | Backend | `rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])` | > 1% | Critique |
| Connexions DB actives | PostgreSQL exporter | `pg_stat_activity_count / pg_settings_max_connections` | > 80% | Avertissement |
| Taille base de données | PostgreSQL exporter | `pg_database_size_bytes` | > 85% disque | Avertissement |
| Espace disque | Node exporter | `(node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100` | < 15% | Critique |
| Utilisation mémoire | Node exporter | `(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100` | > 90% | Avertissement |
| CPU usage | Node exporter | `rate(node_cpu_seconds_total{mode="idle"}[5m])` | < 10% idle | Avertissement |

---

## 4. Métriques métier (Application)

| Métrique | Source | PromQL | Seuil alerte | Criticité |
|----------|--------|--------|--------------|-----------|
| Générations lancées | Backend (custom) | `rate(takt_generations_started_total[5m])` | — | Info |
| Générations réussies | Backend (custom) | `rate(takt_generations_completed_total[5m])` | — | Info |
| Générations échouées | Backend (custom) | `rate(takt_generations_failed_total[5m])` | > 5% / 1h | Critique |
| Durée moyenne génération | Backend (custom) | `rate(takt_generation_duration_seconds_sum[5m]) / rate(takt_generation_duration_seconds_count[5m])` | > 600s | Avertissement |
| Scénarios générés par job | Backend (custom) | `takt_scenarios_generated` | < 1 | Avertissement |
| Taux de couverture moyen | Backend (custom) | `avg(takt_coverage_ratio)` | < 80% | Critique |
| Versions bloquées > 24h | Backend (custom) | `takt_versions_stuck_24h` | > 0 | Avertissement |
| Transitions workflow/jour | Backend (custom) | `rate(takt_workflow_transitions_total[24h])` | — | Info |
| Taux de rejet Direction | Backend (custom) | `rate(takt_workflow_rejected_dir_total[24h]) / rate(takt_workflow_submitted_dir_total[24h])` | > 30% | Avertissement |
| Exports générés | Backend (custom) | `rate(takt_exports_generated_total[5m])` | — | Info |
| Échecs exports | Backend (custom) | `rate(takt_exports_failed_total[5m])` | > 0 | Avertissement |
| Bails d'édition actifs | Backend (custom) | `takt_active_edition_locks` | > 10 | Info |
| Verrous incompatibles détectés | Backend (custom) | `rate(takt_incompatible_locks_detected_total[5m])` | > 0 | Avertissement |

---

## 5. Métriques Solver CP-SAT

| Métrique | Source | PromQL | Seuil alerte | Criticité |
|----------|--------|--------|--------------|-----------|
| Jobs solver en file d'attente | pg-boss / custom | `takt_solver_queue_depth` | > 5 | Avertissement |
| Temps d'attente queue | pg-boss / custom | `rate(takt_solver_queue_wait_seconds_sum[5m]) / rate(takt_solver_queue_wait_seconds_count[5m])` | > 300s | Avertissement |
| Temps résolution solver | Worker (custom) | `rate(takt_solver_solve_duration_seconds_sum[5m]) / rate(takt_solver_solve_duration_seconds_count[5m])` | > 300s | Critique |
| Mémoire solver | Worker (custom) | `takt_solver_memory_bytes` | > 6GB | Critique |
| Statut solver (OPTIMAL/FEASIBLE/INFEASIBLE) | Worker (custom) | `takt_solver_status` | INFEASIBLE | Avertissement |
---

## 6. Règles d'alerte Prometheus (alerting rules)

```yaml
# prometheus/alerts/takt-infrastructure.yml
groups:
  - name: takt-infrastructure
    interval: 30s
    rules:
      - alert: ServiceDown
        expr: up{job=~"backend|frontend|postgres|prometheus|grafana"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} down"
          description: "{{ $labels.job }} is down for more than 1 minute"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="backend"}[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency (p95 > 500ms)"
          description: "p95 latency is {{ $value }}s"

      - alert: HighErrorRate
        expr: rate(http_requests_total{job="backend",status=~"5.."}[5m]) / rate(http_requests_total{job="backend"}[5m]) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High 5xx error rate"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count / pg_settings_max_connections > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL connections > 80%"

      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 15
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk space < 15% on {{ $labels.instance }}"

      - alert: MemoryHigh
        expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Memory usage > 90%"
```

---

## 7. Règles d'alerte Métier & Solver

```yaml
  - name: takt-business
    interval: 60s
    rules:
      - alert: GenerationFailureRateHigh
        expr: rate(takt_generations_failed_total[1h]) / rate(takt_generations_started_total[1h]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Generation failure rate > 5%"
          description: "{{ $value | humanizePercentage }} of generations failed in the last hour"

      - alert: GenerationDurationHigh
        expr: rate(takt_generation_duration_seconds_sum[5m]) / rate(takt_generation_duration_seconds_count[5m]) > 600
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Average generation duration > 10 minutes"

      - alert: CoverageRatioLow
        expr: avg(takt_coverage_ratio) < 0.8
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Average coverage ratio < 80%"

      - alert: VersionsStuckInWorkflow
        expr: takt_versions_stuck_24h > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "{{ $value }} version(s) stuck in workflow for > 24h"

      - alert: DirectionRejectionRateHigh
        expr: rate(takt_workflow_rejected_dir_total[24h]) / rate(takt_workflow_submitted_dir_total[24h]) > 0.3
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Direction rejection rate > 30%"

      - alert: IncompatibleLocksDetected
        expr: rate(takt_incompatible_locks_detected_total[5m]) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Incompatible locks detected"

  - name: takt-solver
    interval: 60s
    rules:
      - alert: SolverQueueBacklog
        expr: takt_solver_queue_depth > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Solver queue backlog > 5 jobs"

      - alert: SolverSolveTimeHigh
        expr: rate(takt_solver_solve_duration_seconds_sum[5m]) / rate(takt_solver_solve_duration_seconds_count[5m]) > 300
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Solver solve time > 5 minutes"

      - alert: SolverMemoryHigh
        expr: takt_solver_memory_bytes > 6442450944
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Solver memory > 6GB"

      - alert: SolverInfeasible
        expr: takt_solver_status == 2
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Solver returned INFEASIBLE"
          description: "Constraints may be too restrictive for generation {{ $labels.generationId }}"
```
---

## 8. Dashboards Grafana

### 8.1 Dashboard Infrastructure (`takt-infrastructure.json`)

Panels :
- **Services Status** : Statut up/down de chaque service (backend, frontend, postgres, prometheus, grafana, solver-worker)
- **HTTP Requests Rate** : Requêtes/sec par endpoint, code de réponse
- **Latency Heatmap** : Heatmap p50/p95/p99 par endpoint
- **Error Rate** : Taux d'erreur 4xx/5xx au fil du temps
- **Database** : Connexions actives, taille DB, requêtes lentes, locks
- **System** : CPU, Memory, Disk, Network I/O
- **Container Resources** : CPU/Memory limits vs usage par conteneur

### 8.2 Dashboard Métier (`takt-business.json`)

Panels :
- **Workflow Funnel** : Nombre de versions par état (initial → rep_pedag → brouillon → generation → edition → valid_pedag → valid_dir → valide → publie → archive)
- **Generation Pipeline** : Lancées / En cours / Réussies / Échouées / Durée moyenne
- **Coverage Tracking** : Taux de couverture moyen par département, par version
- **Locks & Conflicts** : Verrous posés/levés, conflits détectés, verrous incompatibles
- **Exports** : Générés par format (XLSX/PDF/ICS), échecs, taille fichiers
- **User Activity** : Connexions, sessions actives, actions par rôle

### 8.3 Dashboard Solver (`takt-solver.json`)

Panels :
- **Queue Depth** : Jobs en attente, en cours, terminés
- **Solve Time Distribution** : Histogramme durée résolution
- **Solver Status** : OPTIMAL / FEASIBLE / INFEASIBLE / TIMEOUT / ERROR
- **Resource Usage** : CPU, Memory par worker solver
- **Scenario Quality** : Score global, sous-scores (couverture, créneaux, salles, enseignants)
- **Partial Results** : Taux de séances NON_PLACÉE par génération

---

## 9. Configuration Prometheus (prometheus.yml)

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - '/etc/prometheus/rules/*.yml'

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'backend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['backend:3000']

  - job_name: 'frontend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['frontend:80']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'solver-worker'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['solver-worker:3001']

  - job_name: 'pgbackrest'
    static_configs:
      - targets: ['pgbackrest-exporter:9190']
```

---

## 10. Alertmanager Configuration

```yaml
# alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'job', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      continue: true
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'default'
    email_configs:
      - to: 'devops@etab.internal'
        send_resolved: true
  - name: 'critical-alerts'
    email_configs:
      - to: 'oncall@etab.internal'
        send_resolved: true
    webhook_configs:
      - url: 'https://webhook.etab.internal/alerts/critical'
  - name: 'warning-alerts'
    email_configs:
      - to: 'devops@etab.internal'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'job']
```
---

## 11. Intégration dans l'application (Backend)

```typescript
// apps/backend/src/metrics/metrics.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeHistogramProvider, makeGaugeProvider } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly generationsStarted: Counter;
  private readonly generationsCompleted: Counter;
  private readonly generationsFailed: Counter;
  private readonly generationDuration: Histogram;
  private readonly scenariosGenerated: Gauge;
  private readonly coverageRatio: Gauge;
  private readonly workflowTransitions: Counter;
  private readonly workflowRejectedDir: Counter;
  private readonly workflowSubmittedDir: Counter;
  private readonly versionsStuck24h: Gauge;
  private readonly activeEditionLocks: Gauge;
  private readonly incompatibleLocksDetected: Counter;
  private readonly exportsGenerated: Counter;
  private readonly exportsFailed: Counter;
  private readonly solverQueueDepth: Gauge;
  private readonly solverQueueWait: Histogram;
  private readonly solverSolveDuration: Histogram;
  private readonly solverMemory: Gauge;
  private readonly solverStatus: Gauge;

  constructor() {
    // Initialisation via providers PrometheusModule
  }

  recordGenerationStart(generationId: string) {
    this.generationsStarted.inc({ generationId });
  }

  recordGenerationComplete(generationId: string, durationMs: number, scenarios: number) {
    this.generationsCompleted.inc({ generationId });
    this.generationDuration.observe({ generationId }, durationMs / 1000);
    this.scenariosGenerated.set({ generationId }, scenarios);
  }

  recordGenerationFailure(generationId: string, error: string) {
    this.generationsFailed.inc({ generationId, error });
  }

  recordCoverage(versionId: string, ratio: number) {
    this.coverageRatio.set({ versionId }, ratio);
  }

  recordWorkflowTransition(from: string, to: string, role: string) {
    this.workflowTransitions.inc({ from, to, role });
  }

  recordDirectionRejection(versionId: string, reason: 'pedagogique' | 'planning') {
    this.workflowRejectedDir.inc({ versionId, reason });
  }

  recordDirectionSubmission(versionId: string) {
    this.workflowSubmittedDir.inc({ versionId });
  }

  updateStuckVersions(count: number) {
    this.versionsStuck24h.set(count);
  }

  recordLockPose(versionId: string) {
    this.activeEditionLocks.inc({ versionId });
  }

  recordLockRelease(versionId: string) {
    this.activeEditionLocks.dec({ versionId });
  }

  recordIncompatibleLock(versionId: string, lockType: string) {
    this.incompatibleLocksDetected.inc({ versionId, lockType });
  }

  recordExport(format: string, success: boolean) {
    if (success) {
      this.exportsGenerated.inc({ format });
    } else {
      this.exportsFailed.inc({ format });
    }
  }

  setSolverQueueDepth(depth: number) {
    this.solverQueueDepth.set(depth);
  }

  recordSolverQueueWait(durationMs: number) {
    this.solverQueueWait.observe(durationMs / 1000);
  }

  recordSolverSolveDuration(durationMs: number) {
    this.solverSolveDuration.observe(durationMs / 1000);
  }

  setSolverMemory(bytes: number) {
    this.solverMemory.set(bytes);
  }

  setSolverStatus(status: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'TIMEOUT' | 'ERROR') {
    const statusCode = { OPTIMAL: 0, FEASIBLE: 1, INFEASIBLE: 2, TIMEOUT: 3, ERROR: 4 }[status];
    this.solverStatus.set(statusCode);
  }
}
```

---

## 12. Procédure de réponse aux incidents (Runbook simplifié)

| Alerte | Action immédiate | Escalade |
|--------|------------------|----------|
| ServiceDown | Vérifier logs conteneur, redémarrer si nécessaire | DevOps → Architecte si récurrent |
| HighLatency | Vérifier charge DB, slow queries, redémarrer backend | DevOps |
| HighErrorRate | Vérifier logs erreurs, rollback si déploiement récent | DevOps → Architecte |
| GenerationFailureRateHigh | Vérifier solver logs, contraintes, verrous | Backend Lead |
| SolverSolveTimeHigh | Vérifier ressources worker, réduire concurrence | DevOps + Backend Lead |
| CoverageRatioLow | Vérifier données pédagogiques, affectations manquantes | MOA + Backend Lead |
| VersionsStuckInWorkflow | Contacter propriétaires (gest/rdep/dir), forcer transition si admin | MOA |
| DiskSpaceLow | Nettoyer logs, exports anciens, augmenter volume | DevOps |

---

## 13. Références

- Prometheus : https://prometheus.io/docs/
- Grafana : https://grafana.com/docs/
- Alertmanager : https://prometheus.io/docs/alerting/latest/alertmanager/
- DEPLOIEMENT.md §5 (Monitoring et supervision)
- PLAN_MACRO.md §6 (Exploitation & Maintien)

---

*Fin du SPEC_MONITORING.md — TAKT v1.0*