import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Siren, Play, Save, RotateCcw } from "lucide-react";
import { DemoNotice, PageHeader, RiskPill, ScoreBar, SectionCard, AccessPill } from "@/components/common";
import { MapPanel } from "@/components/MapPanel";
import type { MapRoute } from "@/components/NerMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  cityOptions,
  planRoutes,
  type CargoType,
  type RouteOption,
  type RouteRequest,
  type VehicleType,
} from "@/lib/ner/scoring";
import { incidentsBySegment } from "@/lib/ner/demo-data";
import { savePlan } from "@/lib/plan-store";

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
    ],
  }),
  component: Planner,
});

const CARGO: { value: CargoType; label: string }[] = [
  { value: "general", label: "General cargo" },
  { value: "perishable", label: "Perishable" },
  { value: "pharma", label: "Pharmaceuticals" },
  { value: "hazardous", label: "Hazardous" },
  { value: "construction", label: "Construction material" },
  { value: "fuel", label: "Fuel / POL" },
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

  const run = (request: RouteRequest, quiet = false) => {
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

  return (
    <>
      <PageHeader
        title="Smart Route Planner"
        subtitle="Enter freight details to generate three scored alternatives with a transparent, weight-based recommendation."
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

      <DemoNotice text="Corridor geometry, rainfall and incident inputs are simulated. Scores are computed live from these inputs." />

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <SectionCard title="Freight request" description="All inputs feed the scoring engine">
          <div className="space-y-3.5">
            <Field label="Origin">
              <Select value={req.originId} onValueChange={(v) => set("originId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cityOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Destination">
              <Select value={req.destinationId} onValueChange={(v) => set("destinationId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cityOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cargo type">
              <Select value={req.cargoType} onValueChange={(v) => set("cargoType", v as CargoType)}>
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
                    <SelectItem key={v} value={v}>{VEHICLES[v].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
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
            <Field label="Maximum acceptable delay (hours)">
              <Input
                type="number"
                min={0}
                value={req.maxDelayHours}
                onChange={(e) => set("maxDelayHours", Number(e.target.value) || 0)}
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
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => run(req)}>Generate routes</Button>
              <Button variant="outline" size="icon" aria-label="Reset" onClick={() => { setResults(null); setSelectedId(null); }}>
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
          <SectionCard title="Route visualisation" description="Green = safest · amber = fastest · blue = cheapest">
            <MapPanel height="360px" routes={mapRoutes} layers={{ roads: true, incidents: true, closures: true }} />
          </SectionCard>

          {!results ? (
            <SectionCard title="Route alternatives" description="Run the planner to evaluate the corridor network">
              <p className="text-sm text-muted-foreground">
                Choose an origin and destination, then select <strong>Generate routes</strong> — or press{" "}
                <strong>Demo Mode</strong> to load a scenario where the shortest route is not the safest.
              </p>
            </SectionCard>
          ) : (
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
                  {r.closures.length ? (
                    <p className="mt-2 rounded-sm border border-risk-severe/40 bg-risk-severe/10 px-2 py-1 text-[11px] text-risk-severe">
                      Closure on route: {r.closures.join("; ")}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          )}

          {selected ? (
            <SectionCard
              title={`Why this route — ${selected.label}`}
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
