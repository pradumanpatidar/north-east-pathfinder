import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Siren, Play, Save, RotateCcw, ArrowLeftRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { DemoNotice, PageHeader, RiskPill, ScoreBar, SectionCard, AccessPill } from "@/components/common";
import { MapPanel } from "@/components/MapPanel";
import { CityCombobox } from "@/components/CityCombobox";
import type { MapRoute } from "@/components/NerMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EMERGENCY_WEIGHTS,
  SCORE_WEIGHTS,
  VEHICLES,
  planRoutes,
  type CargoType,
  type RouteOption,
  type RouteRequest,
  type VehicleType,
} from "@/lib/ner/scoring";
import { cityById } from "@/lib/ner/geo";
import { incidentsBySegment } from "@/lib/ner/demo-data";
import { savePlan } from "@/lib/plan-store";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ demo: z.string().optional() });

export const Route = createFileRoute("/planner")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Smart Route Planner — NER-Route AI" },
      {
        name: "description",
        content:
          "Plan freight movement across the North East with three scored alternatives and an explainable safety-weighted recommendation.",
      },
      { property: "og:title", content: "Smart Route Planner — NER-Route AI" },
      {
        property: "og:description",
        content: "Safest, fastest and cheapest NER freight routes with transparent score components.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Planner,
});

const CARGO: { value: CargoType; label: string; hazardous?: boolean; perishable?: boolean }[] = [
  { value: "general", label: "General cargo" },
  { value: "perishable", label: "Perishable / cold chain", perishable: true },
  { value: "pharma", label: "Pharmaceuticals", perishable: true },
  { value: "hazardous", label: "Hazardous", hazardous: true },
  { value: "construction", label: "Construction material" },
  { value: "fuel", label: "Fuel / POL", hazardous: true },
  { value: "relief", label: "Disaster relief" },
];

const DEMO_REQUEST: RouteRequest = {
  originId: "guwahati",
  destinationId: "aizawl",
  cargoType: "pharma",
  weightTonnes: 9,
  vehicleType: "reefer",
  priority: "critical",
  maxDelayHours: 12,
  hazardous: false,
  perishable: true,
  emergencyMode: false,
};

const STEPS = [
  "Origin",
  "Destination",
  "Freight details",
  "Preferences",
  "Generate",
  "Compare",
  "Explain",
];

function Planner() {
  const { demo } = Route.useSearch();
  const [req, setReq] = useState<RouteRequest>({
    originId: "guwahati",
    destinationId: "imphal",
    cargoType: "general",
    weightTonnes: 16,
    vehicleType: "truck-16t",
    priority: "high",
    maxDelayHours: 12,
    hazardous: false,
    perishable: false,
    emergencyMode: false,
  });
  const [results, setResults] = useState<RouteOption[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const set = <K extends keyof RouteRequest>(k: K, v: RouteRequest[K]) =>
    setReq((r) => ({ ...r, [k]: v }));

  const vehicle = VEHICLES[req.vehicleType];
  const sameCity = req.originId === req.destinationId;
  const overloaded = req.weightTonnes > vehicle.capacity;
  const invalidWeight = req.weightTonnes <= 0;
  const canGenerate = !sameCity && !invalidWeight;

  const run = (request: RouteRequest, quiet = false) => {
    if (request.originId === request.destinationId) {
      toast.error("Origin and destination must be different.");
      return;
    }
    const options = planRoutes(request, incidentsBySegment);
    if (!options.length) {
      toast.error("No corridor path found between the selected cities in the demo network.");
      return;
    }
    setResults(options);
    setSelectedId(options.find((o) => o.recommended)?.id ?? options[0]!.id);
    savePlan(request, options);
    if (!quiet) toast.success(`${options.length} route alternatives evaluated and scored.`);
  };

  useEffect(() => {
    if (demo === "1") {
      setReq(DEMO_REQUEST);
      run(DEMO_REQUEST, true);
      toast.info("Demo scenario loaded: Guwahati → Aizawl cold-chain pharma consignment.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  const weights = req.emergencyMode ? EMERGENCY_WEIGHTS : SCORE_WEIGHTS;

  const mapRoutes: MapRoute[] = useMemo(
    () =>
      (results ?? []).map((r) => ({
        id: r.id,
        label: r.label,
        path: r.path,
        color: r.label === "Safest Route" ? "safe" : r.label === "Fastest Route" ? "warn" : "primary",
      })),
    [results],
  );

  const selected = results?.find((r) => r.id === selectedId) ?? null;
  const recommended = results?.find((r) => r.recommended) ?? null;
  const currentStep = !results ? 5 : selected ? 7 : 6;

  const swap = () =>
    setReq((r) => ({ ...r, originId: r.destinationId, destinationId: r.originId }));

  const applyCargo = (value: CargoType) => {
    const meta = CARGO.find((c) => c.value === value);
    setReq((r) => ({
      ...r,
      cargoType: value,
      hazardous: meta?.hazardous ?? false,
      perishable: meta?.perishable ?? false,
    }));
  };

  const best = (fn: (r: RouteOption) => number, lower = true) =>
    results ? results.reduce((a, b) => (lower ? (fn(b) < fn(a) ? b : a) : fn(b) > fn(a) ? b : a)).id : null;

  const bestTime = best((r) => r.travelHours);
  const bestCost = best((r) => r.costInr);
  const bestSafety = best((r) => r.safetyScore, false);
  const bestScore = best((r) => r.weightedTotal, false);

  return (
    <>
      <PageHeader
        title="Smart Route Planner"
        subtitle="Seven-step freight optimisation workflow: define the consignment, generate three scored alternatives, compare them and read the explanation behind the recommendation."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReq(DEMO_REQUEST);
                run(DEMO_REQUEST);
              }}
            >
              <Play className="mr-1 size-4" /> Demo Mode
            </Button>
            <Button
              variant={req.emergencyMode ? "destructive" : "outline"}
              size="sm"
              onClick={() => {
                const next = { ...req, emergencyMode: !req.emergencyMode };
                setReq(next);
                if (results) run(next, true);
                toast.info(next.emergencyMode ? "Emergency Mode ON — cost weighting removed." : "Emergency Mode off.");
              }}
            >
              <Siren className="mr-1 size-4" /> Emergency Mode
            </Button>
          </>
        }
      />

      <Stepper current={currentStep} />

      <DemoNotice text="Corridor geometry, rainfall and incident inputs are simulated. Scores are computed live from these inputs." />

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard title="Freight request" description="Steps 1–4 · all inputs feed the scoring engine">
          <div className="space-y-3.5">
            <StepLabel n={1} text="Origin" />
            <CityCombobox
              value={req.originId}
              onChange={(v) => set("originId", v)}
              disabledId={req.destinationId}
              ariaLabel="Origin city"
            />
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={swap} aria-label="Swap origin and destination">
                <ArrowLeftRight className="mr-1 size-4" /> Swap
              </Button>
            </div>
            <StepLabel n={2} text="Destination" />
            <CityCombobox
              value={req.destinationId}
              onChange={(v) => set("destinationId", v)}
              disabledId={req.originId}
              ariaLabel="Destination city"
            />
            {sameCity ? (
              <p className="flex items-center gap-1.5 text-xs text-risk-severe">
                <AlertTriangle className="size-3.5" aria-hidden /> Origin and destination must differ.
              </p>
            ) : null}

            <StepLabel n={3} text="Freight details" />
            <Field label="Cargo type">
              <Select value={req.cargoType} onValueChange={(v) => applyCargo(v as CargoType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CARGO.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cargo weight (tonnes)">
              <Input
                type="number"
                min={0.5}
                step={0.5}
                value={req.weightTonnes}
                onChange={(e) => set("weightTonnes", Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Vehicle type">
              <Select value={req.vehicleType} onValueChange={(v) => set("vehicleType", v as VehicleType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(VEHICLES) as VehicleType[]).map((v) => (
                    <SelectItem key={v} value={v}>
                      {VEHICLES[v].label} · up to {VEHICLES[v].capacity}t
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {overloaded ? (
              <p className="flex items-start gap-1.5 text-xs text-risk-high">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {req.weightTonnes}t exceeds the {vehicle.capacity}t capacity of {vehicle.label} — a cost penalty is
                applied and hill segments may refuse the load.
              </p>
            ) : null}

            <StepLabel n={4} text="Route preferences" />
            <Field label="Priority">
              <Select value={req.priority} onValueChange={(v) => set("priority", v as RouteRequest["priority"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={`Maximum acceptable delay — ${req.maxDelayHours} h`}>
              <Slider
                value={[req.maxDelayHours]}
                min={0}
                max={72}
                step={1}
                onValueChange={([v]) => set("maxDelayHours", v ?? 0)}
                aria-label="Maximum acceptable delay in hours"
              />
            </Field>
            <div className="flex items-center justify-between rounded-sm border border-border px-3 py-2">
              <Label htmlFor="haz" className="text-xs">Hazardous cargo</Label>
              <Switch id="haz" checked={req.hazardous} onCheckedChange={(v) => set("hazardous", v)} />
            </div>
            <div className="flex items-center justify-between rounded-sm border border-border px-3 py-2">
              <Label htmlFor="per" className="text-xs">Perishable cargo</Label>
              <Switch id="per" checked={req.perishable} onCheckedChange={(v) => set("perishable", v)} />
            </div>
            <div className="flex items-center justify-between rounded-sm border border-risk-severe/40 bg-risk-severe/5 px-3 py-2">
              <Label htmlFor="emg" className="text-xs">Emergency Mode</Label>
              <Switch
                id="emg"
                checked={req.emergencyMode}
                onCheckedChange={(v) => {
                  const next = { ...req, emergencyMode: v };
                  setReq(next);
                  if (results) run(next, true);
                }}
              />
            </div>

            <StepLabel n={5} text="Generate routes" />
            <div className="flex gap-2">
              <Button className="flex-1" disabled={!canGenerate} onClick={() => run(req)}>
                Generate routes
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Reset results"
                onClick={() => { setResults(null); setSelectedId(null); }}
              >
                <RotateCcw className="size-4" />
              </Button>
            </div>

            <div className="rounded-sm border border-border bg-muted p-3">
              <p className="text-xs font-semibold text-foreground">
                Active scoring weights {req.emergencyMode ? "(Emergency)" : "(Standard)"}
              </p>
              <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                {Object.entries(weights).map(([k, v]) => (
                  <li key={k} className="flex justify-between capitalize">
                    <span>{k}</span>
                    <span className="tabular">{Math.round(v * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Route visualisation"
            description="Green = safest · amber = fastest · blue = cheapest"
            actions={
              <span className="text-xs text-muted-foreground">
                {cityById(req.originId)?.name} → {cityById(req.destinationId)?.name}
              </span>
            }
          >
            <MapPanel height="360px" routes={mapRoutes} layers={{ roads: true, incidents: true, closures: true }} />
          </SectionCard>

          {!results ? (
            <SectionCard title="Route alternatives" description="Run the planner to evaluate the corridor network">
              <p className="text-sm text-muted-foreground">
                Complete steps 1–4, then select <strong>Generate routes</strong> — or press{" "}
                <strong>Demo Mode</strong> to load a scenario where the shortest route is not the safest.
              </p>
            </SectionCard>
          ) : (
            <>
              {recommended ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-accent/40 px-4 py-3 text-sm">
                  <CheckCircle2 className="size-4 text-primary" aria-hidden />
                  <span>
                    <strong>Recommended: {recommended.label}</strong> via {recommended.waypoints.join(" → ")} —{" "}
                    {recommended.distanceKm} km, {recommended.travelHours} h, score {recommended.weightedTotal}/100.
                  </span>
                </div>
              ) : null}

              <div className="grid gap-3 lg:grid-cols-3">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`rounded-md border p-4 text-left transition-colors ${
                      selectedId === r.id ? "border-primary bg-accent/40" : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{r.label}</span>
                      {r.recommended ? (
                        <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
                          Recommended
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{r.waypoints.join(" → ")}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
                      <Stat label="Distance" value={`${r.distanceKm} km`} />
                      <Stat label="Travel time" value={`${r.travelHours} h`} />
                      <Stat label="Cost" value={`₹${r.costInr.toLocaleString("en-IN")}`} />
                      <Stat label="Incidents" value={String(r.incidentCount)} />
                      <Stat label="Safety" value={`${r.safetyScore}/100`} />
                      <Stat label="Accessibility" value={`${r.accessibilityScore}/100`} />
                      <Stat label="Reliability" value={`${r.reliabilityScore}/100`} />
                      <Stat label="CO₂" value={`${r.co2Kg} kg`} />
                    </dl>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <RiskPill score={r.disasterRisk} />
                      <AccessPill score={r.accessibilityScore} />
                      <span className="tabular rounded-sm border border-border px-2 py-0.5 text-xs">
                        Score {r.weightedTotal}
                      </span>
                    </div>
                    {r.travelHours > req.maxDelayHours + 24 ? (
                      <p className="mt-2 text-[11px] text-risk-high">
                        Transit exceeds the accepted delay window — penalty applied.
                      </p>
                    ) : null}
                    {r.closures.length ? (
                      <p className="mt-2 rounded-sm border border-risk-severe/40 bg-risk-severe/10 px-2 py-1 text-[11px] text-risk-severe">
                        Closure on route: {r.closures.join("; ")}
                      </p>
                    ) : null}
                  </button>
                ))}
              </div>

              <SectionCard title="Step 6 · Side-by-side comparison" description="Best value per criterion is highlighted">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Criterion</TableHead>
                        {results.map((r) => (
                          <TableHead key={r.id} className="text-right">{r.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <CompareRow label="Waypoints" results={results} render={(r) => r.waypoints.join(" → ")} />
                      <CompareRow label="Distance (km)" results={results} render={(r) => r.distanceKm} />
                      <CompareRow label="Travel time (h)" results={results} render={(r) => r.travelHours} bestId={bestTime} />
                      <CompareRow
                        label="Cost (₹)"
                        results={results}
                        render={(r) => r.costInr.toLocaleString("en-IN")}
                        bestId={bestCost}
                      />
                      <CompareRow label="Safety" results={results} render={(r) => r.safetyScore} bestId={bestSafety} />
                      <CompareRow label="Accessibility" results={results} render={(r) => r.accessibilityScore} />
                      <CompareRow label="Reliability" results={results} render={(r) => r.reliabilityScore} />
                      <CompareRow label="Disaster risk" results={results} render={(r) => r.disasterRisk} />
                      <CompareRow label="Open incidents" results={results} render={(r) => r.incidentCount} />
                      <CompareRow label="CO₂ (kg)" results={results} render={(r) => r.co2Kg} />
                      <CompareRow
                        label="Weighted score"
                        results={results}
                        render={(r) => r.weightedTotal}
                        bestId={bestScore}
                      />
                    </TableBody>
                  </Table>
                </div>
              </SectionCard>
            </>
          )}

          {selected ? (
            <SectionCard
              title={`Step 7 · Why this route — ${selected.label}`}
              description="Explainable score components (weighted)"
              actions={
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      savePlan(req, results ?? []);
                      toast.success("Plan saved. Open Reports to generate the summary document.");
                    }}
                  >
                    <Save className="mr-1 size-4" /> Save plan
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/reports">Reports</Link>
                  </Button>
                </div>
              }
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2.5">
                  <ScoreBar label="Safety" value={selected.breakdown.safety} weight={weights.safety} />
                  <ScoreBar label="Accessibility" value={selected.breakdown.accessibility} weight={weights.accessibility} />
                  <ScoreBar label="Time" value={selected.breakdown.time} weight={weights.time} />
                  <ScoreBar label="Cost" value={selected.breakdown.cost} weight={weights.cost} />
                  <ScoreBar label="Reliability" value={selected.breakdown.reliability} weight={weights.reliability} />
                  <ScoreBar label="Environmental impact" value={selected.breakdown.environment} weight={weights.environment} />
                  <p className="tabular pt-1 text-sm font-semibold">
                    Weighted total: {selected.weightedTotal}/100
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Consignment: {req.weightTonnes}t {CARGO.find((c) => c.value === req.cargoType)?.label.toLowerCase()} on{" "}
                    {vehicle.label}, {req.priority} priority, {req.maxDelayHours} h delay tolerance
                    {req.emergencyMode ? ", Emergency Mode active" : ""}.
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Reason for recommendation
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {selected.reasons.map((r) => (
                      <li key={r} className="flex gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                        {r}
                      </li>
                    ))}
                  </ul>
                  <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Segments
                  </h3>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {selected.segments.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2">
                        <span>
                          {s.highway} · {s.name}
                        </span>
                        <span className="tabular">{s.lengthKm} km</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-xs">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li
            key={s}
            className={cn(
              "flex items-center gap-1.5 rounded-sm border px-2 py-1",
              active
                ? "border-primary bg-accent/50 text-foreground"
                : done
                  ? "border-border bg-muted text-muted-foreground"
                  : "border-dashed border-border text-muted-foreground",
            )}
          >
            <span className="tabular font-semibold">{n}</span>
            <span>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

function StepLabel({ n, text }: { n: number; text: string }) {
  return (
    <p className="flex items-center gap-2 border-b border-border pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <span className="tabular flex size-4 items-center justify-center rounded-sm bg-primary text-[10px] text-primary-foreground">
        {n}
      </span>
      {text}
    </p>
  );
}

function CompareRow({
  label,
  results,
  render,
  bestId,
}: {
  label: string;
  results: RouteOption[];
  render: (r: RouteOption) => string | number;
  bestId?: string | null;
}) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{label}</TableCell>
      {results.map((r) => (
        <TableCell
          key={r.id}
          className={cn("tabular text-right", bestId === r.id && "font-semibold text-primary")}
        >
          {render(r)}
        </TableCell>
      ))}
    </TableRow>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular text-right font-medium">{value}</dd>
    </>
  );
}
