import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DemoNotice, PageHeader, RiskPill, SectionCard } from "@/components/common";
import { MapPanel } from "@/components/MapPanel";
import { DEFAULT_LAYERS, MapLegend, type MapLayers } from "@/components/NerMap";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CORRIDOR_REGISTER } from "@/lib/ner/demo-data";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Live GIS Map — NER-Route AI" },
      {
        name: "description",
        content:
          "Interactive GIS view of North East freight corridors with layers for closures, landslide and flood risk, rainfall and incidents.",
      },
      { property: "og:title", content: "Live GIS Map — NER-Route AI" },
      { property: "og:description", content: "Layered GIS monitoring of NER freight corridors and disruptions." },
    ],
  }),
  component: GisMap,
});

const LAYER_LABELS: Record<keyof MapLayers, string> = {
  roads: "Roads & freight routes",
  closures: "Road closures",
  landslide: "Landslide / rockfall risk",
  flood: "Flood risk",
  rainfall: "Heavy rainfall",
  incidents: "Incidents",
  riskZones: "High-risk zones (heatmap)",
  shipments: "Active shipments",
};

function GisMap() {
  const [layers, setLayers] = useState<MapLayers>({ ...DEFAULT_LAYERS, riskZones: true });
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return CORRIDOR_REGISTER.filter(
      (c) =>
        c.segment.name.toLowerCase().includes(q) ||
        c.segment.highway.toLowerCase().includes(q) ||
        c.fromName.toLowerCase().includes(q) ||
        c.toName.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  const focus = matches.length ? matches.map((m) => m.segment.id) : undefined;

  return (
    <>
      <PageHeader
        title="Live GIS Map"
        subtitle="Layered corridor intelligence for the North Eastern Region. Toggle layers to inspect hazard exposure along each highway."
      />
      <DemoNotice text="Basemap tiles are live OpenStreetMap/CARTO; all corridor, risk and incident overlays are simulated." />

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4">
          <SectionCard title="Layer controls" description="Toggle overlays">
            <div className="space-y-2.5">
              {(Object.keys(LAYER_LABELS) as (keyof MapLayers)[]).map((k) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <Label htmlFor={k} className="text-xs font-normal">{LAYER_LABELS[k]}</Label>
                  <Switch
                    id={k}
                    checked={layers[k]}
                    onCheckedChange={(v) => setLayers((l) => ({ ...l, [k]: v }))}
                  />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Search corridors" description="Highway, city or segment name">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="e.g. NH-6, Silchar"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <ul className="mt-3 space-y-2">
              {matches.map((m) => (
                <li key={m.segment.id} className="rounded-sm border border-border p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{m.segment.highway}</span>
                    <RiskPill score={m.risk} />
                  </div>
                  <p className="text-muted-foreground">{m.segment.name} · {m.segment.lengthKm} km</p>
                </li>
              ))}
              {query && !matches.length ? (
                <li className="text-xs text-muted-foreground">No corridor matched.</li>
              ) : null}
            </ul>
          </SectionCard>

          <SectionCard title="Legend">
            <MapLegend />
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              <li>Dashed red line = closed segment</li>
              <li>Circle marker = open incident (size = severity)</li>
              <li>Shaded circle = high-risk zone</li>
            </ul>
          </SectionCard>
        </div>

        <SectionCard title="North Eastern Region" description="Pan, zoom and click any corridor or incident for detail">
          <MapPanel height="620px" layers={layers} {...(focus ? { focusSegmentIds: focus } : {})} />
        </SectionCard>
      </div>
    </>
  );
}
