// Offline-first field-officer incident reporting store.
//
// Scope note (important for the demo narrative):
//   • OFFLINE  — report capture, GPS, photo attachment and local queueing work with no network.
//   • ONLINE   — queued reports are synchronised to the cloud backend, which is where the
//                AI / RockWatch analysis and cross-user sharing happen.
// The cloud leg is SIMULATED in this prototype; nothing is transmitted to a live government system.

import { useEffect, useState } from "react";
import { SEGMENTS, segmentById } from "./ner/geo";
import type { Incident, IncidentType } from "./ner/demo-data";

export type SyncState = "pending" | "syncing" | "synced";

export interface FieldReport {
  id: string;
  type: IncidentType;
  severity: Incident["severity"];
  segmentId: string;
  lat: number;
  lng: number;
  locationLabel: string;
  description: string;
  photoDataUrl?: string;
  createdAt: string;
  syncState: SyncState;
  syncedAt?: string;
}

const KEY = "ner-route-ai.field-reports";

let reports: FieldReport[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(reports));
  } catch {
    /* quota / private mode — data stays in memory for this session */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) reports = JSON.parse(raw) as FieldReport[];
  } catch {
    reports = [];
  }
}

export function listReports(): FieldReport[] {
  hydrate();
  return reports;
}

export function addReport(input: Omit<FieldReport, "id" | "createdAt" | "syncState">): FieldReport {
  hydrate();
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  const report: FieldReport = {
    ...input,
    id: `FLD-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
    syncState: "pending",
  };
  reports = [report, ...reports];
  persist();
  emit();
  if (online) void syncPending();
  return report;
}

/** Simulated cloud sync. Resolves with the number of reports synchronised. */
export async function syncPending(): Promise<number> {
  hydrate();
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;
  const queue = reports.filter((r) => r.syncState === "pending");
  if (!queue.length) return 0;

  reports = reports.map((r) => (r.syncState === "pending" ? { ...r, syncState: "syncing" } : r));
  emit();
  await new Promise((res) => setTimeout(res, 700));

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    reports = reports.map((r) => (r.syncState === "syncing" ? { ...r, syncState: "pending" } : r));
    persist();
    emit();
    return 0;
  }

  const now = new Date().toISOString();
  reports = reports.map((r) => (r.syncState === "syncing" ? { ...r, syncState: "synced", syncedAt: now } : r));
  persist();
  emit();
  return queue.length;
}

export function clearReports() {
  reports = [];
  persist();
  emit();
}

/** Field report → the same Incident shape the rest of the app already consumes. */
export function reportToIncident(r: FieldReport): Incident {
  const seg = segmentById(r.segmentId);
  return {
    id: r.id,
    type: r.type,
    segmentId: r.segmentId,
    location: r.locationLabel,
    lat: r.lat,
    lng: r.lng,
    severity: r.severity,
    reportedAt: r.createdAt,
    status: "Open",
    affectedRoad: seg?.highway ?? "Unknown road",
    clearanceHours: r.severity === "Critical" ? 24 : r.severity === "High" ? 12 : 4,
    note: r.description || "Field-officer report (demo).",
  };
}

/** Nearest corridor segment to a coordinate — used to attach a GPS report to a road. */
export function nearestSegmentId(lat: number, lng: number): string {
  let bestId = SEGMENTS[0]!.id;
  let bestD = Number.POSITIVE_INFINITY;
  for (const seg of SEGMENTS) {
    for (const [plat, plng] of seg.path) {
      const d = (plat - lat) ** 2 + (plng - lng) ** 2;
      if (d < bestD) {
        bestD = d;
        bestId = seg.id;
      }
    }
  }
  return bestId;
}

/** Reactive access to the queue plus live connectivity state. */
export function useFieldReports() {
  const [, force] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    hydrate();
    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);
    setOnline(navigator.onLine);
    rerender();

    const goOnline = () => {
      setOnline(true);
      void syncPending();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      listeners.delete(rerender);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return {
    reports: listReports(),
    pendingCount: listReports().filter((r) => r.syncState !== "synced").length,
    online,
    addReport,
    syncPending,
    clearReports,
  };
}
