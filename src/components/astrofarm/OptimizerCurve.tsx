import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { num } from "@/lib/astrofarm/format";
import type { Plan } from "@/lib/astrofarm/types";

export function OptimizerCurve({ plan }: { plan: Plan }) {
  const data = plan.optimizerHistory.map((point) => ({
    step: point.step,
    esm: Number(point.esmKg.toFixed(0)),
    coverage: Number((point.kcalCoverage * 100).toFixed(1)),
  }));

  return (
    <section className="panel px-5 py-4">
      <header>
        <h2 className="text-sm font-semibold text-foreground">Diminishing returns</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          optimizerHistory — calorie coverage vs ESM spent, per greedy step
        </p>
      </header>

      <div className="mt-4 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="esm"
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border-strong)",
                borderRadius: "8px",
                fontSize: 12,
              }}
              labelFormatter={(label: number) => `${num(label, 0)} kg-eq spent`}
              formatter={(value: number) => [`${value}%`, "calorie coverage"]}
            />
            <Line
              type="monotone"
              dataKey="coverage"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "var(--color-primary)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        The curve flattens well before the budget is exhausted — the last third of the mass buys
        variety and risk cover, not calories.
      </p>
    </section>
  );
}
