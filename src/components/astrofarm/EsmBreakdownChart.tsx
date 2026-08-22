import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { esmSharePercent } from "@/lib/astrofarm/model";
import { kg, num } from "@/lib/astrofarm/format";
import type { EsmBreakdown } from "@/lib/astrofarm/types";

const COMPONENTS: { key: keyof EsmBreakdown; label: string; color: string }[] = [
  { key: "volume", label: "Pressurized volume", color: "var(--color-chart-1)" },
  { key: "power", label: "Power", color: "var(--color-chart-2)" },
  { key: "cooling", label: "Cooling", color: "var(--color-chart-3)" },
  { key: "crewTime", label: "Crew time", color: "var(--color-chart-4)" },
  { key: "mass", label: "Hardware mass", color: "var(--color-chart-5)" },
];

interface EsmBreakdownChartProps {
  breakdown: EsmBreakdown;
  totalEsm: number;
}

export function EsmBreakdownChart({ breakdown, totalEsm }: EsmBreakdownChartProps) {
  const shares = esmSharePercent(breakdown);
  const data = COMPONENTS.map((component) => ({
    name: component.label,
    value: Number(breakdown[component.key].toFixed(1)),
    share: shares[component.key],
    color: component.color,
  })).sort((a, b) => b.value - a.value);

  const dominant = data[0] ?? { name: "Pressurized volume", share: 0 };

  return (
    <section className="panel px-5 py-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Where the mass actually goes</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            ESM cost decomposition for the current allocation
          </p>
        </div>
        <p className="metric text-xs text-muted-foreground">
          {dominant.name.toLowerCase()} is {num(dominant.share, 0)}% of {kg(totalEsm)}
        </p>
      </header>

      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border-strong)",
                borderRadius: "8px",
                fontSize: 12,
              }}
              formatter={(value: number, _name, item) => [
                `${num(value, 0)} kg-eq (${num((item?.payload as { share: number }).share, 0)}%)`,
                "ESM",
              ]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {data.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="text-xs text-muted-foreground">{entry.name}</span>
            <span className="metric ml-auto text-xs text-foreground">{num(entry.share, 0)}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
