import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ActionFeed } from "@/components/astrofarm/ActionFeed";
import { AllocationTable } from "@/components/astrofarm/AllocationTable";
import { CropCompositionPie } from "@/components/astrofarm/CropCompositionPie";
import { EsmBreakdownChart } from "@/components/astrofarm/EsmBreakdownChart";
import { EventsPanel } from "@/components/astrofarm/EventsPanel";
import { ImplicationsPanel } from "@/components/astrofarm/ImplicationsPanel";
import { OptimizerCurve } from "@/components/astrofarm/OptimizerCurve";

import { RationalePanel } from "@/components/astrofarm/RationalePanel";
import { StatusBar } from "@/components/astrofarm/StatusBar";
import { SummaryCards } from "@/components/astrofarm/SummaryCards";
import { latestPlan, snapshotQuery } from "@/lib/astrofarm/client";
import { useNow } from "@/hooks/use-now";
import astrochimp from "@/assets/astrochimp.jpg";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQuery),
  head: () => ({
    meta: [
      { title: "AstroFarm Console — Live Agent State" },
      {
        name: "description",
        content:
          "Live view of the AstroFarm planning agent: autonomous action log, current crop allocation, ESM cost breakdown, and the constraint events that triggered each re-plan.",
      },
      { property: "og:title", content: "AstroFarm Console — Live Agent State" },
      {
        property: "og:description",
        content:
          "Autonomous action log, current allocation, and ESM cost breakdown for the AstroFarm planning agent.",
      },
    ],
  }),
  component: ConsolePage,
});

function ConsolePage() {
  const { data: snapshot } = useSuspenseQuery(snapshotQuery);
  const now = useNow();
  const plan = latestPlan(snapshot);

  if (!plan) {
    return (
      <main className="mx-auto max-w-[1600px] px-6 py-10">
        <p className="text-sm text-muted-foreground">
          The agent has not written a plan yet. Waiting on the first constraint event.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
      <section className="panel relative overflow-hidden">
        <img
          src={astrochimp}
          alt="Astrochimp — a chimpanzee in a NASA space suit tending cannabis plants aboard the orbital farm"
          width={1536}
          height={1024}
          className="h-[clamp(260px,46vw,560px)] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6 sm:p-10">
          <p className="label-caps">AstroFarm · crew avatar</p>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
            AstroFarm
          </h1>
          <p className="max-w-2xl text-sm text-foreground/80 sm:text-base">
            The orbital farm's resident crew member — a cute chimpanzee in a full EVA suit — proudly
            holds up a cannabis plant while the planning agent handles the math.
          </p>
        </div>
      </section>

      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">
          Constrained crop planning under changing constraints
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          An always-on agent watches mission reality, re-runs the deterministic ESM optimizer when
          something moves, and writes a versioned plan with a written rationale. Everything below is
          state the agent produced on its own.
        </p>
      </div>

      <StatusBar status={snapshot.status} now={now} planVersion={plan.version} />

      <SummaryCards
        summary={plan.summary}
        budgets={plan.budgets}
        diff={plan.diffFromPrevious}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <RationalePanel plan={plan} />
          <ImplicationsPanel snapshot={snapshot} plan={plan} />

          <div className="grid gap-6 lg:grid-cols-2">
            <EsmBreakdownChart
              breakdown={plan.summary.esmBreakdown}
              totalEsm={plan.summary.esmKg}
            />
            <CropCompositionPie plan={plan} />
          </div>
          <AllocationTable plan={plan} />
          <div className="grid gap-6 lg:grid-cols-2">
            <OptimizerCurve plan={plan} />
            <EventsPanel events={snapshot.events.slice(0, 4)} now={now} />
          </div>
        </div>

        <ActionFeed
          entries={snapshot.log}
          now={now}
          className="h-[calc(100vh-9rem)] xl:sticky xl:top-24"
        />
      </div>
    </main>
  );
}
