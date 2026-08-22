import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { snapshotQuery } from "@/lib/astrofarm/client";
import { esmPerKcal, cropEsm, esmTotal } from "@/lib/astrofarm/model";
import { REFERENCE_PROFILE } from "@/lib/astrofarm/data";
import { num } from "@/lib/astrofarm/format";

export const Route = createFileRoute("/library")({
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQuery),
  head: () => ({
    meta: [
      { title: "Crop Library & Mission Profiles — AstroFarm" },
      {
        name: "description",
        content:
          "The 15-crop library and three ESM mission profiles the AstroFarm optimizer draws from, ranked by equivalent system mass per edible calorie.",
      },
      { property: "og:title", content: "Crop Library & Mission Profiles — AstroFarm" },
      {
        property: "og:description",
        content:
          "Seeded crop coefficients and ESM equivalency factors, ranked by kg-eq per edible calorie.",
      },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { data: snapshot } = useSuspenseQuery(snapshotQuery);
  const profile = REFERENCE_PROFILE;

  const rows = snapshot.crops
    .map((crop) => ({
      crop,
      esmPerM2: esmTotal(cropEsm(crop.key, 1, profile)),
      costPerKcal: esmPerKcal(crop.key, profile),
    }))
    .sort((a, b) => a.costPerKcal - b.costPerKcal);

  return (
    <main className="mx-auto max-w-[1400px] space-y-6 px-6 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Crop library & mission profiles</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Audited Table 5 / Table 2 values, seeded once and read by the optimizer on every re-plan.
          Ranking is against the ISS-class orbital reference profile: 1 m² of lettuce over a year
          lands at ESM ≈ 223.8 kg-eq, 58% of it pressurized volume.
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {snapshot.profiles.map((p) => (
          <article key={p.key} className="panel px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">{p.name}</h2>
            <p className="metric mt-1 text-xs text-muted-foreground">
              {p.missionDays} days · crew of {p.crew}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              <Eq label="volume" value={`${p.volumeEq} kg/m³`} />
              <Eq label="power" value={`${p.powerEq} kg/kW`} />
              <Eq label="cooling" value={`${p.coolingEq} kg/kW`} />
              <Eq label="crew time" value={`${p.crewTimeEq} kg/h`} />
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{p.notes}</p>
          </article>
        ))}
      </section>

      <section className="panel overflow-hidden">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            15 crops, ranked by ESM per edible calorie
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Short crops beat nominally efficient ones because pressurized volume dominates.
          </p>
        </header>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="label-caps">Crop</TableHead>
                <TableHead className="label-caps text-right">kg/m²/day</TableHead>
                <TableHead className="label-caps text-right">kcal/kg</TableHead>
                <TableHead className="label-caps text-right">protein g/kg</TableHead>
                <TableHead className="label-caps text-right">vitScore</TableHead>
                <TableHead className="label-caps text-right">canopy m</TableHead>
                <TableHead className="label-caps text-right">kW/m²</TableHead>
                <TableHead className="label-caps text-right">crew h/m²/wk</TableHead>
                <TableHead className="label-caps text-right">ESM/m²</TableHead>
                <TableHead className="label-caps text-right">kg-eq per kcal/day</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ crop, esmPerM2, costPerKcal }) => (
                <TableRow key={crop.key} className="border-border">
                  <TableCell className="py-3">
                    <span className="text-sm font-medium text-foreground">{crop.name}</span>
                    <span className="metric block text-[11px] text-muted-foreground">
                      {crop.family} · {crop.category} · {crop.cycleDays}d · CRL {crop.crl} · DLI{" "}
                      {crop.dli} · risk {num(crop.riskScore, 3)}
                    </span>
                  </TableCell>
                  <Num value={num(crop.yieldKgPerM2PerDay, 3)} />
                  <Num value={num(crop.kcalPerKg, 0)} />
                  <Num value={num(crop.proteinGPerKg, 0)} />
                  <Num value={num(crop.vitScore, 1)} />
                  <Num value={num(crop.heightM, 2)} />
                  <Num value={num(crop.powerKwPerM2, 2)} />
                  <Num value={num(crop.crewHrPerM2PerWeek, 2)} />
                  <Num value={num(esmPerM2, 0)} />
                  <TableCell className="metric text-right text-sm text-primary">
                    {num(costPerKcal, 2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
}

function Num({ value }: { value: string }) {
  return <TableCell className="metric text-right text-sm text-muted-foreground">{value}</TableCell>;
}

function Eq({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-caps">{label}</dt>
      <dd className="metric text-xs text-foreground">{value}</dd>
    </div>
  );
}
