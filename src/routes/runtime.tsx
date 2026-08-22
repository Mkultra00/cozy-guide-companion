import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/runtime")({
  head: () => ({
    meta: [
      { title: "Runtime Topology & Build Order — AstroFarm" },
      {
        name: "description",
        content:
          "Everything runs on one box: mongod replica set, local model server, the agent worker, and a locally served UI. Collections, the agent loop, build order, and the known traps.",
      },
      { property: "og:title", content: "Runtime Topology & Build Order — AstroFarm" },
      {
        property: "og:description",
        content:
          "The GB10 process map, MongoDB collections, the change-stream agent loop, the scoring rubric, and the traps that break a local-first demo.",
      },
    ],
  }),
  component: RuntimePage,
});

const TOPOLOGY = `┌──────────────── Dell Pro Max / GB10 ────────────────┐
│                                                     │
│  mongod --replSet rs0        :27017   state + change streams
│  model server (vLLM)         :8000    Qwen3.6-35B-A3B-NVFP4
│  agent worker (python)                the always-on loop
│  static UI server            :5173    vite build, served locally
│                                                     │
└─────────────────────────────────────────────────────┘
              no egress — verified by unplugging`;

const RUBRIC = [
  {
    criterion: "Local-first + always-on",
    weight: "30%",
    where: "Agent worker + change-stream trigger + persistent action log, all on the GB10",
  },
  {
    criterion: "Business value",
    weight: "30%",
    where: "Named buyer, named workflow, stated impact metric — see the Brief",
  },
  { criterion: "Demo + pitch", weight: "30%", where: "Five-minute running order on the Brief" },
  {
    criterion: "Technical execution",
    weight: "10%",
    where: "Mongo Community required-stack compliance; offline-verified demo",
  },
];

const COLLECTIONS = [
  {
    name: "crops",
    contents: "The 15 rows of Table 5. Seeded once.",
    writer: "Seed script",
  },
  {
    name: "missionProfiles",
    contents: "The 3 ESM profiles of Table 2. Seeded once.",
    writer: "Seed script",
  },
  {
    name: "constraintEvents",
    contents: "Incoming changes to mission reality. This is the trigger collection.",
    writer: "Injector / UI / simulated feed",
  },
  {
    name: "plans",
    contents: "Every allocation the agent has produced, versioned, never overwritten.",
    writer: "Agent",
  },
  {
    name: "agentLog",
    contents: "One document per autonomous action, with timestamp and rationale.",
    writer: "Agent",
  },
];

const LOOP = `def agent():
    seed_if_empty()
    watch = db.constraintEvents.watch([{'$match': {'operationType': 'insert'}}])
    heartbeat_every(300)           # periodic re-evaluation even with no events

    for change in watch:
        event = change['fullDocument']
        log('event_received', event['kind'])

        state   = apply_event(current_state(), event)
        newplan = optimize(crops, profile, state.budgets, state.weights)
        diff    = diff_plans(current_plan(), newplan)

        if diff.is_material():     # ESM ±2% or any crop added/removed
            rationale = narrate(diff, newplan, event)          # LOCAL model call
            db.plans.insert_one({**newplan, 'rationale': rationale})
            log('replanned', diff.summary, plan_version=newplan.version)
        else:
            log('evaluated_no_change', diff.summary)

        db.constraintEvents.update_one(
            {'_id': event['_id']}, {'$set': {'processed': True}})`;

const BUILD_ORDER = [
  {
    step: 1,
    deliverable: "mongod --replSet rs0 up, rs.initiate() run, crops + missionProfiles seeded",
    risk: "Blocks everything. Do first.",
    done: true,
  },
  {
    step: 2,
    deliverable: "Model server up on the box, generating, GPU utilization visible",
    risk: "Blocks all narration.",
    done: true,
  },
  {
    step: 3,
    deliverable: "Port the Python reference model as-is; verify 1 m² lettuce → ESM 223.8",
    risk: "Regression risk.",
    done: true,
  },
  {
    step: 4,
    deliverable: "Agent worker: change stream → optimize → write plans + agentLog",
    risk: "This is the 30% criterion. Nothing else matters more.",
    done: true,
  },
  {
    step: 5,
    deliverable: "Narration via the local model",
    risk: "Converts a solver into an agent.",
    done: true,
  },
  {
    step: 6,
    deliverable: "UI: action feed + summary cards + allocation table",
    risk: "Demo legibility.",
    done: true,
  },
  { step: 7, deliverable: "ESM stacked-bar breakdown", risk: "The memorable visual.", done: true },
  {
    step: 8,
    deliverable: "Plain-English event parsing",
    risk: "Best single demo beat.",
    done: true,
  },
  { step: 9, deliverable: "History Q&A over plans + agentLog", risk: "Proves memory.", done: true },
  {
    step: 10,
    deliverable: "Heartbeat + seeded backlog so the feed is populated before judging",
    risk: "Cheap, high impact. Start the agent an hour early.",
    done: true,
  },
];

const TRAPS = [
  "Standalone mongod breaks change streams. Single-node replica set, rs.initiate(), verified before any agent code is written.",
  "arm64 images. The GB10 is aarch64 — the Mongo image and Python driver are cached locally, not pulled over venue wifi.",
  "Split infrastructure. Mongo on a laptop and the model on the box doubles the failure surface. Everything on one box.",
  "Hosted UI. The built bundle is served from the GB10, so pulling the network cable does not kill the app.",
  "LLM doing arithmetic. The solver produces every number; the model only produces prose.",
  "Empty action feed. An agent with no history looks like a script — hence the seeded backlog.",
];

function RuntimePage() {
  return (
    <main className="mx-auto max-w-[1100px] space-y-8 px-6 py-8">
      <header className="space-y-2">
        <p className="label-caps">Runtime</p>
        <h1 className="text-3xl font-semibold text-foreground">Everything on one box</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          The optimizer is not the product. It is a deterministic tool the agent calls. The product is
          the agent that decides when to call it and explains what changed.
        </p>
      </header>

      <section className="panel overflow-hidden">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Process map</h2>
        </header>
        <pre className="metric overflow-x-auto px-5 py-4 text-[11px] leading-relaxed text-muted-foreground">
          {TOPOLOGY}
        </pre>
        <ul className="space-y-2 border-t border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          <li>
            <span className="text-foreground">Replica set, not standalone.</span> Change streams do
            not work on a standalone mongod and fail with a confusing error.
          </li>
          <li>
            <span className="text-foreground">The UI is served from the box.</span> A hosted bundle
            dies the moment the network is pulled — the exact moment local-first is being proven.
          </li>
          <li>
            <span className="text-foreground">No cloud model calls at runtime.</span> Building with a
            cloud tool is fine; any hosted inference call at runtime forfeits the criterion.
          </li>
        </ul>
      </section>

      <section className="panel overflow-hidden">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">State layer — database astrofarm</h2>
        </header>
        <div className="divide-y divide-border">
          {COLLECTIONS.map((collection) => (
            <div
              key={collection.name}
              className="grid gap-1 px-5 py-3.5 sm:grid-cols-[180px_minmax(0,1fr)_180px] sm:items-baseline sm:gap-4"
            >
              <p className="metric text-xs text-primary">{collection.name}</p>
              <p className="text-sm leading-snug text-foreground">{collection.contents}</p>
              <p className="metric text-[11px] text-muted-foreground sm:text-right">
                written by {collection.writer}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">The agent loop</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The heartbeat keeps the feed alive with no events; logging the no-change case is what
            shows continuous operation.
          </p>
        </header>
        <pre className="metric overflow-x-auto px-5 py-4 text-[11px] leading-relaxed text-muted-foreground">
          {LOOP}
        </pre>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel overflow-hidden">
          <header className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Scored against</h2>
          </header>
          <div className="divide-y divide-border">
            {RUBRIC.map((row) => (
              <div key={row.criterion} className="px-5 py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{row.criterion}</p>
                  <p className="metric text-xs text-primary">{row.weight}</p>
                </div>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{row.where}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <header className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Known traps</h2>
          </header>
          <ul className="divide-y divide-border">
            {TRAPS.map((trap) => (
              <li key={trap} className="px-5 py-3 text-sm leading-snug text-muted-foreground">
                {trap}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Build order</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ordered so the highest-scoring components exist earliest — stop anywhere and the demo
            still holds.
          </p>
        </header>
        <ol className="divide-y divide-border">
          {BUILD_ORDER.map((item) => (
            <li
              key={item.step}
              className="grid gap-1 px-5 py-3.5 sm:grid-cols-[40px_minmax(0,1fr)_260px] sm:items-baseline sm:gap-4"
            >
              <span className="metric text-xs text-muted-foreground">{item.step}</span>
              <span className="text-sm leading-snug text-foreground">{item.deliverable}</span>
              <span className="metric text-[11px] leading-snug text-muted-foreground">
                {item.risk}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
