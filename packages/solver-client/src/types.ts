// Types for CP-SAT Solver Client — TAKT
// Generated from SPEC_SOLVER_CPSAT.md

export interface DerivedFile {
  metadata: Metadata;
  timeGrid: TimeGrid;
  rooms: Room[];
  teachers: Teacher[];
  groups: Group[];
  subjects: Subject[];
  activities: Activity[];
  constraints: Constraint[];
  locks: Lock[];
}

export interface Metadata {
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
  name: string;
  type: 'AMPHI' | 'TD' | 'TP' | 'INFO';
  capacity: number;
  building: string;
  equipment: string[];
}

export interface Teacher {
  id: string;
  name: string;
  departmentId: string;
  maxHoursPerWeek: number;
  unavailableSlots: UnavailableSlot[];
}

export interface UnavailableSlot {
  day: number;
  slots: number[];
  allDay?: boolean;
}

export interface Group {
  id: string;
  name: string;
  departmentId: string;
  size: number;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  departmentId: string;
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

export interface Scenario {
  id: string;
  generationId: string;
  score: number;
  subScores: SubScores;
  placements: Placement[];
  unplacedActivities: string[];
  status: 'OPTIMAL' | 'FEASIBLE' | 'PARTIAL' | 'INFEASIBLE' | 'TIMEOUT';
  createdAt: string;
}

export interface SubScores {
  coverage: number;
  timeslotRespect: number;
  roomRespect: number;
  teacherRespect: number;
  continuity: number;
  loadBalance: number;
}

export interface Placement {
  activityId: string;
  day: number;
  slot: number;
  roomId: string;
  teacherId: string;
}