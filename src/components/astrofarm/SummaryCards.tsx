import { Progress } from "@/components/ui/progress";
import { kg, num, pct, signed } from "@/lib/astrofarm/format";
import type { Budgets, MixSummary, PlanDiff } from "@/lib/astrofarm/types";

interface SummaryCardsProps {
  summary: MixSummary;
  budgets: Budgets;
  diff: PlanDiff | null;
}

export function SummaryCards({ summary, budgets, diff }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric
        label="Equivalent system mass"
        value={kg(summary.esmKg)}
        delta={diff ? `${signed(diff.esmDelta, 1)} kg-eq vs previous` : "baseline revision"}
        deltaTone={diff && diff.esmDelta < 0 ? "good" : diff && diff.esmDelta > 0 ? "bad" : "flat"}
      />
      <Metric
        label="Calorie coverage"
        value={pct(summary.kcalCoverage)}
        delta={
          diff
            ? `${signed(diff.kcalCoverageDelta * 100, 1)} pts · ${num(summary.kcalPerDay, 0)} kcal/day`
            : `${num(summary.kcalPerDay, 0)} kcal/day`
        }
        deltaTone={
          diff && diff.kcalCoverageDelta > 0 ? "good" : diff && diff.kcalCoverageDelta < 0 ? "bad" : "flat"
        }
        bar={summary.kcalCoverage}
      />
      <Metric
        label="Protein output"
        value={`${num(summary.proteinGPerDay, 0)} g/day`}
        delta={`vitamin index ${num(summary.vitIndex, 1)} / 10`}
        deltaTone="flat"
      />
      <Metric
        label="Binding constraint"
        value={diff ? diff.bindingConstraint.toUpperCase() : "AREA"}
        delta={`${num(summary.areaUsedM2, 0)}/${budgets.areaM2} m² · ${num(summary.powerUsedKw, 1)}/${num(
          budgets.powerKw,
          1,
        )} kW · ${num(summary.crewHrPerWeekUsed, 1)}/${num(budgets.crewHrPerWeek, 0)} crew-h/wk`}
        deltaTone="flat"
        accent
      />
    </div>
  );
}

function Metric({
  label,
  value,
  delta,
  deltaTone,
  bar,
  accent,
}: {
  label: string;
  value: string;
  delta: string;
  deltaTone: "good" | "bad" | "flat";
  bar?: number;
  accent?: boolean;
}) {
  const toneClass =
    deltaTone === "good"
      ? "text-success"
      : deltaTone === "bad"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <article className="panel px-5 py-4">
      <p className="label-caps">{label}</p>
      <p
        className={`metric mt-2 text-2xl font-semibold ${accent ? "text-accent" : "text-foreground"}`}
      >
        {value}
      </p>
      {bar !== undefined ? (
        <Progress value={Math.min(100, bar * 100)} className="mt-3 h-1.5 bg-muted" />
      ) : null}
      <p className={`metric mt-2 text-[11px] leading-relaxed ${toneClass}`}>{delta}</p>
    </article>
  );
}
