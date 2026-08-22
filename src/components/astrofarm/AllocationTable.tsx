import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CROPS_BY_KEY, getProfile } from "@/lib/astrofarm/data";
import { cropEsm, esmTotal } from "@/lib/astrofarm/model";
import { num, signed } from "@/lib/astrofarm/format";
import type { Plan } from "@/lib/astrofarm/types";

export function AllocationTable({ plan }: { plan: Plan }) {
  const profile = getProfile(plan.profileKey);
  const previousAreas = new Map(
    (plan.diffFromPrevious?.resized ?? []).map((r) => [r.cropKey, r.fromM2]),
  );
  const added = new Set(plan.diffFromPrevious?.added ?? []);

  const rows = plan.allocations
    .flatMap((allocation) => {
      const crop = CROPS_BY_KEY[allocation.cropKey];
      if (!crop) return [];
      const esm = esmTotal(cropEsm(allocation.cropKey, allocation.areaM2, profile));
      const kcalPerDay = crop.yieldKgPerM2PerDay * allocation.areaM2 * crop.kcalPerKg;
      return [{ allocation, crop, esm, kcalPerDay }];
    })
    .sort((a, b) => b.esm - a.esm);

  return (
    <section className="panel overflow-hidden">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Allocation — plan v{plan.version}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {profile.name} · {profile.missionDays} days · crew of {profile.crew}
          </p>
        </div>
        <span className="metric text-xs text-muted-foreground">
          {rows.length} crops · {num(plan.summary.areaUsedM2, 0)} m² planted
        </span>
      </header>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="label-caps">Crop</TableHead>
              <TableHead className="label-caps text-right">Area m²</TableHead>
              <TableHead className="label-caps text-right">Δ area</TableHead>
              <TableHead className="label-caps text-right">kcal/day</TableHead>
              <TableHead className="label-caps text-right">ESM kg-eq</TableHead>
              <TableHead className="label-caps text-right">Power kW</TableHead>
              <TableHead className="label-caps text-right">Crew h/wk</TableHead>
              <TableHead className="label-caps text-right">Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ allocation, crop, esm, kcalPerDay }) => {
              const from = previousAreas.get(crop.key);
              return (
                <TableRow key={crop.key} className="border-border">
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{crop.name}</span>
                      {added.has(crop.key) ? (
                        <Badge
                          variant="outline"
                          className="metric border-primary/40 text-[10px] text-primary"
                        >
                          new
                        </Badge>
                      ) : null}
                    </div>
                    <span className="metric text-[11px] text-muted-foreground">
                      {crop.category} · {crop.cycleDays}d cycle · {num(crop.heightM, 2)} m canopy
                    </span>
                  </TableCell>
                  <TableCell className="metric text-right text-sm">
                    {num(allocation.areaM2, 1)}
                  </TableCell>
                  <TableCell
                    className={`metric text-right text-sm ${
                      from === undefined
                        ? "text-muted-foreground"
                        : allocation.areaM2 > from
                          ? "text-success"
                          : "text-destructive"
                    }`}
                  >
                    {from === undefined ? "—" : signed(allocation.areaM2 - from, 1)}
                  </TableCell>
                  <TableCell className="metric text-right text-sm">
                    {num(kcalPerDay, 0)}
                  </TableCell>
                  <TableCell className="metric text-right text-sm">{num(esm, 0)}</TableCell>
                  <TableCell className="metric text-right text-sm text-muted-foreground">
                    {num(crop.powerKwPerM2 * allocation.areaM2, 2)}
                  </TableCell>
                  <TableCell className="metric text-right text-sm text-muted-foreground">
                    {num(crop.crewHrPerM2PerWeek * allocation.areaM2, 1)}
                  </TableCell>
                  <TableCell className="metric text-right text-sm text-muted-foreground">
                    {num(crop.riskScore, 2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {plan.diffFromPrevious && plan.diffFromPrevious.removed.length > 0 ? (
        <footer className="border-t border-border px-5 py-3">
          <span className="label-caps">Dropped this revision</span>
          <span className="metric ml-3 text-sm text-destructive">
            {plan.diffFromPrevious.removed
              .map((key) => CROPS_BY_KEY[key]?.name ?? key)
              .join(", ")}
          </span>
        </footer>
      ) : null}
    </section>
  );
}
