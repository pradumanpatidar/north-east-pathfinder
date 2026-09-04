/**
 * Service layer entry point.
 *
 * routing/  — REAL external routing provider (road geometry, distance, duration)
 * weather/  — REAL external weather provider (rainfall, precipitation, temperature)
 * rockwatch — API-ready interface, currently DEMO / SIMULATED (no ML model connected)
 * disaster  — API-ready adapter for NDMA/SDMA feeds (not configured)
 * sync/     — offline queue + cloud synchronisation
 *
 * UI components must call these adapters, never external URLs directly.
 */

export { fetchRoadRoute, type RoutingResponse, type RoutingLeg } from "./routing/routing.functions";
export { fetchWeather, type WeatherSnapshot } from "./weather/weather.functions";
export { simulatedRockWatch as rockwatch, simulatedDisaster as disaster, PROVIDERS } from "../lib/services";
export { clientProviderStatus, MAP_TILE_URL, MAP_TILE_ATTRIBUTION, type ProviderStatus } from "./config";
