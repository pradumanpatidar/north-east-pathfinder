import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Siren,
  Play,
  Save,
  RotateCcw,
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  MapPin,
  PackagePlus,
  RefreshCw,
  ShieldAlert,
  Wifi,
  WifiOff,
} from "lucide-react";
import { DemoNotice, PageHeader, RiskPill, ScoreBar, SectionCard, AccessPill } from "@/components/common";
import { MapPanel } from "@/components/MapPanel";
import { CityCombobox } from "@/components/CityCombobox";
import { IncidentReportDialog } from "@/components/IncidentReportDialog";
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
  explainRecommendation,
  planRoutes,
  segmentAccessibility,
  segmentDisasterRisk,
  type CargoType,
  type RouteOption,
  type RouteRequest,
  type VehicleType,
} from "@/lib/ner/scoring";
import { cityById } from "@/lib/ner/geo";
import { INCIDENTS, type Incident } from "@/lib/ner/demo-data";
import { buildSegmentImpacts } from "@/lib/ner/incident-impact";
import { reportToIncident, useFieldReports } from "@/lib/field-reports";
import { createShipment, useCreatedShipments } from "@/lib/shipment-store";
import { services, type RockWatchPrediction } from "@/lib/services";
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
          "Plan freight movement across the North East with incident-aware risk analysis, three scored alternatives and an explainable safety-weighted recommendation.",
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
  { value: "pharma", label: "Essential medicines / pharmaceuticals", perishable: true },
  { value: "hazardous", label: "Hazardous", hazardous: true },
  { value: "construction", label: "Construction material" },
  { value: "fuel", label: "Fuel / POL", hazardous: true },
  { value: "relief", label: "Disaster relief" },
];

const DEMO_REQUEST: RouteRequest = {
  originId: "guwahati",
  destinationId: "itanagar",
  cargoType: "pharma",
  weightTonnes: 5,
  vehicleType: "truck-16t",
  priority: "high",
  maxDelayHours: 3,
  hazardous: false,
  perishable: true,
  emergencyMode: false,
};

const STEPS = [
  "Origin",
  "Destination",
  "Freight details",
  "Preferences",
  "Risk analysis",
  "Route options",
  "Recommendation",
  "Shipment",
];

function Planner() {
  const { demo } = Route.useSearch();
  const { reports, pendingCount, online, syncPending } = useFieldReports();
  const createdShipments = useCreatedShipments();

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
  const [lastRequest, setLastRequest] = useState<RouteRequest | null>(null);
  const [rockwatch, setRockwatch] = useState<RockWatchPrediction[]>([]);

  // Demo register + field-officer reports (incl. offline queue) drive the same risk model.
  const liveIncidents: Incident[] = useMemo(
    () => [...INCIDENTS, ...reports.map(reportToIncident)],
    [reports],
  );
  const impacts = useMemo(() => buildSegmentImpacts(liveIncidents), [liveIncidents]);

  const set = <K extends keyof RouteRequest>(k: K, v: RouteRequest[K]) =>
    setReq((r) => ({ ...r, [k]: v }));

  const vehicle = VEHICLES[req.vehicleType];
  const sameCity = req.originId === req.destinationId;
  const overloaded = req.weightTonnes > vehicle.capacity;
  const invalidWeight = req.weightTonnes <= 0 || Number.isNaN(req.weightTonnes);
  const canGenerate = !sameCity && !invalidWeight;

  const run = useCallback(
    (request: RouteRequest, quiet = false) => {
      if (request.originId === request.destinationId) {
        toast.error("Origin and destination must be different.");
        return;
      }
      if (request.weightTonnes <= 0) {
        toast.error("Enter a cargo weight greater than zero.");
        return;
      }
      const options = planRoutes(request, impacts);
      if (!options.length) {
        toast.error("No corridor path found between the selected cities in the demo network.");
        return;
      }
      setResults(options);
      setLastRequest(request);
      setSelectedId(options.find((o) => o.recommended)?.id ?? options[0]!.id);
      savePlan(request, options);
      if (!quiet) toast.success(`${options.length} route alternative(s) evaluated against live incident data.`);
    },
    [impacts],
  );

  useEffect(() => {
    if (demo === "1") {
      setReq(DEMO_REQUEST);
      run(DEMO_REQUEST, true);
      toast.info("Demo scenario loaded: Guwahati → Itanagar essential-medicines consignment.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  // Closed loop: a new/synced incident re-scores the active plan automatically.
  useEffect(() => {
    if (!lastRequest) return;
    const options = planRoutes(lastRequest, impacts);
    if (!options.length) return;
    setResults(options);
    setSelectedId((cur) => (options.some((o) => o.id === cur) ? cur : (options.find((o) => o.recommended)?.id ?? options[0]!.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impacts]);

  const weights = req.emergencyMode ? EMERGENCY_WEIGHTS : SCORE_WEIGHTS;

  const selected = results?.find((r) => r.id === selectedId) ?? null;
  const recommended = results?.find((r) => r.recommended) ?? null;

  // RockWatch AI (simulated) predictions for the segments in play.
  useEffect(() => {
    let cancelled = false;
    const segIds = Array.from(new Set((results ?? []).flatMap((r) => r.segments.map((s) => s.id))));
    if (!segIds.length) {
      setRockwatch([]);
      return;
    }
    void Promise.all(segIds.map((id) => services.rockwatch.predict(id))).then((preds) => {
      if (!cancelled) setRockwatch(preds);
    });
    return () => {
      cancelled = true;
    };
  }, [results]);

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

  const selectedMapRoutes = selected
    ? mapRoutes.filter((m) => m.id === selected.id)
    : mapRoutes;

  const currentStep = !results ? (canGenerate ? 5 : 4) : selected ? (createdShipments.length ? 8 : 7) : 6;

  const swap = () => setReq((r) => ({ ...r, originId: r.destinationId, destinationId: r.originId }));

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
  const bestAccess = best((r) => r.accessibilityScore, false);
  const bestReliability = best((r) => r.reliabilityScore, false);
  const bestRisk = best((r) => r.disasterRisk);
  const bestScore = best((r) => r.weightedTotal, false);

  // What would normal (non-emergency) routing have chosen?
  const normalRecommendation = useMemo(() => {
    if (!lastRequest?.emergencyMode) return null;
    const normal = planRoutes({ ...lastRequest, emergencyMode: false }, impacts);
    return normal.find((o) => o.recommended) ?? null;
  }, [lastRequest, impacts]);

  // Incidents that sit on any of the generated alignments.
  const routeIncidents = useMemo(() => {
    const segIds = new Set((results ?? []).flatMap((r) => r.segments.map((s) => s.id)));
    return liveIncidents.filter((i) => segIds.has(i.segmentId) && i.status !== "Resolved");
  }, [results, liveIncidents]);

  const cargoLabel = CARGO.find((c) => c.value === req.cargoType)?.label ?? "Cargo";

  return (
    <>
      <PageHeader
        title="Smart Route Planner"
        subtitle="Incident-aware freight optimisation: define the consignment, review live corridor risk, compare three scored alternatives, read the explanation and raise the shipment."
        actions={
          <>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs font-medium",
                online ? "border-border text-muted-foreground" : "border-risk-high/50 bg-risk-high/10 text-risk-high",
              )}
            >
              {online ? <Wifi className="size-3.5" aria-hidden /> : <WifiOff className="size-3.5" aria-hidden />}
              {online ? "Online" : "OFFLINE MODE"}
              {pendingCount ? ` · ${pendingCount} pending sync` : ""}
            </span>
            <IncidentReportDialog
              trigger={
                <Button variant="outline" size="sm">
                  <ShieldAlert className="mr-1 size-4" /> Report road incident
                </Button>
              }
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReq(DEMO_REQUEST);
                run(DEMO_REQUEST);
                toast.info("Demo scenario: Guwahati → Itanagar, 5,000 kg essential medicines, heavy truck, 3 h tolerance.");
              }}
            >
              <Play className="mr-1 size-4" /> Load demo scenario
            </Button>
            <Button
              variant={req.emergencyMode ? "destructive" : "outline"}
              size="sm"
              onClick={() => {
                const next = { ...req, emergencyMode: !req.emergencyMode };
                setReq(next);
                if (results) run(next, true);
                toast.info(
                  next.emergencyMode ? "EMERGENCY ROUTING ACTIVE — cost and emissions de-prioritised." : "Emergency Mode off.",
                );
              }}
            >
              <Siren className="mr-1 size-4" /> Emergency Mode
            </Button>
          </>
        }
      />

      <Stepper current={currentStep} />

      <DemoNotice text="Corridor geometry, rainfall, incidents and RockWatch AI outputs are simulated. Scores are computed live from these inputs — no live government or real-time feed is connected." />

      {!online ? (
        <div className="flex items-start gap-2 rounded-md border border-risk-high/40 bg-risk-high/10 px-4 py-3 text-sm text-risk-high">
          <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <strong>OFFLINE MODE.</strong> Cached corridor data, route scoring and field incident capture remain
            available on this device. Cloud AI analysis and synchronisation resume when connectivity returns.
          </span>
        </div>
      ) : null}

      {req.emergencyMode ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-risk-severe/50 bg-risk-severe/10 px-4 py-3 text-sm text-risk-severe">
          <Siren className="size-4" aria-hidden />
          <strong>EMERGENCY ROUTING ACTIVE</strong>
          <span className="text-foreground">
            Priority order: safety → accessibility → road availability → response time. Cost and environmental
            weighting removed.
            {normalRecommendation && recommended
              ? normalRecommendation.label === recommended.label
                ? ` Normal routing would also have selected the ${recommended.label}.`
                : ` Normal routing would have selected the ${normalRecommendation.label} (${normalRecommendation.travelHours} h, risk ${normalRecommendation.disasterRisk}/100); emergency weighting switched the recommendation to the ${recommended.label} (risk ${recommended.disasterRisk}/100).`
              : ""}
          </span>
        </div>
      ) : null}

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
            {invalidWeight ? (
              <p className="flex items-center gap-1.5 text-xs text-risk-severe">
                <AlertTriangle className="size-3.5" aria-hidden /> Enter a weight greater than zero.
              </p>
            ) : null}
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
                onClick={() => { setResults(null); setSelectedId(null); setLastRequest(null); }}
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

            {reports.length ? (
              <div className="rounded-sm border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">Field reports on this device</p>
                  <Button size="sm" variant="ghost" onClick={() => void syncPending()} disabled={!online || !pendingCount}>
                    <RefreshCw className="mr-1 size-3.5" /> Sync
                  </Button>
                </div>
                <ul className="mt-1.5 space-y-1 text-xs">
                  {reports.slice(0, 4).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-muted-foreground">
                        {r.type} · {r.severity}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                          r.syncState === "synced"
                            ? "border-risk-low/40 bg-risk-low/10 text-risk-low"
                            : "border-risk-high/40 bg-risk-high/10 text-risk-high",
                        )}
                      >
                        {r.syncState === "synced" ? "Synced" : r.syncState === "syncing" ? "Syncing…" : "Offline — pending sync"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Step 5 · Risk analysis"
            description="Incident register + RockWatch AI (simulated) applied to the candidate corridors"
            actions={
              <span className="text-xs text-muted-foreground">
                {cityById(req.originId)?.name} → {cityById(req.destinationId)?.name}
              </span>
            }
          >
            {!results ? (
              <p className="text-sm text-muted-foreground">
                Complete steps 1–4 and select <strong>Generate routes</strong> — or use{" "}
                <strong>Load demo scenario</strong> for a ready NER consignment.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Active incidents on candidate corridors
                  </h3>
                  {routeIncidents.length ? (
                    <ul className="mt-2 space-y-1.5 text-xs">
                      {routeIncidents.map((i) => (
                        <li key={i.id} className="flex items-start justify-between gap-2 border-b border-border pb-1">
                          <span>
                            <strong>{i.type}</strong> · {i.affectedRoad} — {i.location}
                          </span>
                          <span className="shrink-0 font-semibold text-risk-high">{i.severity}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">No open incidents on the evaluated alignments.</p>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    RockWatch AI · DEMO / SIMULATED PREDICTION
                  </h3>
                  <ul className="mt-2 space-y-1 text-xs">
                    {rockwatch
                      .slice()
                      .sort((a, b) => b.riskScore - a.riskScore)
                      .slice(0, 5)
                      .map((p) => (
                        <li key={p.segmentId} className="flex items-center justify-between gap-2">
                          <span className="truncate text-muted-foreground">
                            {selected?.segments.find((s) => s.id === p.segmentId)?.name ?? p.segmentId.replace("seg-", "")}
                          </span>
                          <span className="tabular shrink-0">
                            rockfall {Math.round(p.rockfallProbability * 100)}% · landslide{" "}
                            {Math.round(p.landslideProbability * 100)}% · conf {Math.round(p.confidence * 100)}%
                          </span>
                        </li>
                      ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    No trained ML model is connected; values are deterministic simulations of the RockWatch interface.
                  </p>
                </div>
              </div>
            )}
          </SectionCard>

          {results ? (
            <>
              {recommended ? (
                <div className="flex flex-wrap items-start gap-2 rounded-md border border-primary/40 bg-accent/40 px-4 py-3 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>
                    <strong>Recommended: {recommended.label}</strong> via {recommended.waypoints.join(" → ")} —{" "}
                    {recommended.distanceKm} km, {recommended.travelHours} h, score {recommended.weightedTotal}/100.
                    <br />
                    {explainRecommendation(recommended, results)}
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
                      <Stat label="ETA" value={`${r.travelHours} h`} />
                      <Stat label="Cost" value={`₹${r.costInr.toLocaleString("en-IN")}`} />
                      <Stat label="Incidents" value={String(r.incidentCount)} />
                      <Stat label="Safety" value={`${r.safetyScore}/100`} />
                      <Stat label="Accessibility" value={`${r.accessibilityScore}/100`} />
                      <Stat label="Reliability" value={`${r.reliabilityScore}/100`} />
                      <Stat label="Disaster risk" value={`${r.disasterRisk}/100`} />
                      <Stat label="CO₂" value={`${r.co2Kg} kg`} />
                    </dl>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <RiskPill score={r.disasterRisk} />
                      <AccessPill score={r.accessibilityScore} />
                      <span className="tabular rounded-sm border border-border px-2 py-0.5 text-xs">
                        Score {r.weightedTotal}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                      {r.reasons.slice(0, 3).map((reason) => (
                        <li key={reason}>• {reason}</li>
                      ))}
                    </ul>
                    {r.travelHours > req.maxDelayHours + 24 ? (
                      <p className="mt-2 text-[11px] text-risk-high">
                        Transit exceeds the accepted delay window — penalty applied.
                      </p>
                    ) : null}
                    {r.unsuitableSegments.length ? (
                      <p className="mt-2 rounded-sm border border-risk-high/40 bg-risk-high/10 px-2 py-1 text-[11px] text-risk-high">
                        Vehicle/weight unsuitable: {r.unsuitableSegments.join("; ")}
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

              <SectionCard title="Step 6 · Side-by-side comparison" description="Best value per criterion is highlighted; trade-offs are shown, not hidden">
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
                      <CompareRow label="ETA (h)" results={results} render={(r) => r.travelHours} bestId={bestTime} />
                      <CompareRow
                        label="Cost (₹)"
                        results={results}
                        render={(r) => r.costInr.toLocaleString("en-IN")}
                        bestId={bestCost}
                      />
                      <CompareRow label="Safety" results={results} render={(r) => r.safetyScore} bestId={bestSafety} />
                      <CompareRow label="Accessibility" results={results} render={(r) => r.accessibilityScore} bestId={bestAccess} />
                      <CompareRow label="Reliability" results={results} render={(r) => r.reliabilityScore} bestId={bestReliability} />
                      <CompareRow label="Disaster risk" results={results} render={(r) => r.disasterRisk} bestId={bestRisk} />
                      <CompareRow label="Open incidents" results={results} render={(r) => r.incidentCount} />
                      <CompareRow label="CO₂ (kg)" results={results} render={(r) => r.co2Kg} />
                      <CompareRow label="Closures" results={results} render={(r) => (r.closures.length ? r.closures.length : "none")} />
                      <CompareRow
                        label="Weighted score"
                        results={results}
                        render={(r) => r.weightedTotal}
                        bestId={bestScore}
                      />
                    </TableBody>
                  </Table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">All figures are DEMO / SIMULATED values.</p>
              </SectionCard>
            </>
          ) : null}

          {selected ? (
            <>
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
                      Overall score: {selected.weightedTotal}/100
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Consignment: {req.weightTonnes}t {cargoLabel.toLowerCase()} on {vehicle.label}, {req.priority}{" "}
                      priority, {req.maxDelayHours} h delay tolerance
                      {req.emergencyMode ? ", Emergency Mode active" : ""}.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Reason for recommendation
                    </h3>
                    <p className="mt-2 text-sm">{explainRecommendation(selected, results ?? [])}</p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {selected.reasons.map((r) => (
                        <li key={r} className="flex gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Route detail & map"
                description="Selected alignment with risk zones, incident markers and estimated checkpoints"
                actions={
                  <div className="flex flex-wrap gap-1.5">
                    {(results ?? []).map((r) => (
                      <Button
                        key={r.id}
                        size="sm"
                        variant={r.id === selected.id ? "default" : "outline"}
                        onClick={() => setSelectedId(r.id)}
                      >
                        {r.label.replace(" Route", "")}
                      </Button>
                    ))}
                  </div>
                }
              >
                <MapPanel
                  height="360px"
                  routes={selectedMapRoutes}
                  focusSegmentIds={selected.segments.map((s) => s.id)}
                  layers={{ roads: true, incidents: true, closures: true, riskZones: true }}
                />
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Segment</TableHead>
                        <TableHead className="text-right">km</TableHead>
                        <TableHead className="text-right">Terrain</TableHead>
                        <TableHead className="text-right">Risk</TableHead>
                        <TableHead className="text-right">Access</TableHead>
                        <TableHead className="text-right">Incidents</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.segments.map((s) => {
                        const impact = impacts[s.id];
                        return (
                          <TableRow key={s.id}>
                            <TableCell>
                              <span className="font-medium">{s.highway}</span> · {s.name}
                              {s.closed ? <span className="ml-2 text-xs text-risk-severe">CLOSED</span> : null}
                            </TableCell>
                            <TableCell className="tabular text-right">{s.lengthKm}</TableCell>
                            <TableCell className="text-right capitalize">{s.terrain}</TableCell>
                            <TableCell className="tabular text-right">
                              {Math.min(100, Math.round(segmentDisasterRisk(s) + (impact?.riskDelta ?? 0)))}
                            </TableCell>
                            <TableCell className="tabular text-right">
                              {Math.max(0, Math.round(segmentAccessibility(s, req.weightTonnes) - (impact?.accessDelta ?? 0)))}
                            </TableCell>
                            <TableCell className="tabular text-right">{impact?.count ?? 0}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Estimated checkpoints
                  </h3>
                  <ol className="mt-2 flex flex-wrap gap-2 text-xs">
                    {selected.waypoints.map((w, i) => (
                      <li key={`${w}-${i}`} className="flex items-center gap-1 rounded-sm border border-border px-2 py-1">
                        <MapPin className="size-3" aria-hidden />
                        {w}
                        <span className="tabular text-muted-foreground">
                          +{Math.round((selected.travelHours / Math.max(1, selected.waypoints.length - 1)) * i)} h
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </SectionCard>

              <SectionCard
                title="Step 8 · Create shipment"
                description="Raises a planned shipment from this route using the existing shipment record structure"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => {
                      const shipment = createShipment(req, selected, cargoLabel);
                      toast.success(`Shipment ${shipment.id} created with status Planned.`);
                    }}
                  >
                    <PackagePlus className="mr-1 size-4" /> Create shipment from {selected.label}
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/freight">Freight management</Link>
                  </Button>
                </div>

                {createdShipments.length ? (
                  <div className="mt-4 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Shipment ID</TableHead>
                          <TableHead>Origin → Destination</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead className="text-right">Weight</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead className="text-right">ETA</TableHead>
                          <TableHead className="text-right">Risk</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {createdShipments.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.id}</TableCell>
                            <TableCell>
                              {cityById(s.originId)?.name} → {cityById(s.destinationId)?.name}
                            </TableCell>
                            <TableCell>{s.cargo}</TableCell>
                            <TableCell className="tabular text-right">{s.weightTonnes}t</TableCell>
                            <TableCell>{s.vehicle}</TableCell>
                            <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                              {s.routeName}
                            </TableCell>
                            <TableCell className="tabular text-right text-xs">
                              {new Date(s.etaIso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                            </TableCell>
                            <TableCell className="tabular text-right">{s.riskScore}</TableCell>
                            <TableCell className="text-right">{s.status}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <p className="mt-2 text-xs text-muted-foreground">
                      DEMO / SIMULATED — shipments are stored on this device for the prototype demonstration.
                    </p>
                  </div>
                ) : null}
              </SectionCard>
            </>
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
