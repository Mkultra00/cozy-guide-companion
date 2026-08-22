import { Badge } from "@/components/ui/badge";
import { clockTime, relativeTime } from "@/lib/astrofarm/format";
import type { ConstraintEvent } from "@/lib/astrofarm/types";

export function EventsPanel({
  events,
  now,
}: {
  events: ConstraintEvent[];
  now: number;
}) {
  return (
    <section className="panel overflow-hidden">
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">Constraint event stream</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          constraintEvents — the change-stream trigger collection
        </p>
      </header>

      <ol className="divide-y divide-border">
        {events.map((event) => (
          <li key={event.id} className="px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="metric text-xs text-muted-foreground">{clockTime(event.ts)}</span>
              <Badge variant="outline" className="metric border-border-strong text-[10px]">
                {event.kind}
              </Badge>
              <span className="metric text-[11px] text-muted-foreground">
                source: {event.source}
              </span>
              <span
                className={`metric ml-auto text-[11px] ${
                  event.processed ? "text-success" : "text-warning"
                }`}
              >
                {event.processed ? "processed" : "pending"} · {relativeTime(event.ts, now)}
              </span>
            </div>
            <p className="metric mt-1.5 text-xs text-foreground">{JSON.stringify(event.payload)}</p>
            {event.rawText ? (
              <p className="mt-1.5 text-xs italic leading-snug text-muted-foreground">
                parsed from ops message: “{event.rawText}”
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
