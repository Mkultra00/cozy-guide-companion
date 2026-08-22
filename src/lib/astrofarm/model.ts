import {
  CANOPY_CLEARANCE_M,
  COOLING_FRACTION,
  CROPS_BY_KEY,
  getProfile,
  KCAL_TARGET_PER_CREW_DAY,
  WATER_LOOP_LOSS,
} from "./data";
import type {
  Allocation,
  Budgets,
  EsmBreakdown,
  MissionProfile,
  MixSummary,
  Plan,
  PlanDiff,
} from "./types";

/**
 * Deterministic ESM model, §4 of the architecture doc.
 * Acceptance test — 1 m² lettuce, iss_orbital, 365 days:
 * mass 63.4 · volume 129.3 · power 22.2 · cooling 5.1 · crewTime 3.8 · total 223.8
 */

export function cropEsm(
  cropKey: string,
  areaM2: number,
  profile: MissionProfile,
): EsmBreakdown {
  const crop = CROPS_BY_KEY[cropKey];
  if (!crop || areaM2 <= 0) {
    return { mass: 0, volume: 0, power: 0, cooling: 0, crewTime: 0 };
  }
  const weeks = profile.missionDays / 7;
  const volumeM3 = areaM2 * (crop.heightM + CANOPY_CLEARANCE_M);
  const powerKw = areaM2 * crop.powerKwPerM2 * (1 - profile.naturalLightFrac);
  const edibleKg = crop.yieldKgPerM2PerDay * areaM2 * profile.missionDays;
  const waterMakeupKg = edibleKg * crop.waterLPerKg * WATER_LOOP_LOSS;

  return {
    mass: crop.systemMassKgPerM2 * areaM2 + waterMakeupKg,
    volume: volumeM3 * profile.volumeEq,
    power: powerKw * profile.powerEq,
    cooling: powerKw * COOLING_FRACTION * profile.coolingEq,
    crewTime: crop.crewHrPerM2PerWeek * areaM2 * weeks * profile.crewTimeEq,
  };
}


export function esmTotal(breakdown: EsmBreakdown): number {
  return (
    breakdown.mass +
    breakdown.volume +
    breakdown.power +
    breakdown.cooling +
    breakdown.crewTime
  );
}

export function summarize(allocations: Allocation[], profileKey: string): MixSummary {
  const profile = getProfile(profileKey);
  const breakdown: EsmBreakdown = {
    mass: 0,
    volume: 0,
    power: 0,
    cooling: 0,
    crewTime: 0,
  };

  let kcalPerDay = 0;
  let proteinGPerDay = 0;
  let vitWeighted = 0;
  let riskWeighted = 0;
  let areaUsedM2 = 0;
  let powerUsedKw = 0;
  let crewHrPerWeekUsed = 0;

  for (const allocation of allocations) {
    const crop = CROPS_BY_KEY[allocation.cropKey];
    if (!crop) continue;
    const part = cropEsm(allocation.cropKey, allocation.areaM2, profile);
    breakdown.mass += part.mass;
    breakdown.volume += part.volume;
    breakdown.power += part.power;
    breakdown.cooling += part.cooling;
    breakdown.crewTime += part.crewTime;

    const kgPerDay = crop.yieldKgPerM2PerDay * allocation.areaM2;
    kcalPerDay += kgPerDay * crop.kcalPerKg;
    proteinGPerDay += kgPerDay * crop.proteinGPerKg;
    vitWeighted += crop.vitScore * allocation.areaM2;
    riskWeighted += crop.riskScore * allocation.areaM2;
    areaUsedM2 += allocation.areaM2;
    powerUsedKw +=
      crop.powerKwPerM2 * allocation.areaM2 * (1 - profile.naturalLightFrac);

    crewHrPerWeekUsed += crop.crewHrPerM2PerWeek * allocation.areaM2;
  }

  const kcalTarget = KCAL_TARGET_PER_CREW_DAY * profile.crew;

  return {
    esmKg: esmTotal(breakdown),
    esmBreakdown: breakdown,
    kcalPerDay,
    kcalCoverage: kcalTarget > 0 ? kcalPerDay / kcalTarget : 0,
    proteinGPerDay,
    vitIndex: areaUsedM2 > 0 ? vitWeighted / areaUsedM2 : 0,
    riskIndex: areaUsedM2 > 0 ? riskWeighted / areaUsedM2 : 0,
    areaUsedM2,
    powerUsedKw,
    crewHrPerWeekUsed,
  };
}

export function bindingConstraint(
  summary: MixSummary,
  budgets: Budgets,
): PlanDiff["bindingConstraint"] {
  const utilisation: [PlanDiff["bindingConstraint"], number][] = [
    ["area", budgets.areaM2 > 0 ? summary.areaUsedM2 / budgets.areaM2 : 0],
    ["power", budgets.powerKw > 0 ? summary.powerUsedKw / budgets.powerKw : 0],
    ["crew", budgets.crewHrPerWeek > 0 ? summary.crewHrPerWeekUsed / budgets.crewHrPerWeek : 0],
  ];
  return utilisation.sort((a, b) => b[1] - a[1])[0]?.[0] ?? "area";
}

export function esmSharePercent(breakdown: EsmBreakdown): Record<keyof EsmBreakdown, number> {
  const total = esmTotal(breakdown) || 1;
  return {
    mass: (breakdown.mass / total) * 100,
    volume: (breakdown.volume / total) * 100,
    power: (breakdown.power / total) * 100,
    cooling: (breakdown.cooling / total) * 100,
    crewTime: (breakdown.crewTime / total) * 100,
  };
}

/** ESM per edible kcal per day — the "cost of a calorie" ranking. */
export function esmPerKcal(cropKey: string, profile: MissionProfile): number {
  const crop = CROPS_BY_KEY[cropKey];
  if (!crop) return Infinity;
  const esm = esmTotal(cropEsm(cropKey, 1, profile));
  const kcalPerDay = crop.yieldKgPerM2PerDay * crop.kcalPerKg;
  return kcalPerDay > 0 ? esm / kcalPerDay : Infinity;
}

export function diffPlans(previous: Plan | null, next: Plan): PlanDiff | null {
  if (!previous) return null;
  const prevMap = new Map(previous.allocations.map((a) => [a.cropKey, a.areaM2]));
  const nextMap = new Map(next.allocations.map((a) => [a.cropKey, a.areaM2]));

  const added = [...nextMap.keys()].filter((k) => !prevMap.has(k));
  const removed = [...prevMap.keys()].filter((k) => !nextMap.has(k));
  const resized = [...nextMap.entries()]
    .filter(([k, v]) => prevMap.has(k) && Math.abs((prevMap.get(k) ?? 0) - v) > 0.05)
    .map(([k, v]) => ({ cropKey: k, fromM2: prevMap.get(k) ?? 0, toM2: v }));

  const esmDelta = next.summary.esmKg - previous.summary.esmKg;
  const kcalCoverageDelta = next.summary.kcalCoverage - previous.summary.kcalCoverage;
  const riskDelta = next.summary.riskIndex - previous.summary.riskIndex;
  const material =
    added.length > 0 ||
    removed.length > 0 ||
    Math.abs(esmDelta) / Math.max(previous.summary.esmKg, 1) > 0.02;

  const parts: string[] = [];
  if (added.length) parts.push(`+${added.length} crop`);
  if (removed.length) parts.push(`-${removed.length} crop`);
  if (resized.length) parts.push(`${resized.length} resized`);
  parts.push(`ESM ${esmDelta >= 0 ? "+" : ""}${esmDelta.toFixed(1)} kg-eq`);

  return {
    added,
    removed,
    resized,
    esmDelta,
    kcalCoverageDelta,
    riskDelta,
    bindingConstraint: bindingConstraint(next.summary, next.budgets),
    summary: parts.join(", "),
    material,
  };
}
