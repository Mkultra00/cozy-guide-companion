import { CROPS, MISSION_PROFILES } from "./data";
import { diffPlans, summarize } from "./model";
import type {
  AgentLogEntry,
  AgentStatus,
  Allocation,
  Budgets,
  ConsoleSnapshot,
  ConstraintEvent,
  Plan,
  Weights,
} from "./types";

/**
 * Deterministic reference snapshot. This is the shape the real agent must
 * return; the console reads nothing else. Timestamps are fixed offsets from a
 * stable epoch so server and client render identically (no hydration drift).
 */

const EPOCH = Date.parse("2026-08-22T15:40:00Z");
const minsAgo = (m: number) => new Date(EPOCH - m * 60_000).toISOString();

const WEIGHTS: Weights = { kcal: 0.45, protein: 0.25, vitamins: 0.2, risk: 0.1 };
const PROFILE_KEY = "lunar_surface";

const optimizerHistory = (steps: number, endEsm: number, endCoverage: number) =>
  Array.from({ length: steps }, (_, i) => {
    const t = (i + 1) / steps;
    return {
      step: i + 1,
      esmKg: Number((endEsm * (0.18 + 0.82 * t)).toFixed(1)),
      // diminishing returns: coverage saturates while ESM keeps climbing
      kcalCoverage: Number((endCoverage * Math.sqrt(t)).toFixed(4)),
    };
  });

interface Draft {
  version: number;
  minutesAgo: number;
  triggeredBy: string;
  budgets: Budgets;
  allocations: Allocation[];
  rationale: string;
}

const DRAFTS: Draft[] = [
  {
    version: 1,
    minutesAgo: 1440,
    triggeredBy: "manual",
    budgets: { areaM2: 62, powerKw: 12, crewHrPerWeek: 22 },
    allocations: [
      { cropKey: "sweet_potato", areaM2: 14 },
      { cropKey: "wheat", areaM2: 12 },
      { cropKey: "soybean", areaM2: 9 },
      { cropKey: "lettuce", areaM2: 6 },
      { cropKey: "kale", areaM2: 5 },
      { cropKey: "tomato", areaM2: 4 },
      { cropKey: "spirulina", areaM2: 6 },
      { cropKey: "pepper", areaM2: 2 },
    ],
    rationale:
      "Baseline allocation for the 600-day lunar profile at 12 kW. Calorie load is carried by sweet potato and dwarf wheat; soybean and spirulina cover protein. Pressurized volume is already the dominant ESM term at 57% of total cost, so short-canopy crops are favoured over nominally efficient tall ones. Area binds first — the planner should negotiate for rack height before asking for more power.",
  },
  {
    version: 2,
    minutesAgo: 640,
    triggeredBy: "resupply_delay",
    budgets: { areaM2: 62, powerKw: 12, crewHrPerWeek: 22 },
    allocations: [
      { cropKey: "sweet_potato", areaM2: 12 },
      { cropKey: "wheat", areaM2: 13 },
      { cropKey: "soybean", areaM2: 11 },
      { cropKey: "lettuce", areaM2: 6 },
      { cropKey: "kale", areaM2: 5 },
      { cropKey: "tomato", areaM2: 3 },
      { cropKey: "spirulina", areaM2: 7 },
      { cropKey: "pepper", areaM2: 2 },
    ],
    rationale:
      "Resupply slipped by 45 days, so the mix shifts toward shelf-stable calorie and protein density. Wheat and soybean gain area at the expense of sweet potato and dwarf tomato. ESM rises slightly because grain carries a taller canopy, but calorie coverage improves and the farm is less dependent on the next cargo flight. Area still binds.",
  },
  {
    version: 3,
    minutesAgo: 96,
    triggeredBy: "crew_hours",
    budgets: { areaM2: 62, powerKw: 12, crewHrPerWeek: 17 },
    allocations: [
      { cropKey: "sweet_potato", areaM2: 13 },
      { cropKey: "wheat", areaM2: 13 },
      { cropKey: "soybean", areaM2: 10 },
      { cropKey: "lettuce", areaM2: 7 },
      { cropKey: "kale", areaM2: 5 },
      { cropKey: "spirulina", areaM2: 5 },
      { cropKey: "pepper", areaM2: 2 },
    ],
    rationale:
      "Crew horticulture time was cut from 22 to 17 hours per week for EVA prep. Dwarf tomato is dropped outright — it is the highest crew-hour cost per edible kilogram in the library — and spirulina is trimmed, since its tending burden scales with tray count. Crew time is now the binding constraint, not area. Calorie coverage is essentially unchanged; vitamin index falls and should be watched.",
  },
  {
    version: 4,
    minutesAgo: 6,
    triggeredBy: "power_budget",
    budgets: { areaM2: 62, powerKw: 8, crewHrPerWeek: 17 },
    allocations: [
      { cropKey: "sweet_potato", areaM2: 11 },
      { cropKey: "wheat", areaM2: 9 },
      { cropKey: "soybean", areaM2: 7 },
      { cropKey: "lettuce", areaM2: 8 },
      { cropKey: "mizuna", areaM2: 5 },
      { cropKey: "kale", areaM2: 4 },
      { cropKey: "pak_choi", areaM2: 3 },
    ],
    rationale:
      "Power dropped to 8 kW until the array is repaired, and tray 3 spirulina is flagged contaminated, so spirulina is removed from the library for this revision. Total lit area falls by 12 m² and the mix rebalances toward low-wattage leafy crops — mizuna and pak choi enter, lettuce grows. Protein is now the weak link: soybean alone carries it and crew-day protein drops by roughly a third. Power binds. If the array stays degraded past 30 days the planner should trade vitamin variety for a second protein crop rather than defend the current spread.",
  },
];

export const FIXTURE_PLANS: Plan[] = DRAFTS.reduce<Plan[]>((acc, draft) => {
  const summary = summarize(draft.allocations, PROFILE_KEY);
  const plan: Plan = {
    id: `plan_${draft.version}`,
    version: draft.version,
    ts: minsAgo(draft.minutesAgo),
    triggeredBy: draft.triggeredBy,
    profileKey: PROFILE_KEY,
    budgets: draft.budgets,
    weights: WEIGHTS,
    allocations: draft.allocations,
    summary,
    optimizerHistory: optimizerHistory(9, summary.esmKg, summary.kcalCoverage),
    diffFromPrevious: null,
    rationale: draft.rationale,
  };
  plan.diffFromPrevious = diffPlans(acc[acc.length - 1] ?? null, plan);
  acc.push(plan);
  return acc;
}, []);

export const FIXTURE_EVENTS: ConstraintEvent[] = [
  {
    id: "evt_6",
    ts: minsAgo(6),
    kind: "power_budget",
    payload: { powerKw: 8 },
    source: "ops",
    processed: true,
    rawText: "we're down to 8 kW until the array is repaired, and tray 3 spirulina looks contaminated",
  },
  {
    id: "evt_5",
    ts: minsAgo(6),
    kind: "crop_failure",
    payload: { cropKey: "spirulina", status: "failed", tray: 3 },
    source: "ops",
    processed: true,
    rawText: "we're down to 8 kW until the array is repaired, and tray 3 spirulina looks contaminated",
  },
  {
    id: "evt_4",
    ts: minsAgo(52),
    kind: "area_change",
    payload: { areaM2: 62 },
    source: "manual",
    processed: true,
  },
  {
    id: "evt_3",
    ts: minsAgo(96),
    kind: "crew_hours",
    payload: { crewHrPerWeek: 17, reason: "EVA prep" },
    source: "ops",
    processed: true,
  },
  {
    id: "evt_2",
    ts: minsAgo(640),
    kind: "resupply_delay",
    payload: { slipDays: 45, flight: "CRS-Lunar 7" },
    source: "ops",
    processed: true,
  },
  {
    id: "evt_1",
    ts: minsAgo(1380),
    kind: "profile_change",
    payload: { profileKey: "lunar_surface" },
    source: "manual",
    processed: true,
  },
];

export const FIXTURE_LOG: AgentLogEntry[] = [
  {
    id: "log_16",
    ts: minsAgo(1),
    action: "heartbeat",
    detail: "Periodic re-evaluation — no material change (ESM Δ 0.0%, binding: power)",
    latencyMs: 412,
    planVersion: 4,
  },
  {
    id: "log_15",
    ts: minsAgo(4),
    action: "answered_question",
    detail: "Q: “Why did you drop sweet potato area three revisions ago?” — answered from plans v1–v4",
    latencyMs: 2380,
    tokensGenerated: 214,
    planVersion: 4,
  },
  {
    id: "log_14",
    ts: minsAgo(6),
    action: "narrated",
    detail: "Rationale generated for plan v4 (power 8 kW, spirulina removed)",
    latencyMs: 3105,
    tokensGenerated: 187,
    planVersion: 4,
  },
  {
    id: "log_13",
    ts: minsAgo(6),
    action: "replanned",
    detail: "-1 crop, +1 crop, 5 resized, ESM -1184.6 kg-eq, binding: power",
    latencyMs: 268,
    planVersion: 4,
  },
  {
    id: "log_12",
    ts: minsAgo(6),
    action: "parsed_report",
    detail: "Ops message → 2 constraintEvents (power_budget 8 kW, crop_failure spirulina/tray 3)",
    latencyMs: 1642,
    tokensGenerated: 96,
  },
  {
    id: "log_11",
    ts: minsAgo(6),
    action: "event_received",
    detail: "power_budget from ops",
    latencyMs: 9,
  },
  {
    id: "log_10",
    ts: minsAgo(31),
    action: "heartbeat",
    detail: "Periodic re-evaluation — no material change (ESM Δ 0.4%, binding: crew)",
    latencyMs: 398,
    planVersion: 3,
  },
  {
    id: "log_9",
    ts: minsAgo(52),
    action: "evaluated_no_change",
    detail: "area_change 62 m² → allocation unchanged, ESM Δ 0.0%",
    latencyMs: 241,
    planVersion: 3,
  },
  {
    id: "log_8",
    ts: minsAgo(52),
    action: "event_received",
    detail: "area_change from manual",
    latencyMs: 7,
  },
  {
    id: "log_7",
    ts: minsAgo(96),
    action: "narrated",
    detail: "Rationale generated for plan v3 (crew hours 22 → 17)",
    latencyMs: 2894,
    tokensGenerated: 173,
    planVersion: 3,
  },
  {
    id: "log_6",
    ts: minsAgo(96),
    action: "replanned",
    detail: "-1 crop, 4 resized, ESM -742.1 kg-eq, binding: crew",
    latencyMs: 254,
    planVersion: 3,
  },
  {
    id: "log_5",
    ts: minsAgo(96),
    action: "event_received",
    detail: "crew_hours from ops",
    latencyMs: 8,
  },
  {
    id: "log_4",
    ts: minsAgo(640),
    action: "narrated",
    detail: "Rationale generated for plan v2 (resupply slip 45 days)",
    latencyMs: 2751,
    tokensGenerated: 168,
    planVersion: 2,
  },
  {
    id: "log_3",
    ts: minsAgo(640),
    action: "replanned",
    detail: "5 resized, ESM +196.3 kg-eq, binding: area",
    latencyMs: 262,
    planVersion: 2,
  },
  {
    id: "log_2",
    ts: minsAgo(1440),
    action: "replanned",
    detail: "Baseline plan v1 created for lunar surface profile",
    latencyMs: 287,
    planVersion: 1,
  },
  {
    id: "log_1",
    ts: minsAgo(1445),
    action: "seeded",
    detail: "Seeded 15 crops and 3 mission profiles into astrofarm",
    latencyMs: 1120,
  },
];

export const FIXTURE_STATUS: AgentStatus = {
  source: "fixture",
  endpoint: null,
  online: true,
  modelName: "Qwen3.6-35B-A3B-NVFP4",
  lastHeartbeatTs: minsAgo(1),
  heartbeatIntervalSec: 300,
  mongoReplicaSet: "rs0 (single node)",
  egress: "none",
};

export const FIXTURE_SNAPSHOT: ConsoleSnapshot = {
  status: FIXTURE_STATUS,
  crops: CROPS,
  profiles: MISSION_PROFILES,
  plans: FIXTURE_PLANS,
  events: FIXTURE_EVENTS,
  log: FIXTURE_LOG,
};
