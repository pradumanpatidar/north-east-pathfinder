/**
 * Routing service adapter — REAL external call.
 *
 * The routing provider supplies physical road geometry, distance and duration only.
 * All disaster-risk / accessibility / reliability ranking is performed by NER-Route AI
 * on top of this geometry (see src/lib/ner/scoring.ts).
 */

import { createServerFn } from "@tanstack/react-start";

export interface RoutingLeg {
  distanceKm: number;
  durationHours: number;
  geometry: [number, number][]; // [lat, lng]
}

export interface RoutingResponse {
  ok: boolean;
  provider: string;
  routes: RoutingLeg[];
  error?: string;
}

interface Coord {
  lat: number;
  lng: number;
}

export const fetchRoadRoute = createServerFn({ method: "POST" })
  .inputValidator((input: { from: Coord; to: Coord; via?: Coord[] }) => {
    const num = (n: unknown) => typeof n === "number" && Number.isFinite(n);
    if (!num(input?.from?.lat) || !num(input?.from?.lng) || !num(input?.to?.lat) || !num(input?.to?.lng)) {
      throw new Error("Invalid coordinates");
    }
    const via = (input.via ?? []).filter((c) => num(c?.lat) && num(c?.lng)).slice(0, 6);
    return { from: input.from, to: input.to, via };
  })
  .handler(async ({ data }): Promise<RoutingResponse> => {
    const base = process.env["ROUTING_API_URL"] ?? "https://router.project-osrm.org";
    const points = [data.from, ...data.via, data.to].map((c) => `${c.lng},${c.lat}`).join(";");
    const url = `${base}/route/v1/driving/${points}?alternatives=true&overview=full&geometries=geojson`;

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12_000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) {
        return { ok: false, provider: "OSRM", routes: [], error: `Routing service returned ${res.status}` };
      }
      const json = (await res.json()) as {
        code?: string;
        routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
      };
      if (json.code !== "Ok" || !json.routes?.length) {
        return { ok: false, provider: "OSRM", routes: [], error: "No road route found between these points." };
      }
      return {
        ok: true,
        provider: "OSRM",
        routes: json.routes.slice(0, 3).map((r) => ({
          distanceKm: Math.round(r.distance / 100) / 10,
          durationHours: Math.round((r.duration / 3600) * 10) / 10,
          geometry: r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
        })),
      };
    } catch (err) {
      return {
        ok: false,
        provider: "OSRM",
        routes: [],
        error: err instanceof Error ? err.message : "Routing service unavailable",
      };
    }
  });
