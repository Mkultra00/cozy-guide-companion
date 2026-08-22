// Domain types for the AstroFarm agent console (read-only UI shell).
// These mirror the MongoDB collections in §3 of the rebuild spec so the UI can
// be pointed at a real local agent later without changing components.

export type CropCategory = "leafy" | "fruiting" | "root" | "grain" | "legume" | "algae";

export interface Crop {
  key: string;
  name: string;
  category: CropCategory;
  /** Botanical family — used for pest/pathogen diversification checks. */
  family: string;
  /** Crop Readiness Level, 1-9 (flight heritage). */
  crl: number;
  /** Daily light integral, mol/m²/day. */
  dli: number;
  /** Edible biomass, kg fresh mass per m² per day (cycle yield / days to harvest). */
  yieldKgPerM2PerDay: number;
  kcalPerKg: number;
  proteinGPerKg: number;
  /** Subjective composite, 0-10. ASSUMED, not printed in Table 5. */
  vitScore: number;
  /** Full-artificial-light draw; model scales by (1 - naturalLightFrac). */
  powerKwPerM2: number;
  crewHrPerM2PerWeek: number;
  /** Canopy height, m. Clearance is added by the model. */
  heightM: number;
  /** Growth system dry mass, kg per m². */
  systemMassKgPerM2: number;
  /** Water demand, L per kg edible mass (closed loop; only make-up is launched). */
  waterLPerKg: number;
  cycleDays: number;
  /** §6.1 composite risk, 0-1 (higher = riskier). */
  riskScore: number;
}

export interface MissionProfile {
  key: string;
  name: string;
  missionDays: number;
  crew: number;
  /** ESM equivalency factors. */
  volumeEq: number; // kg per m³ pressurized
  powerEq: number; // kg per kW
  coolingEq: number; // kg per kW thermal
  crewTimeEq: number; // kg per crew-hour
  /** Surface gravity, g (0 = orbital). */
  gravity: number;
  /** Fraction of the lighting load offset by natural insolation. */
  naturalLightFrac: number;
  notes: string;
}


export interface Budgets {
  areaM2: number;
  powerKw: number;
  crewHrPerWeek: number;
}

export interface Weights {
  kcal: number;
  protein: number;
  vitamins: number;
  risk: number;
}

export interface EsmBreakdown {
  mass: number;
  volume: number;
  power: number;
  cooling: number;
  crewTime: number;
}

export interface Allocation {
  cropKey: string;
  areaM2: number;
}

export interface MixSummary {
  esmKg: number;
  esmBreakdown: EsmBreakdown;
  kcalPerDay: number;
  kcalCoverage: number;
  proteinGPerDay: number;
  vitIndex: number;
  riskIndex: number;
  areaUsedM2: number;
  powerUsedKw: number;
  crewHrPerWeekUsed: number;
}

export type BindingConstraint = "area" | "power" | "crew";

export interface PlanDiff {
  added: string[];
  removed: string[];
  resized: { cropKey: string; fromM2: number; toM2: number }[];
  esmDelta: number;
  kcalCoverageDelta: number;
  riskDelta: number;
  bindingConstraint: BindingConstraint;
  summary: string;
  material: boolean;
}

export interface Plan {
  id: string;
  version: number;
  ts: string;
  triggeredBy: string;
  profileKey: string;
  budgets: Budgets;
  weights: Weights;
  allocations: Allocation[];
  summary: MixSummary;
  optimizerHistory: { step: number; esmKg: number; kcalCoverage: number }[];
  diffFromPrevious: PlanDiff | null;
  rationale: string;
}

export type ConstraintEventKind =
  | "power_budget"
  | "area_change"
  | "crew_hours"
  | "crop_failure"
  | "resupply_delay"
  | "profile_change";

export interface ConstraintEvent {
  id: string;
  ts: string;
  kind: ConstraintEventKind;
  payload: Record<string, string | number | boolean>;
  source: "ops" | "sensor" | "manual";
  processed: boolean;
  rawText?: string;
}

export type AgentAction =
  | "event_received"
  | "replanned"
  | "evaluated_no_change"
  | "narrated"
  | "parsed_report"
  | "answered_question"
  | "heartbeat"
  | "seeded";

export interface AgentLogEntry {
  id: string;
  ts: string;
  action: AgentAction;
  detail: string;
  latencyMs?: number;
  tokensGenerated?: number;
  planVersion?: number;
}

export interface AgentStatus {
  /** Where the console is reading from. */
  source: "fixture" | "live";
  endpoint: string | null;
  online: boolean;
  modelName: string;
  lastHeartbeatTs: string;
  heartbeatIntervalSec: number;
  mongoReplicaSet: string;
  egress: "none";
}

export interface ConsoleSnapshot {
  status: AgentStatus;
  crops: Crop[];
  profiles: MissionProfile[];
  plans: Plan[];
  events: ConstraintEvent[];
  log: AgentLogEntry[];
}
