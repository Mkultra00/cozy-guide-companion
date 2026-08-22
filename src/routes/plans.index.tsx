import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { snapshotQuery } from "@/lib/astrofarm/client";
import { dateTime, kg, num, pct, relativeTime, signed } from "@/lib/astrofarm/format";
import { useNow } from "@/hooks/use-now";

export const Route = createFileRoute("/plans/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQuery),
  head: () => ({
    meta: [
      { title: "Plan History — AstroFarm Agent" },
      {
        name: "description",
        content:
          "Every allocation the AstroFarm agent has produced, versioned and never overwritten — the auditable design record behind each ESM trade study revision.",
      },
      { property: "og:title", content: "Plan History — AstroFarm Agent" },
      {
        property: "og:description",
        content:
          "Versioned, never-overwritten crop allocations with the constraint event and rationale attached to each revision.",
      },
    ],
  }),
  component: PlanHistoryPage,
});

function PlanHistoryPage() {
  const { data: snapshot } = useSuspenseQuery(snapshotQuery);
  const now = useNow();
  const plans = [...snapshot.plans].sort((a, b) => b.version - a.version);

  return (
    <main className="mx-auto max-w-[1200px] space-y-6 px-6 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Plan history</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Plans are versioned and never overwritten. Each revision carries the event that triggered
          it, the diff against its predecessor, and the rationale the local model wrote — which is
          what turns a trade study into an auditable design record.
        </p>
      </div>

      <ol className="space-y-4">
        {plans.map((plan) => (
          <li key={plan.id}>
            <Link
              to="/plans/$version"
              params={{ version: String(plan.version) }}
              className="panel block px-5 py-4 transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="metric border-primary/40 text-primary">
                  v{plan.version}
                </Badge>
                <span className="metric text-xs text-muted-foreground">{dateTime(plan.ts)}</span>
                <span className="metric text-xs text-muted-foreground">
                  triggered by {plan.triggeredBy}
                </span>
                <span className="metric ml-auto text-xs text-muted-foreground">
                  {relativeTime(plan.ts, now)}
                </span>
              </div>

              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="ESM" value={kg(plan.summary.esmKg)} />
                <Stat
                  label="Coverage"
                  value={pct(plan.summary.kcalCoverage)}
                  hint={
                    plan.diffFromPrevious
                      ? `${signed(plan.diffFromPrevious.kcalCoverageDelta * 100, 1)} pts`
                      : undefined
                  }
                />
                <Stat
                  label="Binding"
                  value={plan.diffFromPrevious?.bindingConstraint ?? "area"}
                  hint={`${num(plan.budgets.powerKw, 1)} kW · ${num(plan.budgets.crewHrPerWeek, 0)} crew-h/wk`}
                />
                <Stat label="Crops" value={`${plan.allocations.length}`} hint={plan.diffFromPrevious?.summary} />
              </div>

              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {plan.rationale}
              </p>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string | undefined }) {
  return (
    <div>
      <p className="label-caps">{label}</p>
      <p className="metric mt-1 text-sm text-foreground">{value}</p>
      {hint ? <p className="metric mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
