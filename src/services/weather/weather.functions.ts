/**
 * Weather / rainfall adapter — REAL external call (Open-Meteo, no API key required).
 * If the provider cannot be reached the UI must show "Weather data unavailable" —
 * never a fabricated live reading.
 */

import { createServerFn } from "@tanstack/react-start";

export interface WeatherSnapshot {
  ok: boolean;
  provider: string;
  lat: number;
  lng: number;
  temperatureC?: number | undefined;
  rainfallMm24h?: number | undefined;
  forecastMm24h?: number | undefined;
  precipitationProbability?: number | undefined;
  condition?: string | undefined;
  observedAt?: string | undefined;
  error?: string | undefined;
}

const WMO: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  80: "Rain showers",
  81: "Heavy showers",
  82: "Violent showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
};

export const fetchWeather = createServerFn({ method: "POST" })
  .inputValidator((input: { lat: number; lng: number }) => {
    if (!Number.isFinite(input?.lat) || !Number.isFinite(input?.lng)) throw new Error("Invalid coordinates");
    return { lat: input.lat, lng: input.lng };
  })
  .handler(async ({ data }): Promise<WeatherSnapshot> => {
    const base = process.env["WEATHER_API_URL"] ?? "https://api.open-meteo.com/v1/forecast";
    const url =
      `${base}?latitude=${data.lat}&longitude=${data.lng}` +
      `&current=temperature_2m,precipitation,weather_code` +
      `&daily=precipitation_sum,precipitation_probability_max&past_days=1&forecast_days=2&timezone=auto`;

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) {
        return { ok: false, provider: "Open-Meteo", lat: data.lat, lng: data.lng, error: `Provider returned ${res.status}` };
      }
      const j = (await res.json()) as {
        current?: { temperature_2m?: number; precipitation?: number; weather_code?: number; time?: string };
        daily?: { precipitation_sum?: number[]; precipitation_probability_max?: number[] };
      };
      const sums = j.daily?.precipitation_sum ?? [];
      const probs = j.daily?.precipitation_probability_max ?? [];
      return {
        ok: true,
        provider: "Open-Meteo",
        lat: data.lat,
        lng: data.lng,
        temperatureC: j.current?.temperature_2m,
        rainfallMm24h: Math.round((sums[0] ?? 0) * 10) / 10,
        forecastMm24h: Math.round((sums[sums.length - 1] ?? 0) * 10) / 10,
        precipitationProbability: probs[probs.length - 1] ?? probs[0],
        condition: WMO[j.current?.weather_code ?? -1] ?? "Unknown",
        observedAt: j.current?.time,
      };
    } catch (err) {
      return {
        ok: false,
        provider: "Open-Meteo",
        lat: data.lat,
        lng: data.lng,
        error: err instanceof Error ? err.message : "Weather service unavailable",
      };
    }
  });
