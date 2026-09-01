// Locally persisted shipments created from the Smart Route Planner.
// Uses the existing Shipment shape from the demo dataset — no parallel structure is introduced.
// DEMO / SIMULATED DATA — persisted in the browser; swap for the Cloud shipments table when enabled.

import { useEffect, useState } from "react";
import type { Shipment } from "./ner/demo-data";
import { cityById } from "./ner/geo";
import type { RouteOption, RouteRequest } from "./ner/scoring";
import { VEHICLES } from "./ner/scoring";

const KEY = "ner-route-ai.created-shipments";

let items: Shipment[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) items = JSON.parse(raw) as Shipment[];
  } catch {
    items = [];
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
  for (const l of listeners) l();
}

export function createShipment(req: RouteRequest, route: RouteOption, cargoLabel: string): Shipment {
  hydrate();
  const eta = new Date(Date.now() + route.travelHours * 3600_000).toISOString();
  const shipment: Shipment = {
    id: `NER-SHP-${1100 + items.length + Math.floor(Math.random() * 89)}`,
    originId: req.originId,
    destinationId: req.destinationId,
    cargo: cargoLabel,
    cargoType: req.cargoType,
    weightTonnes: req.weightTonnes,
    vehicle: VEHICLES[req.vehicleType].label,
    priority: req.priority,
    routeName: `${route.label} · ${route.waypoints.join(" → ")}`,
    segmentIds: route.segments.map((s) => s.id),
    etaIso: eta,
    status: "Planned",
    riskScore: route.disasterRisk,
    operator: `${cityById(req.originId)?.name ?? ""} dispatch cell`,
    delayHours: 0,
  };
  items = [shipment, ...items];
  persist();
  return shipment;
}

export function useCreatedShipments() {
  const [, force] = useState(0);
  useEffect(() => {
    hydrate();
    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);
    rerender();
    return () => {
      listeners.delete(rerender);
    };
  }, []);
  hydrate();
  return items;
}
