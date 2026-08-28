import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DemoNotice, PageHeader, RiskPill, SectionCard } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SHIPMENTS, type Shipment, type ShipmentStatus } from "@/lib/ner/demo-data";
import { cityById, segmentById } from "@/lib/ner/geo";
import { MapPanel } from "@/components/MapPanel";

export const Route = createFileRoute("/freight")({
  head: () => ({
    meta: [
      { title: "Freight Management — NER-Route AI" },
      {
        name: "description",
        content: "Track North East freight consignments with route, ETA, status and corridor risk level.",
      },
      { property: "og:title", content: "Freight Management — NER-Route AI" },
      { property: "og:description", content: "Shipment register with ETA, status and risk for NER freight." },
    ],
  }),
  component: Freight,
});

const STATUSES: (ShipmentStatus | "All")[] = ["All", "Planned", "In Transit", "Delayed", "At Risk", "Delivered"];

function Freight() {
  const [status, setStatus] = useState<ShipmentStatus | "All">("All");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Shipment | null>(null);

  const rows = SHIPMENTS.filter((s) => (status === "All" ? true : s.status === status)).filter((s) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (
      s.id.toLowerCase().includes(t) ||
      s.cargo.toLowerCase().includes(t) ||
      s.operator.toLowerCase().includes(t) ||
      (cityById(s.originId)?.name ?? "").toLowerCase().includes(t) ||
      (cityById(s.destinationId)?.name ?? "").toLowerCase().includes(t)
    );
  });

  return (
    <>
      <PageHeader
        title="Freight Management"
        subtitle="Consignment register with assigned corridor, ETA, live status and composite risk level."
      />
      <DemoNotice />

      <SectionCard
        title={`Shipments (${rows.length})`}
        description="Select a row to inspect full shipment detail"
        actions={
          <Input
            className="h-8 w-52 text-xs"
            placeholder="Search ID, cargo, operator…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        }
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setStatus(s)}
            >
              {s}
            </Button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Shipment ID</th>
                <th className="py-2 pr-3 font-medium">Origin → Destination</th>
                <th className="py-2 pr-3 font-medium">Cargo</th>
                <th className="py-2 pr-3 font-medium">Wt (t)</th>
                <th className="py-2 pr-3 font-medium">Vehicle</th>
                <th className="py-2 pr-3 font-medium">Priority</th>
                <th className="py-2 pr-3 font-medium">ETA (UTC)</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Risk</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-muted/60">
                  <td className="py-2 pr-3 tabular text-xs">{s.id}</td>
                  <td className="py-2 pr-3">
                    {cityById(s.originId)?.name} → {cityById(s.destinationId)?.name}
                  </td>
                  <td className="py-2 pr-3 text-xs">{s.cargo}</td>
                  <td className="py-2 pr-3 tabular text-xs">{s.weightTonnes}</td>
                  <td className="py-2 pr-3 text-xs">{s.vehicle}</td>
                  <td className="py-2 pr-3 text-xs capitalize">{s.priority}</td>
                  <td className="py-2 pr-3 tabular text-xs">{new Date(s.etaIso).toLocaleString("en-GB")}</td>
                  <td className="py-2 pr-3 text-xs">{s.status}</td>
                  <td className="py-2 pr-3"><RiskPill score={s.riskScore} /></td>
                  <td className="py-2 text-right">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDetail(s)}>
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle>{detail.id}</DialogTitle>
                <DialogDescription>
                  {cityById(detail.originId)?.name} → {cityById(detail.destinationId)?.name} · {detail.operator}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <Row k="Cargo" v={`${detail.cargo} (${detail.cargoType})`} />
                <Row k="Weight" v={`${detail.weightTonnes} t`} />
                <Row k="Vehicle" v={detail.vehicle} />
                <Row k="Priority" v={detail.priority} />
                <Row k="Status" v={detail.status} />
                <Row k="Delay" v={`${detail.delayHours} h`} />
                <Row k="ETA" v={new Date(detail.etaIso).toLocaleString("en-GB")} />
                <Row k="Risk score" v={`${detail.riskScore}/100`} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned route</p>
                <p className="text-sm">{detail.routeName}</p>
                <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                  {detail.segmentIds.map((id) => {
                    const seg = segmentById(id);
                    return seg ? (
                      <li key={id}>
                        {seg.highway} · {seg.name} — {seg.lengthKm} km{seg.closed ? " (CLOSED)" : ""}
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
              <MapPanel
                height="240px"
                focusSegmentIds={detail.segmentIds}
                layers={{ incidents: true, closures: true, roads: true }}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-sm border border-border px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p>
      <p className="text-sm capitalize">{v}</p>
    </div>
  );
}
