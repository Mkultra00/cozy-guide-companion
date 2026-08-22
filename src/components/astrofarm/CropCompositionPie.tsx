import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CROPS_BY_KEY } from "@/lib/astrofarm/data";
import { num, pct } from "@/lib/astrofarm/format";
import type { CropCategory, Plan } from "@/lib/astrofarm/types";

const CATEGORY_COLORS: Record<CropCategory, string> = {
  leafy: "var(--color-chart-1)",
  fruiting: "var(--color-chart-2)",
  root: "var(--color-chart-3)",
  grain: "var(--color-chart-4)",
  legume: "var(--color-chart-5)",
  algae: "var(--color-chart-6, var(--color-chart-3))",
};

interface CropCompositionPieProps {
  plan: Plan;
}

export function CropCompositionPie({ plan }: CropCompositionPieProps) {
  const totalArea = plan.allocations.reduce((sum, a) => sum + a.areaM2, 0);

  const data = plan.allocations
    .map((allocation) => {
      const crop = CROPS_BY_KEY[allocation.cropKey];
      return {
        name: crop?.name ?? allocation.cropKey,
        category: crop?.category ?? "leafy",
        value: allocation.areaM2,
        share: allocation.areaM2 / totalArea,
      };
    })
    .sort((a, b) => b.value - a.value);

  const dominant = data[0];

  return (
    <section className="panel px-5 py-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Crop composition by area
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            How the {num(totalArea, 0)} m² planted area is split across crops
          </p>
        </div>
        {dominant ? (
          <p className="metric text-xs text-muted-foreground">
            {dominant.name} is {pct(dominant.share)} of planted area
          </p>
        ) : null}
      </header>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-56 w-full sm:h-56 sm:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={88}
                paddingAngle={1.5}
                stroke="var(--color-panel)"
                strokeWidth={2}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={CATEGORY_COLORS[entry.category]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border-strong)",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
                formatter={(value: number, _name, item) => [
                  `${num(value, 1)} m² (${pct(
                    (item?.payload as { share: number }).share,
                  )})`,
                  "Area",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="grid flex-1 gap-1.5 sm:grid-cols-1">
          {data.map((entry) => (
            <li
              key={entry.name}
              className="flex items-center gap-2"
            >
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: CATEGORY_COLORS[entry.category] }}
                aria-hidden
              />
              <span className="text-xs text-foreground">{entry.name}</span>
              <span className="metric ml-auto text-xs text-muted-foreground">
                {num(entry.value, 1)} m² · {pct(entry.share)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
