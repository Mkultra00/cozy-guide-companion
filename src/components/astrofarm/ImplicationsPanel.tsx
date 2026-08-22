import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, RefreshCw, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildPlanDigest } from "@/lib/astrofarm/digest";
import { interpretSnapshot, type Interpretation } from "@/lib/astrofarm/interpret.functions";
import type { ConsoleSnapshot, Plan } from "@/lib/astrofarm/types";

export function ImplicationsPanel({
  snapshot,
  plan,
}: {
  snapshot: ConsoleSnapshot;
  plan: Plan;
}) {
  const interpret = useServerFn(interpretSnapshot);
  const [result, setResult] = useState<Interpretation | null>(null);

  const mutation = useMutation({
    mutationFn: () => interpret({ data: { digest: buildPlanDigest(snapshot, plan) } }),
    onSuccess: setResult,
  });

  return (
    <section className="panel px-5 py-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="size-4 text-primary" aria-hidden />
            What this plan implies
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Reads the current allocation, ESM breakdown, budgets and events, then interprets them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {result ? (
            <Badge variant="outline" className="metric border-primary/40 text-primary">
              confidence {result.confidence}
            </Badge>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" aria-hidden /> Analyzing
              </>
            ) : result ? (
              "Re-analyze"
            ) : (
              "Explain plan"
            )}
          </Button>
        </div>
      </header>

      {mutation.isError ? (
        <p className="mt-4 flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {(mutation.error as Error).message}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-4">
          <p className="border-l-2 border-primary/50 pl-4 text-sm leading-relaxed text-foreground">
            {result.headline}
          </p>

          <div>
            <p className="label-caps">Implications</p>
            <ul className="mt-2 space-y-2">
              {result.implications.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-foreground">
                  <span className="metric text-xs text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {result.watchItems.length > 0 ? (
            <div>
              <p className="label-caps">Watch next</p>
              <ul className="mt-2 space-y-1.5">
                {result.watchItems.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="text-warning" aria-hidden>
                      ▸
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : !mutation.isPending && !mutation.isError ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Run an interpretation to turn plan v{plan.version}&apos;s numbers into a plain reading of
          what is binding, what is fragile, and what breaks next.
        </p>
      ) : null}
    </section>
  );
}
