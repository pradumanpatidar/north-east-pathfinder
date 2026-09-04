/**
 * Central configuration status for every external dependency.
 *
 * Rules enforced here:
 *  • No secret value is ever exposed to the browser — only a CONNECTED / NOT CONFIGURED state.
 *  • Providers that need no key (OSRM, Open-Meteo, OSM tiles) are genuinely live.
 *  • Providers with no real backend (RockWatch) report DEMO and are labelled as such in the UI.
 */

export type ProviderState = "CONNECTED" | "NOT CONFIGURED" | "DEMO";

export interface ProviderStatus {
  key: string;
  label: string;
  state: ProviderState;
  provider: string;
  detail: string;
}

/** Browser-safe: derived from VITE_ vars only. */
export function clientProviderStatus(): ProviderStatus[] {
  const supabaseReady = Boolean(
    import.meta.env["VITE_SUPABASE_URL"] && import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
  );
  const tileKey = import.meta.env["VITE_MAPTILER_KEY"] as string | undefined;

  return [
    {
      key: "database",
      label: "Database & Auth",
      state: supabaseReady ? "CONNECTED" : "NOT CONFIGURED",
      provider: "Lovable Cloud (Postgres)",
      detail: supabaseReady
        ? "Incidents, shipments, alerts and corridors are read and written live."
        : "Backend URL/key missing — the app falls back to demo data.",
    },
    {
      key: "tiles",
      label: "Map tiles",
      state: "CONNECTED",
      provider: tileKey ? "MapTiler (keyed)" : "OpenStreetMap raster",
      detail: tileKey
        ? "Keyed vector/raster tiles configured."
        : "Public OSM raster tiles — no key required. Set VITE_MAPTILER_KEY for a keyed provider.",
    },
    {
      key: "routing",
      label: "Routing API",
      state: "CONNECTED",
      provider: "OSRM (public routing service)",
      detail: "Returns real road geometry, distance and duration. NER-Route AI applies its own risk ranking on top.",
    },
    {
      key: "weather",
      label: "Weather / rainfall",
      state: "CONNECTED",
      provider: "Open-Meteo",
      detail: "Live rainfall, precipitation probability and temperature per corridor point.",
    },
    {
      key: "rockwatch",
      label: "RockWatch AI",
      state: "DEMO",
      provider: "Not connected",
      detail: "No trained model is connected. Outputs are deterministic simulations, labelled DEMO / SIMULATED.",
    },
    {
      key: "disaster",
      label: "Disaster feed (NDMA/SDMA)",
      state: "NOT CONFIGURED",
      provider: "Adapter ready",
      detail: "Interface implemented; no government feed endpoint configured for this prototype.",
    },
  ];
}

export const MAP_TILE_URL =
  (import.meta.env["VITE_MAPTILER_KEY"] as string | undefined)
    ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${import.meta.env["VITE_MAPTILER_KEY"]}`
    : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const MAP_TILE_ATTRIBUTION = "© OpenStreetMap contributors";
