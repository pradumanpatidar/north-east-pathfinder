import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { DemoNotice, PageHeader, RiskPill, SectionCard } from "@/components/common";
import { Button } from "@/components/ui/button";
import { loadPlan, type StoredPlan } from "@/lib/plan-store";
import { cityById, segmentById } from "@/lib/ner/geo";
import { INCIDENTS } from "@/lib/ner/demo-data";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — NER-Route AI" },
      {
        name: "description",
        content:
          "Generate a professional freight routing summary: selected route, alternatives, risk factors, cost, ETA, accessibility and recommendation.",
      },
      { property: "og:title", content: "Reports — NER-Route AI" },
      { property: "og:description", content: "Printable route decision report for NER freight movement." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const [plan, setPlan] = useState<StoredPlan | null>(null);

  useEffect(() => {
    setPlan(loadPlan());
  }, []);

  if (!plan) {
    return (
      <>
        <PageHeader title="Reports" subtitle="Route decision summary generated from the Smart Route Planner." />
        <DemoNotice />
        <SectionCard title="No plan available" description="Run the planner first">
          <p className="text-sm text-muted-foreground">
            Generate routes in the{" "}
            <Link to="/planner" className="text-primary underline">
              Smart Route Planner
            </Link>{" "}
            (or press Demo Mode) and the summary report will be built here.
          </p>
        </SectionCard>
      </>
    );
  }

  const recommended = plan.options.find((o) => o.recommended) ?? plan.options[0];
  if (!recommended) return null;
  const alternatives = plan.options.filter((o) => o.id !== recommended.id);
  const segIds = new Set(plan.options.flatMap((o) => o.segmentIds));
  const relatedIncidents = INCIDENTS.filter((i) => segIds.has(i.segmentId) && i.status !== "Resolved");
  const origin = cityById(plan.request.originId)?.name;
  const destination = cityById(plan.request.destinationId)?.name;

  return (
    <>
      <PageHeader
        title="Route Decision Report"
        subtitle={`${origin} → ${destination} · generated ${new Date(plan.createdAt).toLocaleString("en-GB")}`}
        actions={
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1 size-4" /> Print / Save PDF
          </Button>
        }
      />
      <DemoNotice />

      <SectionCard title="1. Consignment" description="Request parameters used for scoring">
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <Item k="Origin" v={origin ?? "—"} />
          <Item k="Destination" v={destination ?? "—"} />
          <Item k="Cargo type" v={plan.request.cargoType} />
          <Item k="Weight" v={`${plan.request.weightTonnes} t`} />
          <Item k="Vehicle" v={plan.request.vehicleType} />
          <Item k="Priority" v={plan.request.priority} />
          <Item k="Max acceptable delay" v={`${plan.request.maxDelayHours} h`} />
          <Item k="Hazardous / perishable" v={`${plan.request.hazardous ? "Yes" : "No"} / ${plan.request.perishable ? "Yes" : "No"}`} />
          <Item k="Emergency mode" v={plan.request.emergencyMode ? "Active" : "Off"} />
        </dl>
      </SectionCard>

      <SectionCard title="2. Recommended route" description={recommended.label}>
        <p className="text-sm">{recommended.waypoints.join(" → ")}</p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
          <Item k="Distance" v={`${recommended.distanceKm} km`} />
          <Item k="ETA (transit)" v={`${recommended.travelHours} h`} />
          <Item k="Estimated cost" v={`₹${recommended.costInr.toLocaleString("en-IN")}`} />
          <Item k="Weighted score" v={`${recommended.weightedTotal}/100`} />
          <Item k="Safety" v={`${recommended.safetyScore}/100`} />
          <Item k="Accessibility" v={`${recommended.accessibilityScore}/100`} />
          <Item k="Reliability" v={`${recommended.reliabilityScore}/100`} />
          <Item k="CO₂" v={`${recommended.co2Kg} kg`} />
        </dl>
        <div className="mt-3">
          <RiskPill score={recommended.disasterRisk} />
        </div>
        <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommendation rationale</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {recommended.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="3. Alternative routes" description="Evaluated but not recommended">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Option</th>
                <th className="py-2 pr-3 font-medium">Distance</th>
                <th className="py-2 pr-3 font-medium">Time</th>
                <th className="py-2 pr-3 font-medium">Cost</th>
                <th className="py-2 pr-3 font-medium">Safety</th>
                <th className="py-2 pr-3 font-medium">Risk</th>
                <th className="py-2 pr-3 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {alternatives.map((o) => (
                <tr key={o.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 text-xs">{o.label}</td>
                  <td className="py-2 pr-3 tabular text-xs">{o.distanceKm} km</td>
                  <td className="py-2 pr-3 tabular text-xs">{o.travelHours} h</td>
                  <td className="py-2 pr-3 tabular text-xs">₹{o.costInr.toLocaleString("en-IN")}</td>
                  <td className="py-2 pr-3 tabular text-xs">{o.safetyScore}</td>
                  <td className="py-2 pr-3"><RiskPill score={o.disasterRisk} /></td>
                  <td className="py-2 pr-3 tabular text-xs">{o.weightedTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="4. Risk factors & incidents" description="Conditions affecting the evaluated corridors">
        <ul className="space-y-1.5 text-sm">
          {recommended.segmentIds.map((id) => {
            const s = segmentById(id);
            if (!s) return null;
            return (
              <li key={id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-1.5 last:border-0">
                <span>
                  {s.highway} · {s.name}
                </span>
                <span className="tabular text-xs text-muted-foreground">
                  {s.lengthKm} km · rain {s.rainfallMm24h} mm · landslide {s.landslideRisk} · flood {s.floodRisk}
                  {s.closed ? " · CLOSED" : ""}
                </span>
              </li>
            );
          })}
        </ul>
        <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open incidents on evaluated corridors</h3>
        {relatedIncidents.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {relatedIncidents.map((i) => (
              <li key={i.id}>
                {i.id} · {i.type} ({i.severity}) — {i.location}; est. clearance {i.clearanceHours} h
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No open incidents recorded on these corridors.</p>
        )}
      </SectionCard>

      <SectionCard title="5. Decision statement" description="For operational record">
        <p className="text-sm">
          Based on the weighted assessment (safety 35%, accessibility 20%, time 15%, cost 10%, reliability 10%,
          environment 10%
          {plan.request.emergencyMode ? "; Emergency Mode re-weighting applied" : ""}), the{" "}
          <strong>{recommended.label}</strong> from {origin} to {destination} is recommended with a composite score of{" "}
          <strong>{recommended.weightedTotal}/100</strong>, an estimated transit of {recommended.travelHours} h and an
          estimated cost of ₹{recommended.costInr.toLocaleString("en-IN")}. All inputs are simulated demonstration data.
        </p>
      </SectionCard>
    </>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-sm border border-border px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</dt>
      <dd className="text-sm capitalize">{v}</dd>
    </div>
  );
}
