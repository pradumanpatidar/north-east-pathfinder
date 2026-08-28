import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DemoNotice, PageHeader, SectionCard } from "@/components/common";
import { Button } from "@/components/ui/button";
import { MapPanel } from "@/components/MapPanel";
import { INCIDENTS, type Incident, type IncidentType } from "@/lib/ner/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/incidents")({
  head: () => ({
    meta: [
      { title: "Road Incidents — NER-Route AI" },
      {
        name: "description",
        content:
          "Incident register for North East highways: landslides, rockfall, floods, accidents, closures and rainfall events with clearance estimates.",
      },
      { property: "og:title", content: "Road Incidents — NER-Route AI" },
      { property: "og:description", content: "Track NER road incidents, severity and estimated clearance times." },
    ],
  }),
  component: Incidents,
});

const TYPES: (IncidentType | "All")[] = [
  "All",
  "Landslide",
  "Rockfall",
  "Flood",
  "Accident",
  "Road closure",
  "Heavy rainfall",
  "Other",
];

function severityClass(s: Incident["severity"]) {
  return s === "Critical"
    ? "text-risk-severe"
    : s === "High"
      ? "text-risk-high"
      : s === "Medium"
        ? "text-risk-moderate"
        : "text-risk-low";
}

function Incidents() {
  const [type, setType] = useState<IncidentType | "All">("All");
  const [openOnly, setOpenOnly] = useState(true);

  const rows = INCIDENTS.filter((i) => (type === "All" ? true : i.type === type)).filter((i) =>
    openOnly ? i.status !== "Resolved" : true,
  );

  return (
    <>
      <PageHeader
        title="Road Incidents"
        subtitle="Field-reported disruptions affecting freight corridors, with severity, status and estimated clearance."
        actions={
          <Button size="sm" variant="outline" onClick={() => setOpenOnly((v) => !v)}>
            {openOnly ? "Showing open only" : "Showing all"}
          </Button>
        }
      />
      <DemoNotice />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <SectionCard title={`Incident register (${rows.length})`} description="Filter by incident type">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={type === t ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setType(t)}
              >
                {t}
              </Button>
            ))}
          </div>
          <div className="space-y-2.5">
            {rows.map((i) => (
              <article key={i.id} className="rounded-sm border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="tabular text-xs text-muted-foreground">{i.id}</span>
                    <span className="text-sm font-semibold">{i.type}</span>
                    <span className={cn("text-xs font-medium", severityClass(i.severity))}>{i.severity}</span>
                  </div>
                  <span className="rounded-sm border border-border px-2 py-0.5 text-[11px]">{i.status}</span>
                </div>
                <p className="mt-1 text-sm">{i.location}</p>
                <p className="text-xs text-muted-foreground">{i.note}</p>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                  <div><dt className="uppercase">Road</dt><dd className="text-foreground">{i.affectedRoad}</dd></div>
                  <div><dt className="uppercase">Reported</dt><dd className="tabular text-foreground">{new Date(i.reportedAt).toLocaleString("en-GB")}</dd></div>
                  <div><dt className="uppercase">Est. clearance</dt><dd className="tabular text-foreground">{i.clearanceHours} h</dd></div>
                </dl>
              </article>
            ))}
            {!rows.length ? <p className="text-sm text-muted-foreground">No incidents match this filter.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Incident map" description="Open incidents plotted on the corridor network">
          <MapPanel height="520px" layers={{ incidents: true, closures: true, roads: true, landslide: true }} />
        </SectionCard>
      </div>
    </>
  );
}
