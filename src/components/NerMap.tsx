import { useEffect, useRef } from "react";
import type * as LType from "leaflet";
import { NER_CENTER, SEGMENTS } from "@/lib/ner/geo";
import { INCIDENTS } from "@/lib/ner/demo-data";
import { segmentDisasterRisk } from "@/lib/ner/scoring";

export interface MapLayers {
  roads: boolean;
  closures: boolean;
  landslide: boolean;
  flood: boolean;
  rainfall: boolean;
  incidents: boolean;
  riskZones: boolean;
  shipments: boolean;
}

export const DEFAULT_LAYERS: MapLayers = {
  roads: true,
  closures: true,
  landslide: true,
  flood: false,
  rainfall: false,
  incidents: true,
  riskZones: false,
  shipments: false,
};

export interface MapRoute {
  id: string;
  label: string;
  path: [number, number][];
  color: "primary" | "safe" | "warn" | "danger";
}

const COLORS = {
  primary: "#2f5d80",
  safe: "#2e8b60",
  warn: "#c58a1f",
  danger: "#b4462f",
};

function riskColor(v: number) {
  if (v >= 75) return COLORS.danger;
  if (v >= 55) return "#cc6b33";
  if (v >= 35) return COLORS.warn;
  return COLORS.safe;
}

interface Props {
  layers?: Partial<MapLayers>;
  routes?: MapRoute[];
  height?: string;
  focusSegmentIds?: string[];
}

export default function NerMap({ layers, routes = [], height = "480px", focusSegmentIds }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const groupRef = useRef<LType.LayerGroup | null>(null);
  const cfg: MapLayers = { ...DEFAULT_LAYERS, ...layers };

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current || mapRef.current) return;

      const map = L.map(ref.current, { center: NER_CENTER, zoom: 7, scrollWheelZoom: true });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        maxZoom: 18,
      }).addTo(map);
      mapRef.current = map;
      groupRef.current = L.layerGroup().addTo(map);
      // ensure correct sizing inside flex/grid containers
      setTimeout(() => map.invalidateSize(), 120);

      cleanup = () => {
        map.remove();
        mapRef.current = null;
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      const group = groupRef.current;
      if (cancelled || !map || !group) return;
      group.clearLayers();

      if (cfg.roads) {
        for (const seg of SEGMENTS) {
          const risk = segmentDisasterRisk(seg);
          const highlighted = !focusSegmentIds || focusSegmentIds.includes(seg.id);
          const color = cfg.landslide || cfg.flood || cfg.rainfall ? riskColor(
            cfg.flood ? seg.floodRisk : cfg.rainfall ? Math.min(100, seg.rainfallMm24h * 0.8) : seg.landslideRisk,
          ) : COLORS.primary;
          L.polyline(seg.path, {
            color: seg.closed && cfg.closures ? COLORS.danger : color,
            weight: highlighted ? 4 : 2,
            opacity: highlighted ? 0.85 : 0.3,
            dashArray: seg.closed && cfg.closures ? "6 6" : undefined,
          })
            .bindPopup(
              `<strong>${seg.highway}</strong><br/>${seg.name}<br/>${seg.lengthKm} km · ${seg.terrain}<br/>Risk ${risk}/100 ${seg.closed ? "<br/><b>ROAD CLOSED</b>" : ""}<br/><em>Simulated data</em>`,
            )
            .addTo(group);
        }
      }

      if (cfg.riskZones) {
        for (const seg of SEGMENTS) {
          const risk = segmentDisasterRisk(seg);
          if (risk < 55) continue;
          const mid = seg.path[Math.floor(seg.path.length / 2)];
          if (!mid) continue;
          L.circle(mid, {
            radius: 14000 + risk * 260,
            color: riskColor(risk),
            fillColor: riskColor(risk),
            fillOpacity: 0.16,
            weight: 1,
          })
            .bindPopup(`High-risk zone · ${seg.name}<br/>Composite risk ${risk}/100 (simulated)`)
            .addTo(group);
        }
      }

      if (cfg.incidents) {
        for (const inc of INCIDENTS) {
          if (inc.status === "Resolved") continue;
          L.circleMarker([inc.lat, inc.lng], {
            radius: inc.severity === "Critical" ? 9 : inc.severity === "High" ? 7 : 5,
            color: inc.severity === "Critical" || inc.severity === "High" ? COLORS.danger : COLORS.warn,
            fillColor: inc.severity === "Critical" || inc.severity === "High" ? COLORS.danger : COLORS.warn,
            fillOpacity: 0.75,
            weight: 2,
          })
            .bindPopup(
              `<strong>${inc.type} · ${inc.severity}</strong><br/>${inc.location}<br/>${inc.affectedRoad} · ${inc.status}<br/>Est. clearance ${inc.clearanceHours} h<br/><em>Simulated incident</em>`,
            )
            .addTo(group);
        }
      }

      for (const route of routes) {
        L.polyline(route.path, {
          color: COLORS[route.color],
          weight: 6,
          opacity: 0.9,
        })
          .bindPopup(`<strong>${route.label}</strong><br/><em>Computed from simulated corridor data</em>`)
          .addTo(group);
      }

      if (routes.length) {
        const bounds = L.latLngBounds(routes.flatMap((r) => r.path));
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cfg), JSON.stringify(routes.map((r) => r.id)), JSON.stringify(focusSegmentIds)]);

  return <div ref={ref} style={{ height }} className="w-full rounded-md border border-border" />;
}

export function MapLegend() {
  const items = [
    { color: COLORS.safe, label: "Low risk corridor" },
    { color: COLORS.warn, label: "Moderate risk" },
    { color: "#cc6b33", label: "High risk" },
    { color: COLORS.danger, label: "Severe risk / closure" },
    { color: COLORS.primary, label: "Freight corridor" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-5 rounded-sm" style={{ backgroundColor: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
