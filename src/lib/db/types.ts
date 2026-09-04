// Row shapes for the operational tables, mapped to the domain types the app already uses.

import type { Incident, IncidentType, Shipment, ShipmentStatus } from "../ner/demo-data";

export interface IncidentRow {
  id: string;
  code: string;
  type: string;
  segment_id: string | null;
  location: string;
  lat: number;
  lng: number;
  severity: string;
  status: string;
  affected_road: string;
  clearance_hours: number;
  note: string;
  photo_url: string | null;
  source: string;
  reported_at: string;
  updated_at: string;
}

export interface ShipmentRow {
  id: string;
  code: string;
  origin_id: string;
  destination_id: string;
  cargo: string;
  cargo_type: string;
  weight_tonnes: number;
  vehicle: string;
  priority: string;
  route_name: string;
  segment_ids: string[];
  eta: string | null;
  status: string;
  risk_score: number;
  operator: string;
  delay_hours: number;
}

export interface AlertRow {
  id: string;
  kind: string;
  severity: "Info" | "Warning" | "Critical";
  title: string;
  body: string;
  segment_id: string | null;
  shipment_code: string | null;
  incident_id: string | null;
  acknowledged: boolean;
  source: string;
  created_at: string;
}

export interface IncidentRecord extends Incident {
  uuid: string;
  source: string;
  photoUrl: string | null;
  syncState: "synced" | "pending";
}

export function rowToIncident(r: IncidentRow): IncidentRecord {
  return {
    uuid: r.id,
    id: r.code,
    type: r.type as IncidentType,
    segmentId: r.segment_id ?? "",
    location: r.location,
    lat: r.lat,
    lng: r.lng,
    severity: r.severity as Incident["severity"],
    reportedAt: r.reported_at,
    status: r.status as Incident["status"],
    affectedRoad: r.affected_road,
    clearanceHours: r.clearance_hours,
    note: r.note,
    source: r.source,
    photoUrl: r.photo_url,
    syncState: "synced",
  };
}

export function rowToShipment(r: ShipmentRow): Shipment & { uuid: string } {
  return {
    uuid: r.id,
    id: r.code,
    originId: r.origin_id,
    destinationId: r.destination_id,
    cargo: r.cargo,
    cargoType: r.cargo_type as Shipment["cargoType"],
    weightTonnes: Number(r.weight_tonnes),
    vehicle: r.vehicle,
    priority: r.priority as Shipment["priority"],
    routeName: r.route_name,
    segmentIds: r.segment_ids ?? [],
    etaIso: r.eta ?? new Date().toISOString(),
    status: r.status as ShipmentStatus,
    riskScore: r.risk_score,
    operator: r.operator,
    delayHours: Number(r.delay_hours),
  };
}
