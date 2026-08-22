import { Badge } from "@/components/ui/badge";
import { CROPS_BY_KEY } from "@/lib/astrofarm/data";
import { dateTime, num, pct, signed } from "@/lib/astrofarm/format";
import type { Plan } from "@/lib/astrofarm/types";

export function RationalePanel({ plan }: { plan: Plan }) {
  const diff = plan.diffFromPrevious;

  return (
    <section className="panel px-5 py-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Rationale — written by the local model
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            triggered by <span className="metric">{plan.triggeredBy}</span> · {dateTime(plan.ts)}
          </p>
        </div>
        <Badge variant="outline" className="metric border-accent/40 text-accent">
          plan v{plan.version}
        </Badge>
      </header>

      <p className="mt-4 border-l-2 border-accent/50 pl-4 text-sm leading-relaxed text-foreground">
        {plan.rationale}
      </p>

      {diff ? (
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="ESM delta" value={`${signed(diff.esmDelta, 1)} kg-eq`} />
          <Stat label="Calorie coverage" value={`${signed(diff.kcalCoverageDelta * 100, 1)} pts`} />
          <Stat label="Risk index" value={signed(diff.riskDelta, 3)} />
          <Stat label="Now binding" value={diff.bindingConstraint} />
          <Stat
            label="Added"
            value={diff.added.map((k) => CROPS_BY_KEY[k]?.name ?? k).join(", ") || "none"}
          />
          <Stat
            label="Removed"
            value={diff.removed.map((k) => CROPS_BY_KEY[k]?.name ?? k).join(", ") || "none"}
          />
          <Stat label="Resized" value={`${diff.resized.length} crops`} />
          <Stat
            label="Materiality"
            value={diff.material ? "material — plan written" : "below threshold"}
          />
        </dl>
      ) : (
        <p className="metric mt-5 text-xs text-muted-foreground">
          Baseline revision — no previous plan to diff against. Coverage{" "}
          {pct(plan.summary.kcalCoverage)}, vitamin index {num(plan.summary.vitIndex, 1)}.
        </p>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-caps">{label}</dt>
      <dd className="metric mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}
