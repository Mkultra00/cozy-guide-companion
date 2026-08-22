import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/brief")({
  head: () => ({
    meta: [
      { title: "Buyer, Workflow, Impact — AstroFarm Brief" },
      {
        name: "description",
        content:
          "Who buys AstroFarm, the ESM trade-study workflow it replaces, why re-plan latency drops from days to seconds, and why the whole stack must run locally.",
      },
      { property: "og:title", content: "Buyer, Workflow, Impact — AstroFarm Brief" },
      {
        property: "og:description",
        content:
          "The buyer, the spreadsheet workflow replaced, the impact metric, and the local-first requirement — plus the five-minute demo running order.",
      },
    ],
  }),
  component: BriefPage,
});

const RUN_ORDER = [
  {
    time: "0:00–0:30",
    title: "The broken workflow",
    body: "A systems engineer re-runs an ESM trade study by hand every time a constraint moves. Name the buyer immediately.",
  },
  {
    time: "0:30–1:00",
    title: "Pull the network cable",
    body: "The action log is already full of autonomous entries from the last twenty minutes. Nobody was driving this.",
  },
  {
    time: "1:00–2:30",
    title: "Inject a constraint in plain English",
    body: "Power drops to 8 kW, spirulina tray contaminated. The agent parses it into two events, re-optimizes, writes v4, and narrates. nvidia-smi on the second window.",
  },
  {
    time: "2:30–3:30",
    title: "The teaching visual",
    body: "The ESM breakdown: pressurized volume is the majority of the cost, not power. Short crops beat efficient crops.",
  },
  {
    time: "3:30–4:15",
    title: "Ask it about its own history",
    body: "Why was a crop dropped three revisions ago? It answers from stored plans and the action log. Memory plus audit trail.",
  },
  {
    time: "4:15–5:00",
    title: "Close",
    body: "Buyer, workflow replaced, impact metric, why local is mandatory. Then stop talking.",
  },
];

function BriefPage() {
  return (
    <main className="mx-auto max-w-[1000px] space-y-8 px-6 py-8">
      <header className="space-y-2">
        <p className="label-caps">Positioning</p>
        <h1 className="text-3xl font-semibold text-foreground">
          Constrained capacity planning under changing constraints
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Space agriculture is the demo vertical. The engine is general, but the pitch stays on one
          vertical — adjacent markets read as an unbuilt roadmap.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card
          label="Who buys it"
          body="Commercial space station operators and their life-support subcontractors — the companies building crewed platforms who must justify every kilogram of payload to a customer. A live procurement category, not a hypothetical."
        />
        <Card
          label="Workflow replaced"
          body="ESM trade studies done in spreadsheets by systems engineers, re-run manually every time a power budget, mission duration, or payload manifest changes. Days of engineer time per revision."
        />
        <Card
          label="Measurable impact"
          body="Re-plan latency drops from days to seconds, and every revision is version-controlled with a written rationale attached — which is what turns a trade study into an auditable design record."
        />
        <Card
          label="Why it must be local"
          body="Payload mass budgets and life-support architecture are competitively sensitive and frequently ITAR-controlled. This class of data does not go to a cloud API."
        />
      </section>

      <section className="panel px-5 py-5">
        <h2 className="text-sm font-semibold text-foreground">Five-minute running order</h2>
        <ol className="mt-4 space-y-4">
          {RUN_ORDER.map((beat) => (
            <li key={beat.time} className="flex flex-col gap-1 sm:flex-row sm:gap-6">
              <span className="metric w-28 shrink-0 text-xs text-primary">{beat.time}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{beat.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{beat.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel px-5 py-5">
        <h2 className="text-sm font-semibold text-foreground">Where the local model is used</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            <span className="text-foreground">Narrating the diff.</span> Three to five sentences on
            what changed, why, which constraint now binds, and what to negotiate for.
          </li>
          <li>
            <span className="text-foreground">Parsing unstructured ops reports</span> into structured
            constraint events.
          </li>
          <li>
            <span className="text-foreground">Answering questions against plan history</span> from
            stored plans and the action log.
          </li>
          <li>
            The solver produces every number. The model never does arithmetic — asked to compute ESM
            it would be confidently wrong on stage.
          </li>
        </ul>
      </section>

      <section className="panel px-5 py-5">
        <h2 className="text-sm font-semibold text-foreground">Stated error bars</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>Energy is under-counted by roughly an order of magnitude — lighting plus a small auxiliary term, no HVAC or dehumidification.</li>
          <li>No CO₂/O₂ gas-exchange accounting.</li>
          <li>vitScore is a subjective composite and the least defensible number in the dataset.</li>
          <li>Yields are best-case with no loss modeling; risk scores never feed back into expected yield.</li>
          <li>
            This console is a read-only view. The Mongo state layer, change-stream trigger, and local
            model server run on the box; crop coefficients here are a reconstruction until the
            audited tables are wired in.
          </li>
        </ul>
      </section>
    </main>
  );
}

function Card({ label, body }: { label: string; body: string }) {
  return (
    <article className="panel px-5 py-4">
      <p className="label-caps">{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{body}</p>
    </article>
  );
}
