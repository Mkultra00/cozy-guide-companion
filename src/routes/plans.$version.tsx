import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AllocationTable } from "@/components/astrofarm/AllocationTable";
import { EsmBreakdownChart } from "@/components/astrofarm/EsmBreakdownChart";
import { OptimizerCurve } from "@/components/astrofarm/OptimizerCurve";
import { RationalePanel } from "@/components/astrofarm/RationalePanel";
import { SummaryCards } from "@/components/astrofarm/SummaryCards";
import { planByVersion, snapshotQuery } from "@/lib/astrofarm/client";

export const Route = createFileRoute("/plans/$version")({
  loader: async ({ context, params }) => {
    const snapshot = await context.queryClient.ensureQueryData(snapshotQuery);
    const plan = planByVersion(snapshot, Number(params.version));
    if (!plan) throw notFound();
    return { version: plan.version, triggeredBy: plan.triggeredBy };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Plan unavailable — AstroFarm Agent" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `Plan v${loaderData.version} — AstroFarm Agent`;
    const description = `Allocation revision v${loaderData.version}, triggered by ${loaderData.triggeredBy}: ESM breakdown, crop-by-crop areas, and the agent's written rationale.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: PlanDetailPage,
  notFoundComponent: PlanNotFound,
});

function PlanDetailPage() {
  const { data: snapshot } = useSuspenseQuery(snapshotQuery);
  const { version } = Route.useParams();
  const plan = planByVersion(snapshot, Number(version));

  if (!plan) return <PlanNotFound />;

  return (
    <main className="mx-auto max-w-[1200px] space-y-6 px-6 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Plan v{plan.version}</h1>
        <Link to="/plans" className="text-sm text-primary hover:underline">
          ← all revisions
        </Link>
      </div>

      <SummaryCards summary={plan.summary} budgets={plan.budgets} diff={plan.diffFromPrevious} />
      <RationalePanel plan={plan} />
      <div className="grid gap-6 lg:grid-cols-2">
        <EsmBreakdownChart breakdown={plan.summary.esmBreakdown} totalEsm={plan.summary.esmKg} />
        <OptimizerCurve plan={plan} />
      </div>
      <AllocationTable plan={plan} />
    </main>
  );
}

function PlanNotFound() {
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-foreground">No such plan revision</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The agent has not written that version.
      </p>
      <Link to="/plans" className="mt-6 inline-block text-sm text-primary hover:underline">
        ← all revisions
      </Link>
    </main>
  );
}
