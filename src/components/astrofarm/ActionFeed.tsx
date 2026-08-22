import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { clockTime, relativeTime } from "@/lib/astrofarm/format";
import type { AgentAction, AgentLogEntry } from "@/lib/astrofarm/types";

const ACTION_META: Record<AgentAction, { label: string; tone: string }> = {
  event_received: { label: "event", tone: "text-muted-foreground border-border-strong" },
  replanned: { label: "replanned", tone: "text-primary border-primary/40" },
  evaluated_no_change: { label: "no change", tone: "text-muted-foreground border-border-strong" },
  narrated: { label: "narrated", tone: "text-accent border-accent/40" },
  parsed_report: { label: "parsed", tone: "text-accent border-accent/40" },
  answered_question: { label: "answered", tone: "text-accent border-accent/40" },
  heartbeat: { label: "heartbeat", tone: "text-success border-success/40" },
  seeded: { label: "seeded", tone: "text-muted-foreground border-border-strong" },
};

interface ActionFeedProps {
  entries: AgentLogEntry[];
  now: number;
  className?: string;
}

export function ActionFeed({ entries, now, className }: ActionFeedProps) {
  return (
    <section className={`panel flex min-h-0 flex-col ${className ?? ""}`}>
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Autonomous action log</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            agentLog — reverse chronological, written without a human present
          </p>
        </div>
        <span className="metric text-xs text-muted-foreground">{entries.length} entries</span>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <ol className="divide-y divide-border">
          {entries.map((entry) => {
            const meta = ACTION_META[entry.action];
            return (
              <li key={entry.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="metric text-xs text-muted-foreground">
                    {clockTime(entry.ts)}
                  </span>
                  <Badge variant="outline" className={`metric text-[10px] ${meta.tone}`}>
                    {meta.label}
                  </Badge>
                  {entry.planVersion ? (
                    <span className="metric text-[11px] text-muted-foreground">
                      v{entry.planVersion}
                    </span>
                  ) : null}
                  <span className="metric ml-auto text-[11px] text-muted-foreground">
                    {relativeTime(entry.ts, now)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-snug text-foreground">{entry.detail}</p>
                {entry.latencyMs !== undefined || entry.tokensGenerated !== undefined ? (
                  <p className="metric mt-1 text-[11px] text-muted-foreground">
                    {entry.latencyMs !== undefined ? `${entry.latencyMs} ms` : null}
                    {entry.tokensGenerated !== undefined
                      ? ` · ${entry.tokensGenerated} tok local`
                      : null}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      </ScrollArea>
    </section>
  );
}
