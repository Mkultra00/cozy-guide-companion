import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AGENT_ENDPOINT, snapshotQuery } from "@/lib/astrofarm/client";
import { relativeTime } from "@/lib/astrofarm/format";
import type { CrewBriefing, Tray, TrayStatus } from "@/lib/astrofarm/types";
import { useNow } from "@/hooks/use-now";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/habitat")({
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQuery),
  head: () => ({
    meta: [
      { title: "AstroFarm Habitat — Crew Tablet" },
      {
        name: "description",
        content:
          "Crew-facing tablet view of the AstroFarm habitat: today's spoken briefing, trays ready to harvest, and the tending schedule for all twelve trays.",
      },
      { property: "og:title", content: "AstroFarm Habitat — Crew Tablet" },
      {
        property: "og:description",
        content:
          "What to pick today and what is coming due, written for an astronaut holding a tablet in the habitat.",
      },
    ],
  }),
  component: HabitatPage,
});

const STATUS_STYLE: Record<TrayStatus, { bar: string; text: string; border: string }> = {
  overdue: { bar: "bg-destructive", text: "text-destructive", border: "border-destructive/50" },
  ready: { bar: "bg-success", text: "text-success", border: "border-success/50" },
  due_soon: { bar: "bg-warning", text: "text-warning", border: "border-warning/50" },
  growing: { bar: "bg-muted-foreground", text: "text-muted-foreground", border: "border-border" },
  harvested: { bar: "bg-muted", text: "text-muted-foreground", border: "border-border" },
};

function HabitatPage() {
  const { data: snapshot } = useSuspenseQuery(snapshotQuery);
  const now = useNow();
  const queryClient = useQueryClient();

  const briefing = snapshot.crewBriefing;
  const trays = [...snapshot.trays].sort((a, b) => a.daysRemaining - b.daysRemaining);
  const actionable = trays.filter((t) => t.status === "overdue" || t.status === "ready");
  const active = trays.filter((t) => t.status !== "harvested");
  const harvested = trays.filter((t) => t.status === "harvested");

  const [dismissed, setDismissed] = useState<string[]>([]);
  const proposals = trays.filter(
    (t) => t.replantProposal && !dismissed.includes(t.trayId),
  );

  const harvest = useMutation({
    mutationFn: async (trayId: string) => {
      const response = await fetch(`${AGENT_ENDPOINT}/harvest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trayId }),
      });
      if (!response.ok) throw new Error(`Agent returned ${response.status}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: snapshotQuery.queryKey }),
  });

  const replant = useMutation({
    mutationFn: async (trayId: string) => {
      const response = await fetch(`${AGENT_ENDPOINT}/replant`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trayId }),
      });
      if (!response.ok) throw new Error(`Agent returned ${response.status}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: snapshotQuery.queryKey }),
  });

  const crewMinutesToday =
    briefing?.facts.crewMinutesToday ?? active.reduce((sum, t) => sum + t.crewMinToday, 0);
  const traysActive = briefing?.facts.traysActive ?? active.length;
  const kcalPct = briefing?.facts.kcalCoveragePct ?? null;

  return (
    <TooltipProvider delayDuration={100}>
      <main className="mx-auto max-w-3xl space-y-8 px-5 py-8 pb-16">
        <h1 className="text-3xl font-semibold text-foreground">Habitat</h1>

        {/* 1. Briefing */}
        {briefing ? <Briefing briefing={briefing} now={now} /> : null}

        {/* 2. Action row */}
        <section className="space-y-4">
          {actionable.length === 0 ? (
            <p className="text-lg text-muted-foreground">Nothing to pick today.</p>
          ) : (
            actionable.map((tray) => (
              <ActionCard
                key={tray.trayId}
                tray={tray}
                connected={Boolean(AGENT_ENDPOINT)}
                pending={harvest.isPending && harvest.variables === tray.trayId}
                onHarvest={() => harvest.mutate(tray.trayId)}
              />
            ))
          )}
        </section>

        {/* 2b. Pending replant proposals — the agent asking, not telling */}
        {proposals.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Waiting on you</h2>
            {proposals.map((tray) => (
              <ProposalCard
                key={tray.trayId}
                tray={tray}
                now={now}
                connected={Boolean(AGENT_ENDPOINT)}
                pending={replant.isPending && replant.variables === tray.trayId}
                onPlant={() => replant.mutate(tray.trayId)}
                onDismiss={() => setDismissed((prev) => [...prev, tray.trayId])}
              />
            ))}
          </section>
        ) : null}

        {/* 3. Tray grid */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[...active, ...harvested].map((tray) => (
            <TrayTile key={tray.trayId} tray={tray} />
          ))}
        </section>

        {/* 4. Today strip */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat value={`${crewMinutesToday} min`} label="of tending today" />
          <Stat value={`${traysActive}`} label="trays active" />
          <Stat
            value={kcalPct === null ? "—" : `${kcalPct}%`}
            label="of crew calories"
          />
        </section>

        {/* 5. Footer link */}
        <Link to="/" className="block text-sm text-muted-foreground hover:text-foreground">
          Planner view →
        </Link>
      </main>
    </TooltipProvider>
  );
}

function Briefing({ briefing, now }: { briefing: CrewBriefing; now: number }) {
  const offline = briefing.text.startsWith("[local model unavailable");
  const f = briefing.facts;

  return (
    <section className="panel space-y-4 px-6 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="label-caps">Updated {relativeTime(briefing.ts, now)}</p>
        {offline ? (
          <span className="metric rounded-md border border-warning/40 px-2 py-0.5 text-[11px] text-warning">
            assistant offline
          </span>
        ) : null}
      </div>

      {offline ? (
        <ul className="space-y-2 text-lg leading-relaxed text-foreground">
          {f.readyNow.map((r) => (
            <li key={r.tray}>
              {r.tray} {r.crop} — {r.kg} kg ready
              {r.daysLate > 0 ? `, ${r.daysLate} days late` : ""}
            </li>
          ))}
          {f.dueWithin3Days.map((d) => (
            <li key={d.tray}>
              {d.tray} {d.crop} — due in {d.inDays} days
            </li>
          ))}
          <li>{f.crewMinutesToday} min of tending across {f.traysActive} active trays</li>
          {f.planVersion ? (
            <li>
              Plan v{f.planVersion}
              {f.bindingConstraint ? ` · ${f.bindingConstraint} binding` : ""}
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="text-xl leading-relaxed text-foreground">{briefing.text}</p>
      )}
    </section>
  );
}

function ActionCard({
  tray,
  connected,
  pending,
  onHarvest,
}: {
  tray: Tray;
  connected: boolean;
  pending: boolean;
  onHarvest: () => void;
}) {
  const style = STATUS_STYLE[tray.status];
  const daysLate = tray.daysRemaining < 0 ? Math.abs(tray.daysRemaining) : 0;

  return (
    <div
      className={cn(
        "panel flex flex-wrap items-center gap-4 border px-5 py-5",
        style.border,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="metric text-sm text-muted-foreground">{tray.trayId}</p>
        <p className="text-2xl font-semibold text-foreground">{tray.cropName}</p>
        <p className="metric mt-1 text-sm text-muted-foreground">
          {tray.expectedKg.toFixed(1)} kg expected
          {daysLate > 0 ? (
            <span className="text-destructive"> · {daysLate} days late</span>
          ) : null}
        </p>
      </div>

      {connected ? (
        <Button size="lg" className="h-14 px-8 text-base" disabled={pending} onClick={onHarvest}>
          {pending ? "Marking…" : "Mark harvested"}
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button size="lg" className="h-14 px-8 text-base" disabled>
                Mark harvested
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Agent not connected.</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function ProposalCard({
  tray,
  now,
  connected,
  pending,
  onPlant,
  onDismiss,
}: {
  tray: Tray;
  now: number;
  connected: boolean;
  pending: boolean;
  onPlant: () => void;
  onDismiss: () => void;
}) {
  const proposal = tray.replantProposal!;

  return (
    <div className="rounded-lg border border-dashed border-primary/50 bg-primary/5 px-5 py-5">
      <p className="label-caps text-primary">
        {tray.trayId} · replant proposed {relativeTime(proposal.proposedAt, now)}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{proposal.cropName}</p>
      <p className="metric mt-1 text-sm text-muted-foreground">
        {proposal.areaM2.toFixed(1)} m² · {proposal.cycleDays}-day cycle
      </p>
      <p className="mt-3 text-base leading-relaxed text-foreground">{proposal.reason}</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {connected ? (
          <Button size="lg" className="h-14 px-8 text-base" disabled={pending} onClick={onPlant}>
            {pending ? "Sending…" : "Plant it"}
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button size="lg" className="h-14 px-8 text-base" disabled>
                  Plant it
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Agent not connected.</TooltipContent>
          </Tooltip>
        )}
        <Button
          size="lg"
          variant="outline"
          className="h-14 px-8 text-base"
          onClick={onDismiss}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}

function TrayTile({ tray }: { tray: Tray }) {
  const style = STATUS_STYLE[tray.status];
  const elapsed = Math.min(1, Math.max(0, 1 - tray.daysRemaining / tray.cycleDays));
  const label =
    tray.status === "harvested"
      ? "harvested"
      : tray.daysRemaining <= 0
        ? "ready"
        : `${tray.daysRemaining} days`;

  return (
    <div
      className={cn(
        "panel space-y-3 border px-4 py-4",
        style.border,
        tray.status === "harvested" && "opacity-45",
      )}
    >
      <div>
        <p className="metric text-xs text-muted-foreground">{tray.trayId}</p>
        <p className="truncate text-base font-medium text-foreground">{tray.cropName}</p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full", style.bar)}
          style={{ width: `${elapsed * 100}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className={cn("metric text-sm", style.text)}>{label}</p>
        {tray.replantProposal ? (
          <span className="metric rounded border border-primary/40 px-1.5 py-0.5 text-[10px] text-primary">
            replant?
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="panel px-5 py-5">
      <p className="metric text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
