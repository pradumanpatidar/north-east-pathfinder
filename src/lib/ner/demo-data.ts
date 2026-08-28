// DEMO DATA — Replace with live government/API data for production.
// Deterministic simulated operational data for the NER-Route AI prototype.

import { SEGMENTS, cityById } from "./geo";
import { segmentAccessibility, segmentDisasterRisk, segmentReliability, segmentSafety } from "./scoring";

export const DEMO_NOTICE = "DEMO DATA — Replace with live government/API data for production.";

export type IncidentType =
  | "Landslide"
  | "Rockfall"
  | "Flood"
  | "Accident"
  | "Road closure"
  | "Heavy rainfall"
  | "Other";

export interface Incident {
  id: string;
  type: IncidentType;
  segmentId: string;
  location: string;
  lat: number;
  lng: number;
  severity: "Low" | "Medium" | "High" | "Critical";
  reportedAt: string;
  status: "Open" | "Under clearance" | "Resolved";
  affectedRoad: string;
  clearanceHours: number;
  note: string;
}

export const INCIDENTS: Incident[] = [
  {
    id: "INC-2401",
    type: "Landslide",
    segmentId: "seg-nh6-jowai-silchar",
    location: "Sonapur, Jaintia Hills (ML)",
    lat: 25.22,
    lng: 92.4,
    severity: "Critical",
    reportedAt: "2026-08-27T05:40:00Z",
    status: "Under clearance",
    affectedRoad: "NH-6",
    clearanceHours: 26,
    note: "Debris across both lanes after 134 mm rainfall; BRO clearance in progress.",
  },
  {
    id: "INC-2402",
    type: "Rockfall",
    segmentId: "seg-nh2-kohima-imphal",
    location: "Maram sector, NH-2 (MN)",
    lat: 25.3,
    lng: 94.05,
    severity: "High",
    reportedAt: "2026-08-27T22:10:00Z",
    status: "Open",
    affectedRoad: "NH-2",
    clearanceHours: 9,
    note: "Intermittent boulder fall; single-lane convoy movement only.",
  },
  {
    id: "INC-2403",
    type: "Flood",
    segmentId: "seg-nh715-tezpur-jorhat",
    location: "Brahmaputra bank, Gohpur (AS)",
    lat: 26.7,
    lng: 93.5,
    severity: "High",
    reportedAt: "2026-08-26T14:05:00Z",
    status: "Open",
    affectedRoad: "NH-715",
    clearanceHours: 34,
    note: "Water over carriageway near embankment breach; LCVs advised to detour.",
  },
  {
    id: "INC-2404",
    type: "Heavy rainfall",
    segmentId: "seg-nh10-siliguri-gangtok",
    location: "Rangpo–Singtam stretch (SK)",
    lat: 27.15,
    lng: 88.55,
    severity: "High",
    reportedAt: "2026-08-28T01:20:00Z",
    status: "Open",
    affectedRoad: "NH-10",
    clearanceHours: 12,
    note: "118 mm/24h; slope saturation raising landslide probability.",
  },
  {
    id: "INC-2405",
    type: "Accident",
    segmentId: "seg-nh29-dimapur-kohima",
    location: "Piphema curve (NL)",
    lat: 25.78,
    lng: 93.92,
    severity: "Medium",
    reportedAt: "2026-08-28T03:55:00Z",
    status: "Under clearance",
    affectedRoad: "NH-29",
    clearanceHours: 3,
    note: "Overturned 16t truck; crane deployed.",
  },
  {
    id: "INC-2406",
    type: "Road closure",
    segmentId: "seg-nh306-silchar-aizawl",
    location: "Vairengte checkpost (MZ)",
    lat: 24.4,
    lng: 92.75,
    severity: "Medium",
    reportedAt: "2026-08-27T09:00:00Z",
    status: "Open",
    affectedRoad: "NH-306",
    clearanceHours: 6,
    note: "Scheduled slope-protection works, night movement restricted.",
  },
  {
    id: "INC-2407",
    type: "Flood",
    segmentId: "seg-nh8-silchar-agartala",
    location: "Kailashahar low-lying section (TR)",
    lat: 24.1,
    lng: 91.6,
    severity: "Low",
    reportedAt: "2026-08-25T11:30:00Z",
    status: "Resolved",
    affectedRoad: "NH-8",
    clearanceHours: 0,
    note: "Water receded; surface damage under repair.",
  },
  {
    id: "INC-2408",
    type: "Landslide",
    segmentId: "seg-nh15-tezpur-itanagar",
    location: "Kimin ghat section (AR)",
    lat: 26.85,
    lng: 93.2,
    severity: "Medium",
    reportedAt: "2026-08-27T18:45:00Z",
    status: "Under clearance",
    affectedRoad: "NH-415",
    clearanceHours: 8,
    note: "Half carriageway lost; 25t+ vehicles restricted.",
  },
];

export const incidentsBySegment: Record<string, number> = INCIDENTS.filter(
  (i) => i.status !== "Resolved",
).reduce<Record<string, number>>((acc, i) => {
  acc[i.segmentId] = (acc[i.segmentId] ?? 0) + 1;
  return acc;
}, {});

export type ShipmentStatus = "Planned" | "In Transit" | "Delayed" | "At Risk" | "Delivered";

export interface Shipment {
  id: string;
  originId: string;
  destinationId: string;
  cargo: string;
  cargoType: string;
  weightTonnes: number;
  vehicle: string;
  priority: "standard" | "high" | "critical";
  routeName: string;
  segmentIds: string[];
  etaIso: string;
  status: ShipmentStatus;
  riskScore: number;
  operator: string;
  delayHours: number;
}

export const SHIPMENTS: Shipment[] = [
  {
    id: "NER-SHP-1042",
    originId: "guwahati",
    destinationId: "aizawl",
    cargo: "Pharmaceuticals (cold chain)",
    cargoType: "pharma",
    weightTonnes: 8,
    vehicle: "Reefer (12t)",
    priority: "critical",
    routeName: "NH-27 → NH-306 via Nagaon & Silchar",
    segmentIds: ["seg-nh27-ghy-nagaon", "seg-nh37-nagaon-silchar", "seg-nh306-silchar-aizawl"],
    etaIso: "2026-08-29T14:00:00Z",
    status: "At Risk",
    riskScore: 68,
    operator: "Brahmaputra Logistics",
    delayHours: 6,
  },
  {
    id: "NER-SHP-1043",
    originId: "guwahati",
    destinationId: "imphal",
    cargo: "Consumer FMCG",
    cargoType: "general",
    weightTonnes: 16,
    vehicle: "Truck (16t)",
    priority: "high",
    routeName: "NH-27 → NH-29 → NH-2",
    segmentIds: [
      "seg-nh27-ghy-nagaon",
      "seg-nh27-nagaon-dimapur",
      "seg-nh29-dimapur-kohima",
      "seg-nh2-kohima-imphal",
    ],
    etaIso: "2026-08-29T22:30:00Z",
    status: "Delayed",
    riskScore: 74,
    operator: "NE Freight Movers",
    delayHours: 11,
  },
  {
    id: "NER-SHP-1044",
    originId: "siliguri",
    destinationId: "gangtok",
    cargo: "Cement & steel",
    cargoType: "construction",
    weightTonnes: 20,
    vehicle: "Trailer (25t)",
    priority: "standard",
    routeName: "NH-10 Sevoke corridor",
    segmentIds: ["seg-nh10-siliguri-gangtok"],
    etaIso: "2026-08-28T16:00:00Z",
    status: "At Risk",
    riskScore: 81,
    operator: "Teesta Carriers",
    delayHours: 4,
  },
  {
    id: "NER-SHP-1045",
    originId: "guwahati",
    destinationId: "agartala",
    cargo: "Relief supplies (MDoNER)",
    cargoType: "relief",
    weightTonnes: 12,
    vehicle: "Truck (16t)",
    priority: "critical",
    routeName: "NH-27 → NH-306 → NH-8",
    segmentIds: ["seg-nh27-ghy-nagaon", "seg-nh37-nagaon-silchar", "seg-nh8-silchar-agartala"],
    etaIso: "2026-08-30T09:00:00Z",
    status: "In Transit",
    riskScore: 52,
    operator: "MDoNER Relief Cell",
    delayHours: 0,
  },
  {
    id: "NER-SHP-1046",
    originId: "dibrugarh",
    destinationId: "jorhat",
    cargo: "Tea consignment (export)",
    cargoType: "perishable",
    weightTonnes: 9,
    vehicle: "Truck (9t)",
    priority: "high",
    routeName: "NH-37",
    segmentIds: ["seg-nh37-jorhat-dibrugarh"],
    etaIso: "2026-08-28T12:00:00Z",
    status: "In Transit",
    riskScore: 31,
    operator: "Assam Tea Logistics",
    delayHours: 0,
  },
  {
    id: "NER-SHP-1047",
    originId: "guwahati",
    destinationId: "shillong",
    cargo: "Electronics",
    cargoType: "general",
    weightTonnes: 6,
    vehicle: "LCV (3.5t)",
    priority: "standard",
    routeName: "NH-6",
    segmentIds: ["seg-nh6-ghy-shillong"],
    etaIso: "2026-08-28T10:30:00Z",
    status: "Delivered",
    riskScore: 24,
    operator: "Hills Express",
    delayHours: 0,
  },
  {
    id: "NER-SHP-1048",
    originId: "tezpur",
    destinationId: "itanagar",
    cargo: "Road construction material",
    cargoType: "construction",
    weightTonnes: 22,
    vehicle: "Trailer (25t)",
    priority: "standard",
    routeName: "NH-15 → NH-415",
    segmentIds: ["seg-nh15-tezpur-itanagar"],
    etaIso: "2026-08-29T07:00:00Z",
    status: "Planned",
    riskScore: 57,
    operator: "Siang Infra",
    delayHours: 0,
  },
  {
    id: "NER-SHP-1049",
    originId: "guwahati",
    destinationId: "tura",
    cargo: "Fertiliser",
    cargoType: "general",
    weightTonnes: 14,
    vehicle: "Truck (16t)",
    priority: "standard",
    routeName: "NH-17",
    segmentIds: ["seg-nh17-ghy-tura"],
    etaIso: "2026-08-29T18:00:00Z",
    status: "In Transit",
    riskScore: 38,
    operator: "Garo Hills Transport",
    delayHours: 2,
  },
];

export type AlertKind =
  | "Route blocked"
  | "High disaster risk"
  | "Severe rainfall"
  | "Shipment delay"
  | "Unsafe route"
  | "Accessibility deterioration";

export interface Alert {
  id: string;
  kind: AlertKind;
  severity: "Info" | "Warning" | "Critical";
  location: string;
  issuedAt: string;
  affectedRoute: string;
  action: string;
  acknowledged: boolean;
}

export const ALERTS: Alert[] = [
  {
    id: "ALR-901",
    kind: "Route blocked",
    severity: "Critical",
    location: "Sonapur, NH-6 (ML)",
    issuedAt: "2026-08-27T05:45:00Z",
    affectedRoute: "Shillong → Silchar",
    action: "Divert all Barak Valley freight via NH-27 / NH-306 (Nagaon – Silchar).",
    acknowledged: false,
  },
  {
    id: "ALR-902",
    kind: "High disaster risk",
    severity: "Critical",
    location: "NH-10 Rangpo–Singtam (SK)",
    issuedAt: "2026-08-28T01:25:00Z",
    affectedRoute: "Siliguri → Gangtok",
    action: "Hold 20t+ movement for 12 h; re-assess after rainfall advisory.",
    acknowledged: false,
  },
  {
    id: "ALR-903",
    kind: "Severe rainfall",
    severity: "Warning",
    location: "Jaintia & Khasi Hills (ML)",
    issuedAt: "2026-08-28T00:10:00Z",
    affectedRoute: "Guwahati → Shillong → Jowai",
    action: "Restrict night movement; add 3 h buffer to all ETAs.",
    acknowledged: false,
  },
  {
    id: "ALR-904",
    kind: "Shipment delay",
    severity: "Warning",
    location: "Kohima sector (NL)",
    issuedAt: "2026-08-28T04:00:00Z",
    affectedRoute: "NER-SHP-1043 · Guwahati → Imphal",
    action: "Notify consignee; ETA slipped by 11 h due to convoy regulation.",
    acknowledged: true,
  },
  {
    id: "ALR-905",
    kind: "Unsafe route",
    severity: "Warning",
    location: "NH-2 Maram sector (MN)",
    issuedAt: "2026-08-27T22:15:00Z",
    affectedRoute: "Kohima → Imphal",
    action: "Rockfall active — use daylight convoy window 06:00–16:00 IST only.",
    acknowledged: false,
  },
  {
    id: "ALR-906",
    kind: "Accessibility deterioration",
    severity: "Info",
    location: "NH-415 Kimin ghat (AR)",
    issuedAt: "2026-08-27T19:00:00Z",
    affectedRoute: "Tezpur → Itanagar",
    action: "Half carriageway lost — cap vehicle weight at 25t until repair.",
    acknowledged: false,
  },
];

/** Derived corridor risk & accessibility register used by Disaster and Accessibility pages. */
export const CORRIDOR_REGISTER = SEGMENTS.map((s) => ({
  segment: s,
  safety: segmentSafety(s),
  accessibility: segmentAccessibility(s),
  reliability: segmentReliability(s),
  risk: segmentDisasterRisk(s),
  incidents: incidentsBySegment[s.id] ?? 0,
  fromName: cityById(s.from)?.name ?? s.from,
  toName: cityById(s.to)?.name ?? s.to,
}));

export const regionalRisk = Math.round(
  CORRIDOR_REGISTER.reduce((a, c) => a + c.risk, 0) / CORRIDOR_REGISTER.length,
);

// ---- Analytics series (simulated) ----
export const FREIGHT_TREND = [
  { month: "Mar", shipments: 412, delivered: 388, delayed: 24 },
  { month: "Apr", shipments: 455, delivered: 421, delayed: 34 },
  { month: "May", shipments: 498, delivered: 430, delayed: 68 },
  { month: "Jun", shipments: 521, delivered: 402, delayed: 119 },
  { month: "Jul", shipments: 540, delivered: 388, delayed: 152 },
  { month: "Aug", shipments: 512, delivered: 371, delayed: 141 },
];

export const DELAY_TREND = [
  { month: "Mar", avgDelayHrs: 3.1, monsoonIndex: 18 },
  { month: "Apr", avgDelayHrs: 4.4, monsoonIndex: 34 },
  { month: "May", avgDelayHrs: 6.8, monsoonIndex: 58 },
  { month: "Jun", avgDelayHrs: 11.2, monsoonIndex: 82 },
  { month: "Jul", avgDelayHrs: 13.6, monsoonIndex: 94 },
  { month: "Aug", avgDelayHrs: 12.1, monsoonIndex: 88 },
];

export const INCIDENT_FREQUENCY = [
  { type: "Landslide", count: 42 },
  { type: "Rockfall", count: 27 },
  { type: "Flood", count: 33 },
  { type: "Accident", count: 19 },
  { type: "Road closure", count: 24 },
  { type: "Heavy rainfall", count: 38 },
];

export const STATE_ACCESSIBILITY = [
  { state: "Assam", score: 78 },
  { state: "Meghalaya", score: 61 },
  { state: "Tripura", score: 69 },
  { state: "Mizoram", score: 52 },
  { state: "Manipur", score: 47 },
  { state: "Nagaland", score: 55 },
  { state: "Arunachal", score: 49 },
  { state: "Sikkim", score: 44 },
];

export const RISK_TREND = [
  { week: "W-9", landslide: 38, flood: 44, rainfall: 40 },
  { week: "W-7", landslide: 46, flood: 52, rainfall: 55 },
  { week: "W-5", landslide: 58, flood: 61, rainfall: 68 },
  { week: "W-3", landslide: 69, flood: 57, rainfall: 78 },
  { week: "W-1", landslide: 74, flood: 49, rainfall: 82 },
  { week: "Now", landslide: 71, flood: 46, rainfall: 76 },
];

export const COST_COMPARISON = [
  { corridor: "GHY–IMF", safest: 96500, fastest: 88400, cheapest: 81200 },
  { corridor: "GHY–AJL", safest: 104300, fastest: 99100, cheapest: 92800 },
  { corridor: "GHY–AGT", safest: 112400, fastest: 108900, cheapest: 99600 },
  { corridor: "SLG–GTK", safest: 42100, fastest: 39800, cheapest: 36400 },
  { corridor: "GHY–ITA", safest: 58700, fastest: 55200, cheapest: 51900 },
];
