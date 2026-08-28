/**
 * API-ready service layer.
 *
 * Every external data source the production system will use is defined here as a
 * typed interface with a clearly labelled SIMULATED adapter. Swapping in a real
 * provider means implementing the interface and registering it in `services`.
 *
 * No adapter in this file performs a network call — nothing here is real-time.
 */

import { SEGMENTS, segmentById } from "../ner/geo";
import { INCIDENTS, type Incident } from "../ner/demo-data";
import { segmentAccessibility, segmentDisasterRisk } from "../ner/scoring";

export type DataSourceMode = "SIMULATED" | "LIVE";

export interface ProviderMeta {
  name: string;
  mode: DataSourceMode;
  endpoint: string;
  description: string;
  lastSync: string;
}

export interface WeatherReading {
  segmentId: string;
  rainfallMm24h: number;
  forecastMm24h: number;
  advisory: string;
  mode: DataSourceMode;
}

export interface WeatherService {
  meta: ProviderMeta;
  getSegmentWeather(segmentId: string): Promise<WeatherReading>;
}

export interface RockWatchPrediction {
  segmentId: string;
  rockfallProbability: number; // 0-1
  landslideProbability: number; // 0-1
  riskScore: number; // 0-100
  confidence: number; // 0-1
  modelVersion: string;
  mode: DataSourceMode;
  disclaimer: string;
}

export interface RockWatchService {
  meta: ProviderMeta;
  predict(segmentId: string): Promise<RockWatchPrediction>;
  predictAll(): Promise<RockWatchPrediction[]>;
}

export interface RoutingService {
  meta: ProviderMeta;
  getGeometry(segmentId: string): Promise<[number, number][]>;
}

export interface TrafficService {
  meta: ProviderMeta;
  getRoadCondition(segmentId: string): Promise<{ segmentId: string; conditionIndex: number; mode: DataSourceMode }>;
}

export interface DisasterService {
  meta: ProviderMeta;
  getActiveIncidents(): Promise<Incident[]>;
}

const iso = () => new Date().toISOString();

// Deterministic pseudo-random so demo output is stable per segment.
const seeded = (key: string) => {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h % 1000) / 1000;
};

export const simulatedWeather: WeatherService = {
  meta: {
    name: "Weather / Rainfall (IMD-compatible)",
    mode: "SIMULATED",
    endpoint: "GET /weather/segment/:id  → { rainfallMm24h, forecastMm24h }",
    description: "Plug in IMD or a commercial weather API. Interface expects 24h observed + forecast rainfall.",
    lastSync: iso(),
  },
  async getSegmentWeather(segmentId) {
    const seg = segmentById(segmentId);
    const base = seg?.rainfallMm24h ?? 20;
    return {
      segmentId,
      rainfallMm24h: base,
      forecastMm24h: Math.round(base * (0.7 + seeded(segmentId) * 0.7)),
      advisory: base > 100 ? "Very heavy rainfall — restrict night movement" : base > 60 ? "Heavy rainfall watch" : "Normal",
      mode: "SIMULATED",
    };
  },
};

export const simulatedRockWatch: RockWatchService = {
  meta: {
    name: "RockWatch AI (ML rockfall / landslide model)",
    mode: "SIMULATED",
    endpoint: "POST /rockwatch/predict  → { rockfallProbability, landslideProbability, riskScore, confidence }",
    description:
      "No ML model is connected in this prototype. Outputs below are deterministic simulations derived from terrain, rainfall and road-condition attributes.",
    lastSync: iso(),
  },
  async predict(segmentId) {
    const seg = segmentById(segmentId);
    const risk = seg ? segmentDisasterRisk(seg) : 40;
    const jitter = seeded(segmentId) * 0.12;
    return {
      segmentId,
      rockfallProbability: Math.min(0.97, (seg?.landslideRisk ?? 40) / 100 * 0.8 + jitter),
      landslideProbability: Math.min(0.97, (seg?.landslideRisk ?? 40) / 100 * 0.9 + jitter * 0.5),
      riskScore: risk,
      confidence: 0.62 + seeded(segmentId + "c") * 0.3,
      modelVersion: "rockwatch-sim-0.1",
      mode: "SIMULATED",
      disclaimer: "DEMO / SIMULATED PREDICTION — not produced by a trained ML model.",
    };
  },
  async predictAll() {
    return Promise.all(SEGMENTS.map((s) => this.predict(s.id)));
  },
};

export const simulatedRouting: RoutingService = {
  meta: {
    name: "Map / Routing (MapLibre + OSRM-compatible)",
    mode: "SIMULATED",
    endpoint: "GET /route?coordinates=…  → GeoJSON LineString",
    description: "Corridor geometry is stored locally. Replace with OSRM/Valhalla/Mapbox Directions for real geometry.",
    lastSync: iso(),
  },
  async getGeometry(segmentId) {
    return segmentById(segmentId)?.path ?? [];
  },
};

export const simulatedTraffic: TrafficService = {
  meta: {
    name: "Traffic & Road Condition (NHAI/MoRTH-compatible)",
    mode: "SIMULATED",
    endpoint: "GET /road-condition/:segmentId  → { conditionIndex }",
    description: "Expects a 0–100 pavement/traffic condition index per road segment.",
    lastSync: iso(),
  },
  async getRoadCondition(segmentId) {
    const seg = segmentById(segmentId);
    return {
      segmentId,
      conditionIndex: seg ? segmentAccessibility(seg) : 50,
      mode: "SIMULATED",
    };
  },
};

export const simulatedDisaster: DisasterService = {
  meta: {
    name: "Disaster Feed (NDMA / SDMA-compatible)",
    mode: "SIMULATED",
    endpoint: "GET /disaster/incidents?region=NER  → Incident[]",
    description: "Landslide, flood and closure bulletins. Replace with NDMA/SDMA or state DM authority feeds.",
    lastSync: iso(),
  },
  async getActiveIncidents() {
    return INCIDENTS.filter((i) => i.status !== "Resolved");
  },
};

export const services = {
  weather: simulatedWeather,
  rockwatch: simulatedRockWatch,
  routing: simulatedRouting,
  traffic: simulatedTraffic,
  disaster: simulatedDisaster,
};

export const PROVIDERS: ProviderMeta[] = [
  simulatedRouting.meta,
  simulatedWeather.meta,
  simulatedTraffic.meta,
  simulatedDisaster.meta,
  simulatedRockWatch.meta,
  {
    name: "Government datasets (MDoNER / data.gov.in)",
    mode: "SIMULATED",
    endpoint: "GET /datasets/ner/freight-corridors",
    description: "Corridor master data, freight volumes and infrastructure status.",
    lastSync: iso(),
  },
];
