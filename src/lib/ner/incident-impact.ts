// Converts open incidents (demo register + field-officer reports) into per-segment
// risk / accessibility / reliability penalties consumed by the routing engine.
// DEMO / SIMULATED DATA — weightings are prototype heuristics, not a validated model.

import type { Incident } from "./demo-data";
import type { SegmentImpact } from "./scoring";

const SEVERITY_WEIGHT: Record<Incident["severity"], number> = {
  Low: 1,
  Medium: 2,
  High: 3.2,
  Critical: 4.5,
};

const TYPE_WEIGHT: Record<string, number> = {
  Landslide: 1.35,
  Rockfall: 1.25,
  Flood: 1.2,
  "Road closure": 1.3,
  "Heavy rainfall": 1.0,
  Accident: 0.8,
  Other: 0.8,
};

const STATUS_WEIGHT: Record<Incident["status"], number> = {
  Open: 1,
  "Under clearance": 0.75,
  Resolved: 0,
};

export function buildSegmentImpacts(incidents: Incident[]): Record<string, SegmentImpact> {
  const out: Record<string, SegmentImpact> = {};
  for (const inc of incidents) {
    const status = STATUS_WEIGHT[inc.status];
    if (!status) continue;
    const w = SEVERITY_WEIGHT[inc.severity] * (TYPE_WEIGHT[inc.type] ?? 1) * status;
    const cur =
      out[inc.segmentId] ??
      (out[inc.segmentId] = {
        count: 0,
        riskDelta: 0,
        accessDelta: 0,
        reliabilityDelta: 0,
        blocking: false,
        labels: [],
      });
    cur.count += 1;
    cur.riskDelta = Math.min(60, cur.riskDelta + w * 6);
    cur.accessDelta = Math.min(55, cur.accessDelta + w * 5.5);
    cur.reliabilityDelta = Math.min(55, cur.reliabilityDelta + w * 5.5);
    cur.blocking =
      cur.blocking ||
      (inc.severity === "Critical" && (inc.type === "Landslide" || inc.type === "Road closure"));
    cur.labels.push(`${inc.type} · ${inc.severity} · ${inc.affectedRoad}`);
  }
  return out;
}
