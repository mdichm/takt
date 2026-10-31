# Spécification Solver CP-SAT — TAKT (SPEC_SOLVER_CPSAT.md)

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques
**Version :** 1.0
**Date :** 30 octobre 2026
**Responsable :** Architecte + Backend Lead
**Statut :** Validé — G3 résolu
**Documents liés :** ST_TAKT.md (§0.1, §3.4), SF_TAKT.md (§11), WORKFLOW_METIER.md (§8), openapi.yaml, contract.prisma

---

## 1. Objectif

Définir le contrat d'interface entre l'application TAKT (base métier) et le solver CP-SAT (moteur de génération), conformément au principe EX-PRI-01 : **le solver ne reçoit que des fichiers dérivés et n'accède jamais à la base métier**.

---

## 2. Architecture d'intégration

```
┌─────────────────┐     Fichier dérivé (JSON)      ┌──────────────────┐
│   Application   │ ─────────────────────────────► │   Worker CP-SAT  │
│     TAKT        │                                 │   (pg-boss job)  │
│  (NestJS API)   │ ◄───────────────────────────── │  + OR-Tools      │
└─────────────────┘      Scénarios (JSON)          └──────────────────┘
        │                                                    │
        ▼                                                    ▼
┌─────────────────┐                                ┌──────────────────┐
│  Base métier    │                                │  Stockage fichiers│
│  (PostgreSQL)   │                                │  dérivés / logs   │
└─────────────────┘                                └──────────────────┘
```

**Flux :**
1. API reçoit demande de génération → crée job `Generation` en `EN_COURS`
2. Worker pg-boss récupère le job → construit le **fichier dérivé** JSON
3. Worker écrit le fichier dérivé dans `/data/derived/<generationId>.json`
4. Worker lance le solver CP-SAT (processus enfant OR-Tools Python ou binaire Node.js)
5. Solver lit le fichier dérivé, écrit les scénarios dans `/data/scenarios/<generationId>/`
6. Worker parse les scénarios, met à jour la BDD (table `Scenario`, `Generation`)
7. API notifie le frontend (SSE) de la fin de génération
---

## 3. Format du fichier dérivé (JSON Schema)

### 3.1 Schéma complet

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "TAKT CP-SAT Derived File",
  "type": "object",
  "required": ["metadata", "timeGrid", "rooms", "teachers", "groups", "subjects", "activities", "constraints", "locks"],
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["generationId", "versionId", "semestre", "createdAt", "timeSlotMinutes", "days", "slotsPerDay"],
      "properties": {
        "generationId": { "type": "string", "format": "uuid" },
        "versionId": { "type": "string", "format": "uuid" },
        "semestre": { "type": "string" },
        "createdAt": { "type": "string", "format": "date-time" },
        "timeSlotMinutes": { "type": "integer", "const": 30 },
        "days": { "type": "integer", "const": 6 },
        "slotsPerDay": { "type": "integer", "const": 24 }
      }
    },
    "timeGrid": {
      "type": "object",
      "required": ["totalSlots", "slotDurationMinutes", "dayLabels", "slotLabels"],
      "properties": {
        "totalSlots": { "type": "integer" },
        "slotDurationMinutes": { "type": "integer", "const": 30 },
        "dayLabels": { "type": "array", "items": { "type": "string" }, "minItems": 6, "maxItems": 6 },
        "slotLabels": { "type": "array", "items": { "type": "string" } }
      }
    },
    "rooms": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "code", "capacity", "type", "building"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "code": { "type": "string" },
          "capacity": { "type": "integer", "minimum": 1 },
          "type": { "type": "string", "enum": ["AMPHI", "TD", "TP", "INFO"] },
          "building": { "type": "string" }
        }
      }
    },
    "teachers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "code", "name", "departmentId", "maxHoursPerWeek"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "code": { "type": "string" },
          "name": { "type": "string" },
          "departmentId": { "type": "string", "format": "uuid" },
          "maxHoursPerWeek": { "type": "integer", "minimum": 0 }
        }
      }
    },
    "groups": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "code", "size", "departmentId"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "code": { "type": "string" },
          "size": { "type": "integer", "minimum": 1 },
          "departmentId": { "type": "string", "format": "uuid" }
        }
      }
    },
    "subjects": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "code", "name", "teachingType", "chargeCoefficient"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "code": { "type": "string" },
          "name": { "type": "string" },
          "teachingType": { "type": "string", "enum": ["CM", "TD", "TP", "PROJET"] },
          "chargeCoefficient": { "type": "number", "minimum": 0.1 }
        }
      }
    },
    "activities": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "subjectId", "teacherIds", "groupIds", "roomType", "durationSlots", "weeklyVolume", "teachingType"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "subjectId": { "type": "string", "format": "uuid" },
          "teacherIds": { "type": "array", "items": { "type": "string", "format": "uuid" } },
          "groupIds": { "type": "array", "items": { "type": "string", "format": "uuid" } },
          "roomType": { "type": "string", "enum": ["AMPHI", "TD", "TP", "INFO", "ANY"] },
          "durationSlots": { "type": "integer", "minimum": 1 },
          "weeklyVolume": { "type": "integer", "minimum": 1 },
          "teachingType": { "type": "string", "enum": ["CM", "TD", "TP", "PROJET"] }
        }
      }
    },
    "constraints": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "type", "category", "scope", "targetId", "value", "weight", "isActive", "source", "createdBy", "createdAt"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "type": { "type": "string", "enum": ["UNAVAILABILITY", "ROOM_REQUIREMENT", "TEACHER_PREFERENCE", "CONSECUTIVE_SLOTS", "MAX_HOURS_PER_DAY", "WINDOW_CONSTRAINT", "NO_GAPS", "COMPACT_DAYS", "LOAD_BALANCE", "SUBJECT_GROUPING", "CM_BEFORE_TD", "SPREAD", "AVOID_LAST_SLOT", "SAME_ROOM", "ROOM_PROXIMITY", "PREFERRED_BUILDING"] },
          "category": { "type": "string", "enum": ["HARD", "SOFT"] },
          "scope": { "type": "string", "enum": ["GLOBAL", "TEACHER", "GROUP", "ROOM", "ACTIVITY", "DEPARTMENT"] },
          "targetId": { "type": ["string", "null"], "format": "uuid" },
          "value": { "type": "string" },
          "weight": { "type": "integer", "minimum": 1, "maximum": 100 },
          "isActive": { "type": "boolean" },
          "source": { "type": "string", "enum": ["AUTO", "MANUAL", "CONFIG"] },
          "createdBy": { "type": "string", "format": "uuid" },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      }
    },
    "locks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "activityId", "lockType", "value"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "activityId": { "type": "string", "format": "uuid" },
          "lockType": { "type": "string", "enum": ["TIMESLOT", "ROOM", "TEACHER", "ACTIVITY"] },
          "value": { "type": "string" }
        }
      }
    }
  }
}
```
### 3.2 Exemple concret (extrait)

```json
{
  "metadata": {
    "generationId": "550e8400-e29b-41d4-a716-446655440000",
    "versionId": "550e8400-e29b-41d4-a716-446655440001",
    "semestre": "S1 2026-2027",
    "createdAt": "2026-11-15T10:30:00Z",
    "timeSlotMinutes": 30,
    "days": 6,
    "slotsPerDay": 24
  },
  "timeGrid": {
    "totalSlots": 144,
    "slotDurationMinutes": 30,
    "dayLabels": ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
    "slotLabels": ["08:00", "08:30", "09:00", "..."]
  },
  "rooms": [
    { "id": "r1", "code": "A101", "capacity": 30, "type": "TD", "building": "A" },
    { "id": "r2", "code": "AMPHI", "capacity": 200, "type": "AMPHI", "building": "A" }
  ],
  "teachers": [
    { "id": "t1", "code": "MARTIN", "name": "Martin Jean", "departmentId": "d1", "maxHoursPerWeek": 19 }
  ],
  "groups": [
    { "id": "g1", "code": "G1", "size": 28, "departmentId": "d1" }
  ],
  "subjects": [
    { "id": "s1", "code": "ALGO", "name": "Algorithmique", "teachingType": "CM", "chargeCoefficient": 1.0 }
  ],
  "activities": [
    {
      "id": "a1",
      "subjectId": "s1",
      "teacherIds": ["t1"],
      "groupIds": ["g1"],
      "roomType": "AMPHI",
      "durationSlots": 4,
      "weeklyVolume": 2,
      "teachingType": "CM"
    }
  ],
  "constraints": [
    {
      "id": "c1",
      "type": "UNAVAILABILITY",
      "targetId": "t1",
      "value": '{"day": 2, "slots": [0,1,2,3]}',
      "weight": 100
    }
  ],
  "locks": [
    {
      "id": "l1",
      "activityId": "a1",
      "lockType": "ROOM",
      "value": "r2"
    }
  ]
}
```

---

## 4. Interface TypeScript (Client Solver)

```typescript
// packages/solver-client/src/types.ts

export interface DerivedFile {
  metadata: DerivedMetadata;
  timeGrid: TimeGrid;
  rooms: Room[];
  teachers: Teacher[];
  groups: Group[];
  subjects: Subject[];
  activities: Activity[];
  constraints: Constraint[];
  locks: Lock[];
}

export interface DerivedMetadata {
  generationId: string;
  versionId: string;
  semestre: string;
  createdAt: string;
  timeSlotMinutes: 30;
  days: 6;
  slotsPerDay: 24;
}

export interface TimeGrid {
  totalSlots: number;
  slotDurationMinutes: 30;
  dayLabels: string[];
  slotLabels: string[];
}

export interface Room {
  id: string;
  code: string;
  capacity: number;
  type: 'AMPHI' | 'TD' | 'TP' | 'INFO';
  building: string;
}

export interface Teacher {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  maxHoursPerWeek: number;
}

export interface Group {
  id: string;
  code: string;
  size: number;
  departmentId: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  teachingType: 'CM' | 'TD' | 'TP' | 'PROJET';
  chargeCoefficient: number;
}

export interface Activity {
  id: string;
  subjectId: string;
  teacherIds: string[];
  groupIds: string[];
  roomType: 'AMPHI' | 'TD' | 'TP' | 'INFO' | 'ANY';
  durationSlots: number;
  weeklyVolume: number;
  teachingType: 'CM' | 'TD' | 'TP' | 'PROJET';
}

export interface Constraint {
  id: string;
  type: 'UNAVAILABILITY' | 'ROOM_REQUIREMENT' | 'TEACHER_PREFERENCE' | 'CONSECUTIVE_SLOTS' | 'MAX_HOURS_PER_DAY' | 'WINDOW_CONSTRAINT' | 'NO_GAPS' | 'COMPACT_DAYS' | 'LOAD_BALANCE' | 'SUBJECT_GROUPING' | 'CM_BEFORE_TD' | 'SPREAD' | 'AVOID_LAST_SLOT' | 'SAME_ROOM' | 'ROOM_PROXIMITY' | 'PREFERRED_BUILDING';
  category: 'HARD' | 'SOFT';
  scope: 'GLOBAL' | 'TEACHER' | 'GROUP' | 'ROOM' | 'ACTIVITY' | 'DEPARTMENT';
  targetId: string | null;
  value: string;
  weight: number;
  isActive: boolean;
  source: 'AUTO' | 'MANUAL' | 'CONFIG';
  createdBy: string;
  createdAt: string;
}

export interface Lock {
  id: string;
  activityId: string;
  lockType: 'TIMESLOT' | 'ROOM' | 'TEACHER' | 'ACTIVITY';
  value: string;
}
```
---

## 5. Client Solver (packages/solver-client)

```typescript
// packages/solver-client/src/solver-client.ts

import { DerivedFile, ScenarioResult } from './types';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import * as path from 'path';

export class SolverClient {
  private readonly derivedDir: string;
  private readonly scenariosDir: string;
  private readonly solverCommand: string;

  constructor(options: {
    derivedDir: string;
    scenariosDir: string;
    solverCommand?: string;
  }) {
    this.derivedDir = options.derivedDir;
    this.scenariosDir = options.scenariosDir;
    this.solverCommand = options.solverCommand || 'python3 -m takt.solver';
  }

  async generate(derivedFile: DerivedFile): Promise<GenerationResult> {
    const generationId = derivedFile.metadata.generationId;
    const derivedPath = path.join(this.derivedDir, `${generationId}.json`);
    const scenarioDir = path.join(this.scenariosDir, generationId);

    await fs.mkdir(this.derivedDir, { recursive: true });
    await fs.writeFile(derivedPath, JSON.stringify(derivedFile, null, 2));
    await fs.mkdir(scenarioDir, { recursive: true });

    const result = await this.runSolver(generationId, derivedPath, scenarioDir);
    const scenarios = await this.parseScenarios(scenarioDir);

    return {
      generationId,
      status: result.success ? 'TERMINEE' : 'ECHEC',
      scenarios,
      error: result.error,
      durationMs: result.durationMs,
    };
  }

  private async runSolver(
    generationId: string,
    derivedPath: string,
    scenarioDir: string
  ): Promise<{ success: boolean; error?: string; durationMs: number }> {
    const start = Date.now();

    return new Promise((resolve) => {
      const child = spawn(this.solverCommand, [
        '--input', derivedPath,
        '--output', scenarioDir,
        '--max-scenarios', '3',
        '--time-limit', '300'
      ], {
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONPATH: '/opt/takt/solver',
          ORTOOLS_LOGGING: 'INFO'
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => { stdout += data.toString(); });
      child.stderr?.on('data', (data) => { stderr += data.toString(); });

      child.on('close', (code) => {
        const durationMs = Date.now() - start;
        if (code === 0) {
          resolve({ success: true, durationMs });
        } else {
          resolve({ success: false, error: stderr || stdout, durationMs });
        }
      });

      child.on('error', (err) => {
        resolve({ success: false, error: err.message, durationMs: Date.now() - start });
      });

      setTimeout(() => {
        child.kill('SIGTERM');
        resolve({ success: false, error: 'Solver timeout (300s)', durationMs: Date.now() - start });
      }, 310000);
    });
  }

  private async parseScenarios(scenarioDir: string): Promise<ScenarioResult[]> {
    const files = await fs.readdir(scenarioDir);
    const scenarioFiles = files.filter(f => f.endsWith('.json'));
    return Promise.all(scenarioFiles.map(async (file) => {
      const content = await fs.readFile(path.join(scenarioDir, file), 'utf-8');
      return JSON.parse(content) as ScenarioResult;
    }));
  }
}

export interface GenerationResult {
  generationId: string;
  status: 'TERMINEE' | 'ECHEC';
  scenarios: ScenarioResult[];
  error?: string;
  durationMs: number;
}

export interface ScenarioResult {
  id: string;
  scoreGlobal: number;
  sousScores: {
    couverture: number;
    respectCreneaux: number;
    respectSalles: number;
    respectEnseignants: number;
    continuite: number;
    equilibreCharge: number;
  };
  placements: Placement[];
  nonPlaces: string[];
}

export interface Placement {
  activityId: string;
  day: number;
  startSlot: number;
  durationSlots: number;
  roomId: string;
  teacherId: string;
  groupIds: string[];
}
```
---

## 6. Worker pg-boss (NestJS)

```typescript
// apps/backend/src/generation/generation.processor.ts

import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Generation } from '../entities/generation.entity';
import { Scenario } from '../entities/scenario.entity';
import { Version } from '../entities/version.entity';
import { Seance } from '../entities/seance.entity';
import { Contrainte } from '../entities/contrainte.entity';
import { VerrouSeance } from '../entities/verrou-seance.entity';
import { SolverClient, DerivedFile, GenerationResult } from '@takt/solver-client';

@Processor('generation')
export class GenerationProcessor {
  private readonly solverClient: SolverClient;

  constructor(
    @InjectRepository(Generation)
    private readonly generationRepo: Repository<Generation>,
    @InjectRepository(Scenario)
    private readonly scenarioRepo: Repository<Scenario>,
    @InjectRepository(Version)
    private readonly versionRepo: Repository<Version>,
    @InjectRepository(Seance)
    private readonly seanceRepo: Repository<Seance>,
    @InjectRepository(Contrainte)
    private readonly contrainteRepo: Repository<Contrainte>,
    @InjectRepository(VerrouSeance)
    private readonly verrouRepo: Repository<VerrouSeance>,
  ) {
    this.solverClient = new SolverClient({
      derivedDir: process.env.DERIVED_DIR || '/data/derived',
      scenariosDir: process.env.SCENARIOS_DIR || '/data/scenarios',
      solverCommand: process.env.SOLVER_COMMAND,
    });
  }

  @Process('generate')
  async handleGeneration(job: Job<{ generationId: string }>) {
    const { generationId } = job.data;

    const generation = await this.generationRepo.findOne({
      where: { id: generationId },
      relations: ['version', 'version.semestre'],
    });
    if (!generation) throw new Error(`Generation ${generationId} not found`);

    const version = generation.version;
    if (!version) throw new Error(`Version not found for generation ${generationId}`);

    const derivedFile = await this.buildDerivedFile(version);
    await this.generationRepo.update(generationId, { statut: 'EN_COURS' });

    const result = await this.solverClient.generate(derivedFile);

    if (result.status === 'TERMINEE') {
      await this.saveScenarios(generationId, result.scenarios);
      await this.generationRepo.update(generationId, {
        statut: 'TERMINEE',
        scores: result.scenarios[0] ? { global: result.scenarios[0].scoreGlobal } : {},
      });
    } else {
      await this.generationRepo.update(generationId, {
        statut: 'ECHEC',
        scores: { error: result.error },
      });
    }

    this.eventEmitter.emit('generation.completed', { generationId, result });
  }

  private async buildDerivedFile(version: Version): Promise<DerivedFile> {
    const [seances, contraintes, verrous, salles, enseignants, groupes, matieres] = await Promise.all([
      this.seanceRepo.find({ where: { versionId: version.id }, relations: ['affectation', 'affectation.matiere', 'affectation.enseignant', 'affectation.groupe'] }),
      this.contrainteRepo.find({ where: { versionId: version.id } }),
      this.verrouRepo.find({ where: { versionId: version.id }, relations: ['seance'] }),
      this.salleRepo.find(),
      this.enseignantRepo.find(),
      this.groupeRepo.find(),
      this.matiereRepo.find(),
    ]);

    return {
      metadata: {
        generationId: '',
        versionId: version.id,
        semestre: `${version.semestre.numero} ${version.semestre.anneeUniversitaire.libelle}`,
        createdAt: new Date().toISOString(),
        timeSlotMinutes: 30,
        days: 6,
        slotsPerDay: 24,
      },
      timeGrid: this.buildTimeGrid(),
      rooms: this.mapRooms(salles),
      teachers: this.mapTeachers(enseignants),
      groups: this.mapGroups(groupes),
      subjects: this.mapSubjects(matieres),
      activities: this.mapActivities(seances),
      constraints: this.mapConstraints(contraintes),
      locks: this.mapLocks(verrous),
    };
  }
}
```
---

## 7. Configuration du solver (OR-Tools CP-SAT — Python)

```python
# solver/cp_sat_model.py
from ortools.sat.python import cp_model
import json
import sys

class TaktSolver:
    def __init__(self, derived_file: str):
        with open(derived_file) as f:
            self.data = json.load(f)
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self._setup_solver()

    def _setup_solver(self):
        self.solver.parameters.max_time_in_seconds = 300
        self.solver.parameters.num_search_workers = 8
        self.solver.parameters.log_search_progress = True
        self.solver.parameters.cp_model_probing_level = 2

    def build_model(self):
        # Variables : placement[activity_id][day][slot][room] = BoolVar
        # Contraintes : couverture, non-chevauchement, verrous, capacités, etc.
        # Objectif : maximiser score global (sous-scores pondérés)
        pass

    def solve(self) -> list:
        self.build_model()
        status = self.solver.Solve(self.model)
        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return self.extract_scenarios()
        return []

    def extract_scenarios(self) -> list:
        scenarios = []
        for i in range(3):
            scenario = self._extract_scenario(i)
            if scenario:
                scenarios.append(scenario)
                self._add_diversity_constraint(scenario)
            else:
                break
        return scenarios

if __name__ == '__main__':
    input_file = sys.argv[1]
    output_dir = sys.argv[2]
    solver = TaktSolver(input_file)
    scenarios = solver.solve()
    for i, sc in enumerate(scenarios):
        with open(f"{output_dir}/scenario_{i}.json", 'w') as f:
            json.dump(sc, f, indent=2)
```

---

## 8. Critères de performance (Spike SPK-01)

| Métrique | Cible | Seuil d'alerte |
|----------|-------|----------------|
| Temps de génération (200 séances) | < 5 min | > 10 min |
| Temps de génération (4000 séances) | < 30 min | > 60 min |
| Scénarios générés | 3 par défaut | < 1 = échec |
| Taux de couverture moyen | ≥ 95% | < 80% |
| Mémoire solver | < 4 GB | > 6 GB |

---

## 9. Gestion des erreurs

| Code | Situation | Comportement |
|------|-----------|--------------|
| SOLVER_TIMEOUT | Dépassement 300s | Statut `ECHEC`, scénario partiel si disponible |
| SOLVER_INFEASIBLE | Contraintes incompatibles | Statut `ECHEC`, liste des conflits détectés |
| DERIVED_FILE_INVALID | Schéma JSON invalide | Erreur avant lancement, job marqué `ECHEC` |
| STORAGE_FULL | Espace disque insuffisant | Alerte monitoring, retry différé |

---

## 10. Références

- OR-Tools CP-SAT : https://developers.google.com/optimization/cp/sat
- pg-boss : https://github.com/timgit/pg-boss
- ST_TAKT.md §3.4 (Génération CP-SAT)
- SF_TAKT.md §11 (Génération d'emplois du temps)
- WORKFLOW_METIER.md §8 (Verrous de séance)

---

*Fin du SPEC_SOLVER_CPSAT.md — TAKT v1.0*