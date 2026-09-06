/**
 * SOS requests. Captured on-device first so a field user can raise an emergency
 * with no connectivity; queued requests dispatch automatically on reconnect.
 * Responder selection is a radius-based lookup over the demo responder roster.
 */

import { useCallback, useEffect, useState } from "react";

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export type SosIssue = "landslide" | "rain" | "roadblock" | "breakdown" | "medical" | "other";
export type SosStatus = "queued" | "sent" | "accepted" | "enroute" | "resolved";

export interface SosRequest {
  id: string;
  issue: SosIssue;
  description: string;
  lat?: number;
  lng?: number;
  photo?: string;
  createdAt: string;
  status: SosStatus;
  responder?: string;
  responderKm?: number;
}

/** Demo responder roster (simulated dispatch network). */
export const RESPONDERS = [
  { name: "NDRF Post — Guwahati", lat: 26.1445, lng: 91.7362 },
  { name: "SDRF Post — Tezpur", lat: 26.6528, lng: 92.7926 },
  { name: "Highway Patrol — Nagaon", lat: 26.3464, lng: 92.6840 },
  { name: "Disaster Cell — Itanagar", lat: 27.0844, lng: 93.6053 },
  { name: "Disaster Cell — Shillong", lat: 25.5788, lng: 91.8933 },
  { name: "Disaster Cell — Imphal", lat: 24.8170, lng: 93.9368 },
  { name: "Disaster Cell — Aizawl", lat: 23.7271, lng: 92.7176 },
  { name: "Disaster Cell — Agartala", lat: 23.8315, lng: 91.2868 },
  { name: "Disaster Cell — Dimapur", lat: 25.9063, lng: 93.7276 },
  { name: "Disaster Cell — Gangtok", lat: 27.3389, lng: 88.6065 },
];

export function nearestResponder(lat?: number, lng?: number) {
  if (lat === undefined || lng === undefined) return { name: RESPONDERS[0]!.name, km: undefined };
  let best = RESPONDERS[0]!;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const r of RESPONDERS) {
    const km = haversineKm({ lat, lng }, { lat: r.lat, lng: r.lng });
    if (km < bestKm) {
      bestKm = km;
      best = r;
    }
  }
  return { name: best.name, km: Math.round(bestKm) };
}

const KEY = "ner-route-ai.sos";
const listeners = new Set<() => void>();

function read(): SosRequest[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SosRequest[]) : [];
  } catch {
    return [];
  }
}

function write(list: SosRequest[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* storage unavailable */
  }
  for (const l of listeners) l();
}

export function createSos(input: Omit<SosRequest, "id" | "createdAt" | "status" | "responder" | "responderKm">) {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  const responder = nearestResponder(input.lat, input.lng);
  const req: SosRequest = {
    ...input,
    id: `sos-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    status: online ? "sent" : "queued",
    responder: responder.name,
    ...(responder.km !== undefined ? { responderKm: responder.km } : {}),
  };
  write([req, ...read()]);
  return req;
}

export function advanceSos(id: string, status: SosStatus) {
  write(read().map((r) => (r.id === id ? { ...r, status } : r)));
}

export function flushQueuedSos() {
  const list = read();
  if (!list.some((r) => r.status === "queued")) return 0;
  write(list.map((r) => (r.status === "queued" ? { ...r, status: "sent" } : r)));
  return list.filter((r) => r.status === "queued").length;
}

export function useSosRequests() {
  const [list, setList] = useState<SosRequest[]>([]);
  useEffect(() => {
    const sync = () => setList(read());
    sync();
    listeners.add(sync);
    const onOnline = () => {
      flushQueuedSos();
      sync();
    };
    window.addEventListener("online", onOnline);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("online", onOnline);
    };
  }, []);
  const refresh = useCallback(() => setList(read()), []);
  return { list, refresh };
}
