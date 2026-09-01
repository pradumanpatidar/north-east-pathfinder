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

/**
 * Aggregated live impact of open incidents on a single road segment.
 * Produced by `buildSegmentImpacts` (demo register + field-officer reports).
 */
export interface SegmentImpact {
  count: number;
  riskDelta: number; // added to composite disaster risk
  accessDelta: number; // subtracted from accessibility
  reliabilityDelta: number; // subtracted from reliability
  blocking: boolean;
  labels: string[];
}

export type ImpactMap = Record<string, number | SegmentImpact>;

export const EMPTY_IMPACT: SegmentImpact = {
  count: 0,
  riskDelta: 0,
  accessDelta: 0,
  reliabilityDelta: 0,
  blocking: false,
  labels: [],
};

function asImpact(v: number | SegmentImpact | undefined): SegmentImpact {
  if (!v) return EMPTY_IMPACT;
  if (typeof v === "number")
    return { count: v, riskDelta: v * 7, accessDelta: v * 6, reliabilityDelta: v * 6, blocking: false, labels: [] };
  return v;
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
  incidentLabels: string[];
  unsuitableSegments: string[];
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

function evaluate(segments: CorridorSegment[], req: RouteRequest, impacts: ImpactMap) {
  const vehicle = VEHICLE[req.vehicleType];
  const distanceKm = segments.reduce((a, s) => a + s.lengthKm, 0);
  const imp = (s: CorridorSegment) => asImpact(impacts[s.id]);

  let hours = 0;
  for (const s of segments) {
    const base = s.lengthKm / TERRAIN_SPEED[s.terrain];
    const weatherPenalty = 1 + Math.min(0.45, s.rainfallMm24h / 320);
    const conditionPenalty = 1 + (100 - s.roadCondition) / 260;
    // Open incidents slow movement (single-lane convoys, clearance halts).
    const incidentPenalty = 1 + Math.min(0.6, imp(s).riskDelta / 90);
    hours += base * weatherPenalty * conditionPenalty * incidentPenalty;
  }
  hours += segments.length * 0.4; // checkposts / halts

  const tollAndPermits = segments.length * 850;
  const detourFactor = 1 + Math.max(0, req.weightTonnes - vehicle.capacity) * 0.08;
  const costInr = Math.round((distanceKm * vehicle.costPerKm + tollAndPermits) * detourFactor);

  const w = (fn: (s: CorridorSegment) => number) =>
    segments.reduce((a, s) => a + fn(s) * s.lengthKm, 0) / Math.max(1, distanceKm);

  const safetyScore = clamp(round(w((s) => segmentSafety(s) - imp(s).riskDelta * 0.55)));
  const accessibilityScore = clamp(
    round(w((s) => segmentAccessibility(s, req.weightTonnes) - imp(s).accessDelta)),
  );
  const reliabilityScore = clamp(round(w((s) => segmentReliability(s) - imp(s).reliabilityDelta)));
  const disasterRisk = clamp(round(w((s) => segmentDisasterRisk(s) + imp(s).riskDelta)));
  const incidentCount = segments.reduce((a, s) => a + imp(s).count, 0);
  const incidentLabels = segments.flatMap((s) => imp(s).labels);
  const closures = segments
    .filter((s) => s.closed || imp(s).blocking)
    .map((s) => `${s.highway} · ${s.name}`);
  // Vehicle suitability: hill segments refuse loads above their rated capacity.
  const unsuitableSegments = segments
    .filter((s) => req.weightTonnes > s.maxVehicleTonnes)
    .map((s) => `${s.highway} · ${s.name} (max ${s.maxVehicleTonnes}t)`);
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
    incidentLabels,
    unsuitableSegments,
    closures,
    co2Kg,
  };
}


export function planRoutes(req: RouteRequest, impacts: ImpactMap = {}): RouteOption[] {
  const raw = findPaths(req.originId, req.destinationId);
  if (!raw.length) return [];

  const evaluated = raw.map((segments) => ({ segments, m: evaluate(segments, req, impacts) }));

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
    // Vehicle suitability: a heavy load on an under-rated hill segment is penalised hard.
    weightedTotal -= Math.min(24, e.m.unsuitableSegments.length * 12);
    if ((req.hazardous || req.perishable) && e.m.disasterRisk > 60) weightedTotal -= 8;
    if (e.m.incidentCount > 0) weightedTotal -= Math.min(12, e.m.incidentCount * 4);
    if (e.m.travelHours > req.maxDelayHours + 24) weightedTotal -= 6;
    if (req.priority === "critical" && e.m.reliabilityScore < 50) weightedTotal -= 5;

    return { ...e, key: e.segments.map((s) => s.id).join("|"), breakdown, weightedTotal: clamp(round(weightedTotal, 1)) };
  });

  type Entry = (typeof scored)[number];
  const bestBy = (pool: Entry[], cmp: (a: Entry, b: Entry) => number) => [...pool].sort(cmp)[0];

  // Pick three *distinct* alignments so the alternatives are genuinely different.
  const used = new Set<string>();
  const take = (cmp: (a: Entry, b: Entry) => number): Entry | undefined => {
    const pool = scored.filter((e) => !used.has(e.key));
    const chosen = bestBy(pool.length ? pool : scored, cmp);
    if (chosen) used.add(chosen.key);
    return chosen;
  };

  const safest = take((a, b) => b.breakdown.safety - a.breakdown.safety || a.m.travelHours - b.m.travelHours);
  const fastest = take((a, b) => a.m.travelHours - b.m.travelHours);
  const cheapest = take((a, b) => a.m.costInr - b.m.costInr);

  const build = (entry: Entry, label: RouteOption["label"], idx: number): RouteOption => {
    const reasons: string[] = [];
    if (label === "Safest Route")
      reasons.push(`Highest weighted safety score (${entry.breakdown.safety}/100) across the corridor.`);
    if (label === "Fastest Route")
      reasons.push(`Shortest estimated transit time (${entry.m.travelHours} h) of all evaluated paths.`);
    if (label === "Cheapest Route")
      reasons.push(`Lowest estimated freight cost (₹${entry.m.costInr.toLocaleString("en-IN")}).`);
    if (entry.m.closures.length)
      reasons.push(`Blocked: ${entry.m.closures.join(", ")} — heavy penalty applied.`);
    if (entry.m.unsuitableSegments.length)
      reasons.push(
        `Vehicle unsuitable for ${entry.m.unsuitableSegments.join(", ")} at ${req.weightTonnes}t gross load.`,
      );
    if (entry.m.disasterRisk >= 60)
      reasons.push(`Elevated disaster risk (${entry.m.disasterRisk}/100) from landslide/rainfall exposure.`);
    if (entry.m.disasterRisk < 40)
      reasons.push(`Low composite disaster exposure (${entry.m.disasterRisk}/100).`);
    if (entry.m.accessibilityScore < 55)
      reasons.push(`Accessibility is constrained (${entry.m.accessibilityScore}/100) — narrow hill sections.`);
    if (entry.m.incidentCount > 0)
      reasons.push(
        `${entry.m.incidentCount} open incident(s) on this alignment: ${entry.m.incidentLabels.join("; ")}.`,
      );
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

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round(((a - b) / b) * 100));

/**
 * Dynamic, data-derived explanation of why `option` beats the strongest alternative.
 * Never returns the same sentence for two different routes.
 */
export function explainRecommendation(option: RouteOption, all: RouteOption[]): string {
  const rival = all
    .filter((r) => r.id !== option.id)
    .sort((a, b) => b.weightedTotal - a.weightedTotal)[0];
  if (!rival) return `Only one viable alignment exists in the demo corridor network (score ${option.weightedTotal}/100).`;

  const parts: string[] = [];
  const dKm = option.distanceKm - rival.distanceKm;
  const dHrs = round(option.travelHours - rival.travelHours, 1);
  const dCost = option.costInr - rival.costInr;
  const riskDelta = pct(option.disasterRisk, rival.disasterRisk);
  const relDelta = pct(option.reliabilityScore, rival.reliabilityScore);
  const accDelta = pct(option.accessibilityScore, rival.accessibilityScore);

  if (riskDelta < 0) parts.push(`${Math.abs(riskDelta)}% lower predicted disaster exposure`);
  if (relDelta > 0) parts.push(`${relDelta}% higher reliability`);
  if (accDelta > 0) parts.push(`${accDelta}% better accessibility`);
  if (option.incidentCount < rival.incidentCount)
    parts.push(`${rival.incidentCount - option.incidentCount} fewer open incident(s)`);
  if (!option.closures.length && rival.closures.length) parts.push("no active road closure");
  if (dHrs < 0) parts.push(`${Math.abs(dHrs)} h faster`);
  if (dCost < 0) parts.push(`₹${Math.abs(dCost).toLocaleString("en-IN")} cheaper`);

  const tradeoffs: string[] = [];
  if (dKm > 0) tradeoffs.push(`${dKm} km longer`);
  if (dHrs > 0) tradeoffs.push(`${dHrs} h slower`);
  if (dCost > 0) tradeoffs.push(`₹${dCost.toLocaleString("en-IN")} more expensive`);

  const gain = parts.length ? parts.join(", ") : `a higher weighted score (${option.weightedTotal} vs ${rival.weightedTotal})`;
  const cost = tradeoffs.length ? ` despite being ${tradeoffs.join(" and ")}` : "";
  return `Recommended because ${option.label} has ${gain} than the ${rival.label}${cost}.`;
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
