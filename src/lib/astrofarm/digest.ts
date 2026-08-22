import { CROPS_BY_KEY } from "./data";
import type { ConsoleSnapshot, Plan } from "./types";

/** Compact, model-readable summary of the plan the console is displaying. */
export function buildPlanDigest(snapshot: ConsoleSnapshot, plan: Plan): string {
  const s = plan.summary;
  const b = plan.budgets;
  const lines: string[] = [];

  lines.push(`PLAN v${plan.version} (${plan.ts}) triggered by: ${plan.triggeredBy}`);
  lines.push(`Mission profile: ${plan.profileKey}`);
  lines.push(
    `Budgets: area ${b.areaM2} m2, power ${b.powerKw} kW, crew ${b.crewHrPerWeek} h/week`,
  );
  lines.push(
    `Used: area ${s.areaUsedM2.toFixed(1)} m2, power ${s.powerUsedKw.toFixed(2)} kW, crew ${s.crewHrPerWeekUsed.toFixed(1)} h/week`,
  );
  lines.push(
    `ESM total ${s.esmKg.toFixed(1)} kg-eq; breakdown mass ${s.esmBreakdown.mass.toFixed(1)}, volume ${s.esmBreakdown.volume.toFixed(1)}, power ${s.esmBreakdown.power.toFixed(1)}, cooling ${s.esmBreakdown.cooling.toFixed(1)}, crewTime ${s.esmBreakdown.crewTime.toFixed(1)}`,
  );
  lines.push(
    `Nutrition: ${s.kcalPerDay.toFixed(0)} kcal/day (coverage ${(s.kcalCoverage * 100).toFixed(1)}%), protein ${s.proteinGPerDay.toFixed(0)} g/day, vitamin index ${s.vitIndex.toFixed(2)}, risk index ${s.riskIndex.toFixed(3)}`,
  );
  lines.push(
    `Weights: kcal ${plan.weights.kcal}, protein ${plan.weights.protein}, vitamins ${plan.weights.vitamins}, risk ${plan.weights.risk}`,
  );

  lines.push("Allocations (crop, category, CRL, m2):");
  for (const a of plan.allocations) {
    const crop = CROPS_BY_KEY[a.cropKey];
    lines.push(
      `- ${crop?.name ?? a.cropKey}, ${crop?.category ?? "?"}, CRL ${crop?.crl ?? "?"}, ${a.areaM2.toFixed(1)} m2`,
    );
  }

  const d = plan.diffFromPrevious;
  if (d) {
    lines.push(
      `Diff vs previous: binding=${d.bindingConstraint}, ESM ${d.esmDelta >= 0 ? "+" : ""}${d.esmDelta.toFixed(1)} kg-eq, coverage ${(d.kcalCoverageDelta * 100).toFixed(1)} pts, risk ${d.riskDelta.toFixed(3)}, added [${d.added.join(", ")}], removed [${d.removed.join(", ")}], resized ${d.resized.length}, material=${d.material}`,
    );
  } else {
    lines.push("Diff vs previous: none (baseline plan).");
  }

  lines.push("Recent constraint events:");
  for (const e of snapshot.events.slice(0, 6)) {
    lines.push(`- ${e.ts} ${e.kind} (${e.source}) ${JSON.stringify(e.payload)}`);
  }

  lines.push(`Agent rationale: ${plan.rationale}`);

  return lines.join("\n");
}
