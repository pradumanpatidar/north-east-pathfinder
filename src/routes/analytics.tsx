import { createFileRoute } from "@tanstack/react-router";
import { DemoNotice, PageHeader, SectionCard } from "@/components/common";
import {
  COST_COMPARISON,
  CORRIDOR_REGISTER,
  DELAY_TREND,
  FREIGHT_TREND,
  INCIDENT_FREQUENCY,
  RISK_TREND,
  SHIPMENTS,
} from "@/lib/ner/demo-data";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — NER-Route AI" },
      {
        name: "description",
        content:
          "Freight movement, delay, reliability, risk, incident frequency and cost analytics for the North Eastern Region.",
      },
      { property: "og:title", content: "Analytics — NER-Route AI" },
      { property: "og:description", content: "Trend analytics for NER freight performance and corridor risk." },
    ],
  }),
  component: Analytics,
});

const axis = { fontSize: 11 };

function Analytics() {
  const reliability = [...CORRIDOR_REGISTER]
    .sort((a, b) => b.reliability - a.reliability)
    .slice(0, 8)
    .map((c) => ({ corridor: c.segment.highway + " " + c.fromName.slice(0, 6), reliability: c.reliability }));

  const performance = SHIPMENTS.map((s) => ({ id: s.id.replace("NER-SHP-", ""), delay: s.delayHours, risk: s.riskScore }));

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Trend intelligence across freight volume, delays, reliability, hazard exposure and cost."
      />
      <DemoNotice />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Freight movement" description="Monthly shipments, delivered vs delayed">
          <Chart>
            <BarChart data={FREIGHT_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={axis} />
              <YAxis tick={axis} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="delivered" stackId="a" fill="var(--chart-2)" />
              <Bar dataKey="delayed" stackId="a" fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </Chart>
        </SectionCard>

        <SectionCard title="Delay trend vs monsoon index" description="Average delay hours per month">
          <Chart>
            <LineChart data={DELAY_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={axis} />
              <YAxis tick={axis} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="avgDelayHrs" stroke="var(--chart-4)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="monsoonIndex" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
            </LineChart>
          </Chart>
        </SectionCard>

        <SectionCard title="Route reliability" description="Top corridors by reliability score">
          <Chart>
            <BarChart data={reliability} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" domain={[0, 100]} tick={axis} />
              <YAxis type="category" dataKey="corridor" width={110} tick={axis} />
              <Tooltip />
              <Bar dataKey="reliability" fill="var(--chart-1)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </Chart>
        </SectionCard>

        <SectionCard title="Risk trend" description="Landslide, flood and rainfall indices over recent weeks">
          <Chart>
            <AreaChart data={RISK_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={axis} />
              <YAxis tick={axis} domain={[0, 100]} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="landslide" stackId="1" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.35} />
              <Area type="monotone" dataKey="flood" stackId="2" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.25} />
              <Area type="monotone" dataKey="rainfall" stackId="3" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.25} />
            </AreaChart>
          </Chart>
        </SectionCard>

        <SectionCard title="Incident frequency" description="Reported events by type (season to date)">
          <Chart>
            <BarChart data={INCIDENT_FREQUENCY}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="type" tick={axis} interval={0} angle={-18} height={54} textAnchor="end" />
              <YAxis tick={axis} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </Chart>
        </SectionCard>

        <SectionCard title="Cost comparison" description="Safest vs fastest vs cheapest option per corridor (₹)">
          <Chart>
            <BarChart data={COST_COMPARISON}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="corridor" tick={axis} />
              <YAxis tick={axis} />
              <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="safest" fill="var(--chart-2)" />
              <Bar dataKey="fastest" fill="var(--chart-3)" />
              <Bar dataKey="cheapest" fill="var(--chart-1)" />
            </BarChart>
          </Chart>
        </SectionCard>

        <SectionCard title="Shipment performance" description="Delay hours and risk score per active consignment" className="xl:col-span-2">
          <Chart height={260}>
            <BarChart data={performance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="id" tick={axis} />
              <YAxis tick={axis} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="delay" name="Delay (h)" fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="risk" name="Risk score" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </Chart>
        </SectionCard>
      </div>
    </>
  );
}

function Chart({ children, height = 280 }: { children: React.ReactElement; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
