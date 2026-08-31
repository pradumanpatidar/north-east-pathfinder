// Explainable freight route scoring engine.
// Deterministic, transparent and fully client-side so judges can audit every number.

import { CITIES, SEGMENTS, cityById, type CorridorSegment } from "./geo";

export const SCORE_WEIGHTS = {
  safety: 0.35,
  accessibility: 0.2,
  time: 0.15,
  cost: 0.1,
  reliability: 0.1,
  environment: 0.1,
} as const;

export const EMERGENCY_WEIGHTS = {
  safety: 0.45,
  accessibility: 0.3,
  time: 0.15,
  cost: 0.0,
  reliability: 0.1,
  environment: 0.0,
} as const;

export type CargoType =
  | "general"
  | "perishable"
  | "hazardous"
  | "construction"
  | "pharma"
  | "fuel"
  | "relief";

export type VehicleType = "lcv" | "truck-9t" | "truck-16t" | "trailer-25t" | "reefer";

export interface RouteRequest {
  originId: string;
  destinationId: string;
  cargoType: CargoType;
  weightTonnes: number;
  vehicleType: VehicleType;
  priority: "standard" | "high" | "critical";
  maxDelayHours: number;
  hazardous: boolean;
  perishable: boolean;
  emergencyMode: boolean;
}

export interface ScoreBreakdown {
  safety: number;
  accessibility: number;
  time: number;
  cost: number;
  reliability: number;
  environment: number;
}

export interface RouteOption {
  id: string;
  label: "Safest Route" | "Fastest Route" | "Cheapest Route";
  segments: CorridorSegment[];
  path: [number, number][];
  waypoints: string[];
  distanceKm: number;
  travelHours: number;
  costInr: number;
  safetyScore: number;
  accessibilityScore: number;
  reliabilityScore: number;
  disasterRisk: number;
  incidentCount: number;
  closures: string[];
  co2Kg: number;
  breakdown: ScoreBreakdown;
  weightedTotal: number;
  reasons: string[];
  recommended: boolean;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number, d = 0) => Number(n.toFixed(d));

const TERRAIN_SPEED: Record<CorridorSegment["terrain"], number> = {
  plain: 52,
  rolling: 44,
  hilly: 34,
  mountain: 24,
};

const TERRAIN_DIFFICULTY: Record<CorridorSegment["terrain"], number> = {
  plain: 5,
  rolling: 20,
  hilly: 45,
  mountain: 75,
};

const VEHICLE = {
  lcv: { label: "LCV (3.5t)", capacity: 3.5, costPerKm: 26, co2PerKm: 0.35 },
  "truck-9t": { label: "Truck (9t)", capacity: 9, costPerKm: 42, co2PerKm: 0.62 },
  "truck-16t": { label: "Truck (16t)", capacity: 16, costPerKm: 58, co2PerKm: 0.84 },
  "trailer-25t": { label: "Trailer (25t)", capacity: 25, costPerKm: 78, co2PerKm: 1.12 },
  reefer: { label: "Reefer (12t)", capacity: 12, costPerKm: 71, co2PerKm: 0.98 },
} as const;

export const VEHICLES = VEHICLE;

/** Accessibility score (0-100) for one road segment. Higher = easier to move freight. */
export function segmentAccessibility(seg: CorridorSegment, vehicleTonnes = 16): number {
  if (seg.closed) return 4;
  const condition = seg.roadCondition * 0.3;
  const weather = (100 - Math.min(100, seg.rainfallMm24h * 0.7)) * 0.2;
  const disaster = (100 - Math.max(seg.landslideRisk, seg.floodRisk)) * 0.2;
  const terrain = (100 - TERRAIN_DIFFICULTY[seg.terrain]) * 0.15;
  const suitability = (vehicleTonnes <= seg.maxVehicleTonnes ? 100 : 35) * 0.1;
  const connectivity = (seg.laneWidthM >= 7 ? 100 : seg.laneWidthM >= 6 ? 72 : 48) * 0.05;
  return clamp(round(condition + weather + disaster + terrain + suitability + connectivity));
}

/** Safety score (0-100) for one road segment. */
export function segmentSafety(seg: CorridorSegment): number {
  if (seg.closed) return 6;
  const hazard = seg.landslideRisk * 0.45 + seg.floodRisk * 0.25 + Math.min(100, seg.rainfallMm24h * 0.6) * 0.15;
  const road = (100 - seg.roadCondition) * 0.15;
  return clamp(round(100 - (hazard + road)));
}

export function segmentDisasterRisk(seg: CorridorSegment): number {
  return clamp(
    round(
      seg.landslideRisk * 0.4 +
        seg.floodRisk * 0.25 +
        Math.min(100, seg.rainfallMm24h * 0.65) * 0.2 +
        TERRAIN_DIFFICULTY[seg.terrain] * 0.1 +
        (100 - seg.roadCondition) * 0.05,
    ),
  );
}

export function segmentReliability(seg: CorridorSegment): number {
  if (seg.closed) return 5;
  return clamp(round(100 - (segmentDisasterRisk(seg) * 0.6 + (100 - seg.roadCondition) * 0.4)));
}

// ---------- Path finding over the corridor graph ----------

interface Graph {
  [cityId: string]: { to: string; seg: CorridorSegment }[];
}

function buildGraph(): Graph {
  const g: Graph = {};
  for (const seg of SEGMENTS) {
    (g[seg.from] ??= []).push({ to: seg.to, seg });
    (g[seg.to] ??= []).push({ to: seg.from, seg });
  }
  return g;
}

function findPaths(from: string, to: string, limit = 12): CorridorSegment[][] {
  const graph = buildGraph();
  const out: CorridorSegment[][] = [];
  const walk = (node: string, visited: Set<string>, acc: CorridorSegment[]) => {
    if (out.length >= limit || acc.length > 6) return;
    if (node === to && acc.length) {
      out.push([...acc]);
      return;
    }
    for (const edge of graph[node] ?? []) {
      if (visited.has(edge.to)) continue;
      visited.add(edge.to);
      acc.push(edge.seg);
      walk(edge.to, visited, acc);
      acc.pop();
      visited.delete(edge.to);
    }
  };
  walk(from, new Set([from]), []);
  return out;
}

function orderedPath(segments: CorridorSegment[], originId: string): [number, number][] {
  const coords: [number, number][] = [];
  let cur = originId;
  for (const seg of segments) {
    const fwd = seg.from === cur;
    const pts = fwd ? seg.path : [...seg.path].reverse();
    for (const p of pts) coords.push(p);
    cur = fwd ? seg.to : seg.from;
  }
  return coords;
}

function waypointNames(segments: CorridorSegment[], originId: string): string[] {
  const names: string[] = [cityById(originId)?.name ?? originId];
  let cur = originId;
  for (const seg of segments) {
    const next = seg.from === cur ? seg.to : seg.from;
    names.push(cityById(next)?.name ?? next);
    cur = next;
  }
  return names;
}

// ---------- Route evaluation ----------

function evaluate(
  segments: CorridorSegment[],
  req: RouteRequest,
  incidentsBySegment: Record<string, number>,
) {
  const vehicle = VEHICLE[req.vehicleType];
  const distanceKm = segments.reduce((a, s) => a + s.lengthKm, 0);

  let hours = 0;
  for (const s of segments) {
    const base = s.lengthKm / TERRAIN_SPEED[s.terrain];
    const weatherPenalty = 1 + Math.min(0.45, s.rainfallMm24h / 320);
    const conditionPenalty = 1 + (100 - s.roadCondition) / 260;
    hours += base * weatherPenalty * conditionPenalty;
  }
  hours += segments.length * 0.4; // checkposts / halts

  const tollAndPermits = segments.length * 850;
  const detourFactor = 1 + Math.max(0, req.weightTonnes - vehicle.capacity) * 0.08;
  const costInr = Math.round((distanceKm * vehicle.costPerKm + tollAndPermits) * detourFactor);

  const w = (fn: (s: CorridorSegment) => number) =>
    segments.reduce((a, s) => a + fn(s) * s.lengthKm, 0) / Math.max(1, distanceKm);

  const safetyScore = clamp(round(w(segmentSafety)));
  const accessibilityScore = clamp(round(w((s) => segmentAccessibility(s, req.weightTonnes))));
  const reliabilityScore = clamp(round(w(segmentReliability)));
  const disasterRisk = clamp(round(w(segmentDisasterRisk)));
  const incidentCount = segments.reduce((a, s) => a + (incidentsBySegment[s.id] ?? 0), 0);
  const closures = segments.filter((s) => s.closed).map((s) => `${s.highway} · ${s.name}`);
  const co2Kg = round(distanceKm * vehicle.co2PerKm, 1);

  return {
    distanceKm: round(distanceKm),
    travelHours: round(hours, 1),
    costInr,
    safetyScore,
    accessibilityScore,
    reliabilityScore,
    disasterRisk,
    incidentCount,
    closures,
    co2Kg,
  };
}

export function planRoutes(
  req: RouteRequest,
  incidentsBySegment: Record<string, number> = {},
): RouteOption[] {
  const raw = findPaths(req.originId, req.destinationId);
  if (!raw.length) return [];

  const evaluated = raw.map((segments) => ({ segments, m: evaluate(segments, req, incidentsBySegment) }));

  const maxTime = Math.max(...evaluated.map((e) => e.m.travelHours));
  const minTime = Math.min(...evaluated.map((e) => e.m.travelHours));
  const maxCost = Math.max(...evaluated.map((e) => e.m.costInr));
  const minCost = Math.min(...evaluated.map((e) => e.m.costInr));
  const maxCo2 = Math.max(...evaluated.map((e) => e.m.co2Kg));
  const minCo2 = Math.min(...evaluated.map((e) => e.m.co2Kg));
  const norm = (v: number, lo: number, hi: number) => (hi === lo ? 100 : clamp(round(100 - ((v - lo) / (hi - lo)) * 100)));

  const weights = req.emergencyMode ? EMERGENCY_WEIGHTS : SCORE_WEIGHTS;

  const scored = evaluated.map((e) => {
    const breakdown: ScoreBreakdown = {
      safety: e.m.safetyScore,
      accessibility: e.m.accessibilityScore,
      time: norm(e.m.travelHours, minTime, maxTime),
      cost: norm(e.m.costInr, minCost, maxCost),
      reliability: e.m.reliabilityScore,
      environment: norm(e.m.co2Kg, minCo2, maxCo2),
    };
    let weightedTotal =
      breakdown.safety * weights.safety +
      breakdown.accessibility * weights.accessibility +
      breakdown.time * weights.time +
      breakdown.cost * weights.cost +
      breakdown.reliability * weights.reliability +
      breakdown.environment * weights.environment;

    if (e.m.closures.length) weightedTotal -= 30;
    if ((req.hazardous || req.perishable) && e.m.disasterRisk > 60) weightedTotal -= 8;
    if (e.m.travelHours > req.maxDelayHours + 24) weightedTotal -= 6;

    return { ...e, breakdown, weightedTotal: clamp(round(weightedTotal, 1)) };
  });

  const pick = (cmp: (a: typeof scored[number], b: typeof scored[number]) => number) =>
    [...scored].sort(cmp)[0];

  const safest = pick((a, b) => b.breakdown.safety - a.breakdown.safety || a.m.travelHours - b.m.travelHours);
  const fastest = pick((a, b) => a.m.travelHours - b.m.travelHours);
  const cheapest = pick((a, b) => a.m.costInr - b.m.costInr);

  const build = (
    entry: typeof scored[number],
    label: RouteOption["label"],
    idx: number,
  ): RouteOption => {
    const reasons: string[] = [];
    if (label === "Safest Route")
      reasons.push(`Highest weighted safety score (${entry.breakdown.safety}/100) across the corridor.`);
    if (label === "Fastest Route")
      reasons.push(`Shortest estimated transit time (${entry.m.travelHours} h) of all evaluated paths.`);
    if (label === "Cheapest Route")
      reasons.push(`Lowest estimated freight cost (₹${entry.m.costInr.toLocaleString("en-IN")}).`);
    if (entry.m.closures.length)
      reasons.push(`Blocked: ${entry.m.closures.join(", ")} — heavy penalty applied.`);
    if (entry.m.disasterRisk >= 60)
      reasons.push(`Elevated disaster risk (${entry.m.disasterRisk}/100) from landslide/rainfall exposure.`);
    if (entry.m.disasterRisk < 40)
      reasons.push(`Low composite disaster exposure (${entry.m.disasterRisk}/100).`);
    if (entry.m.accessibilityScore < 55)
      reasons.push(`Accessibility is constrained (${entry.m.accessibilityScore}/100) — narrow hill sections.`);
    if (entry.m.incidentCount > 0)
      reasons.push(`${entry.m.incidentCount} open incident(s) reported on this alignment.`);
    if (req.emergencyMode)
      reasons.push("Emergency Mode active: cost and emissions weighting removed in favour of safety and access.");

    return {
      id: `route-${idx}-${label.toLowerCase().replace(/\s+/g, "-")}`,
      label,
      segments: entry.segments,
      path: orderedPath(entry.segments, req.originId),
      waypoints: waypointNames(entry.segments, req.originId),
      ...entry.m,
      breakdown: entry.breakdown,
      weightedTotal: entry.weightedTotal,
      reasons,
      recommended: false,
    };
  };

  const candidates = [
    [safest, "Safest Route", 1] as const,
    [fastest, "Fastest Route", 2] as const,
    [cheapest, "Cheapest Route", 3] as const,
  ].filter((c) => Boolean(c[0]));

  const built = candidates.map(([entry, label, rank]) => build(entry!, label, rank));
  // Collapse duplicates: on sparse corridors the same alignment can win several categories.
  const seen = new Set<string>();
  const options = built.filter((o) => {
    const key = o.segments.map((s) => s.id).join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!options.length) return [];

  const best = [...options].sort((a, b) => b.weightedTotal - a.weightedTotal)[0]!;
  return options.map((o) => ({ ...o, recommended: o.id === best.id }));

}

export const cityOptions = CITIES.map((c) => ({ value: c.id, label: `${c.name} (${c.state})` }));

export function riskBand(score: number): { label: string; tone: "low" | "moderate" | "high" | "severe" } {
  if (score >= 75) return { label: "Severe", tone: "severe" };
  if (score >= 55) return { label: "High", tone: "high" };
  if (score >= 35) return { label: "Moderate", tone: "moderate" };
  return { label: "Low", tone: "low" };
}

export function accessBand(score: number): { label: string; tone: "low" | "moderate" | "high" } {
  if (score >= 70) return { label: "Accessible", tone: "high" };
  if (score >= 45) return { label: "Moderate", tone: "moderate" };
  return { label: "Difficult", tone: "low" };
}
