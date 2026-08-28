import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Truck,
  AlertOctagon,
  Ban,
  Timer,
  IndianRupee,
  Gauge,
  ArrowRight,
} from "lucide-react";
import { MapPanel } from "@/components/MapPanel";
import { MapLegend } from "@/components/NerMap";
import { DemoNotice, MetricCard, PageHeader, RiskPill, SectionCard } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  ALERTS,
  CORRIDOR_REGISTER,
  SHIPMENTS,
  regionalRisk,
  INCIDENTS,
} from "@/lib/ner/demo-data";
import { cityById } from "@/lib/ner/geo";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Operations Dashboard — NER-Route AI" },
      {
        name: "description",
        content:
          "Live-style operations overview of freight movement, corridor risk and disruptions across the eight North Eastern states.",
      },
      { property: "og:title", content: "Operations Dashboard — NER-Route AI" },
      {
        property: "og:description",
        content: "Freight risk, closures and corridor status for India's North Eastern Region.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const active = SHIPMENTS.filter((s) => s.status !== "Delivered");
  const atRisk = SHIPMENTS.filter((s) => s.status === "At Risk" || s.status === "Delayed");
  const closures = CORRIDOR_REGISTER.filter((c) => c.segment.closed);
  const highRisk = CORRIDOR_REGISTER.filter((c) => c.risk >= 60);
  const avgDelay = (
    SHIPMENTS.reduce((a, s) => a + s.delayHours, 0) / SHIPMENTS.length
  ).toFixed(1);
  const avgCostIdx = Math.round(
    CORRIDOR_REGISTER.reduce((a, c) => a + (100 - c.segment.roadCondition) * 0.6 + c.risk * 0.4, 0) /
      CORRIDOR_REGISTER.length,
  );

  const dist = [
    { name: "Low", value: CORRIDOR_REGISTER.filter((c) => c.risk < 35).length, color: "var(--risk-low)" },
    { name: "Moderate", value: CORRIDOR_REGISTER.filter((c) => c.risk >= 35 && c.risk < 55).length, color: "var(--risk-moderate)" },
    { name: "High", value: CORRIDOR_REGISTER.filter((c) => c.risk >= 55 && c.risk < 75).length, color: "var(--risk-high)" },
    { name: "Severe", value: CORRIDOR_REGISTER.filter((c) => c.risk >= 75).length, color: "var(--risk-severe)" },
  ];

  return (
    <>
      <PageHeader
        title="NER Freight Operations Dashboard"
        subtitle="Risk-aware freight movement monitoring across Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim and Tripura."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/map">Open GIS Map</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/planner" search={{ demo: "1" }}>
                Run Demo Scenario <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </>
        }
      />

      <DemoNotice />

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">How the platform works</h2>
        <ol className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-7">
          {[
            "Origin",
            "Destination",
            "Freight details",
            "Risk analysis",
            "3 route options",
            "Explainable recommendation",
            "Shipment tracking",
          ].map((step, i) => (
            <li key={step} className="flex items-center gap-2 rounded-sm border border-border bg-muted px-2.5 py-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-primary text-[11px] font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <span className="text-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active shipments" value={active.length} hint="Planned, in transit or delayed" icon={<Truck className="size-4" />} />
        <MetricCard label="Shipments at risk" value={atRisk.length} tone="high" hint="Delayed or on high-risk corridors" icon={<AlertOctagon className="size-4" />} />
        <MetricCard label="Road closures" value={closures.length} tone="severe" hint="Corridor segments blocked now" icon={<Ban className="size-4" />} />
        <MetricCard label="High-risk corridors" value={highRisk.length} tone="high" hint="Composite risk ≥ 60/100" icon={<Gauge className="size-4" />} />
        <MetricCard label="Avg. estimated delay" value={avgDelay} unit="h" hint="Across tracked shipments" icon={<Timer className="size-4" />} />
        <MetricCard label="Freight cost index" value={avgCostIdx} unit="/100" hint="Higher = costlier movement conditions" icon={<IndianRupee className="size-4" />} />
        <MetricCard
          label="Regional risk level"
          value={regionalRisk}
          unit="/100"
          tone={regionalRisk >= 55 ? "high" : "moderate"}
          hint="Length-weighted corridor risk"
        />
        <MetricCard label="Open incidents" value={INCIDENTS.filter((i) => i.status !== "Resolved").length} tone="moderate" hint="Landslide, flood, rockfall, accidents" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          title="NER corridor map"
          description="Freight corridors, closures and open incidents (simulated)"
          className="xl:col-span-2"
          actions={
            <Button asChild size="sm" variant="ghost">
              <Link to="/map">Full map</Link>
            </Button>
          }
        >
          <MapPanel height="420px" layers={{ landslide: true, incidents: true, closures: true }} />
          <div className="mt-3">
            <MapLegend />
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Risk distribution" description="Corridor segments by composite risk band">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dist} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {dist.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Recent alerts"
            description="Latest advisories"
            actions={
              <Button asChild size="sm" variant="ghost">
                <Link to="/alerts">All alerts</Link>
              </Button>
            }
          >
            <ul className="space-y-2.5">
              {ALERTS.slice(0, 4).map((a) => (
                <li key={a.id} className="rounded-sm border border-border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">{a.kind}</span>
                    <span
                      className={
                        a.severity === "Critical"
                          ? "text-[11px] font-medium text-risk-severe"
                          : a.severity === "Warning"
                            ? "text-[11px] font-medium text-risk-moderate"
                            : "text-[11px] font-medium text-muted-foreground"
                      }
                    >
                      {a.severity}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.location}</p>
                  <p className="mt-1 text-xs text-foreground">{a.action}</p>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title="Active routes"
        description="Shipments currently moving on the network"
        actions={
          <Button asChild size="sm" variant="ghost">
            <Link to="/freight">Freight management</Link>
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Shipment</th>
                <th className="py-2 pr-3 font-medium">Corridor</th>
                <th className="py-2 pr-3 font-medium">Route</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {active.map((s) => (
                <tr key={s.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 tabular text-xs">{s.id}</td>
                  <td className="py-2 pr-3">
                    {cityById(s.originId)?.name} → {cityById(s.destinationId)?.name}
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{s.routeName}</td>
                  <td className="py-2 pr-3 text-xs">{s.status}</td>
                  <td className="py-2 pr-3">
                    <RiskPill score={s.riskScore} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}
