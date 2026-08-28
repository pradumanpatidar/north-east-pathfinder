import { createFileRoute } from "@tanstack/react-router";
import { AccessPill, DemoNotice, MetricCard, PageHeader, SectionCard } from "@/components/common";
import { CORRIDOR_REGISTER, STATE_ACCESSIBILITY } from "@/lib/ner/demo-data";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "Corridor Accessibility — NER-Route AI" },
      {
        name: "description",
        content:
          "0–100 accessibility scoring for North East corridors based on road condition, weather, disaster risk, closures, vehicle suitability and terrain.",
      },
      { property: "og:title", content: "Corridor Accessibility — NER-Route AI" },
      { property: "og:description", content: "Green / amber / red accessibility grading for NER freight corridors." },
    ],
  }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  const rows = [...CORRIDOR_REGISTER].sort((a, b) => a.accessibility - b.accessibility);
  const green = rows.filter((r) => r.accessibility >= 70).length;
  const amber = rows.filter((r) => r.accessibility >= 45 && r.accessibility < 70).length;
  const red = rows.filter((r) => r.accessibility < 45).length;

  return (
    <>
      <PageHeader
        title="Accessibility Index"
        subtitle="Composite 0–100 score per corridor: road condition (30%), weather (20%), disaster risk (20%), terrain (15%), vehicle suitability (10%), connectivity (5%)."
      />
      <DemoNotice />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Accessible corridors" value={green} tone="low" hint="Score ≥ 70 (green)" />
        <MetricCard label="Moderate" value={amber} tone="moderate" hint="Score 45–69 (yellow)" />
        <MetricCard label="Difficult / high risk" value={red} tone="severe" hint="Score < 45 (red)" />
      </div>

      <SectionCard title="State-level accessibility" description="Average score by state (simulated aggregate)">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={STATE_ACCESSIBILITY}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="state" tick={{ fontSize: 11 }} interval={0} angle={-18} height={50} textAnchor="end" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="score" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Corridor accessibility register" description="Lowest scores first — these need intervention">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Corridor</th>
                <th className="py-2 pr-3 font-medium">Road condition</th>
                <th className="py-2 pr-3 font-medium">Rain 24h</th>
                <th className="py-2 pr-3 font-medium">Terrain</th>
                <th className="py-2 pr-3 font-medium">Max vehicle</th>
                <th className="py-2 pr-3 font-medium">Closure</th>
                <th className="py-2 pr-3 font-medium">Accessibility</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.segment.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 text-xs">{r.segment.highway} · {r.segment.name}</td>
                  <td className="py-2 pr-3 tabular text-xs">{r.segment.roadCondition}/100</td>
                  <td className="py-2 pr-3 tabular text-xs">{r.segment.rainfallMm24h} mm</td>
                  <td className="py-2 pr-3 text-xs capitalize">{r.segment.terrain}</td>
                  <td className="py-2 pr-3 tabular text-xs">{r.segment.maxVehicleTonnes} t</td>
                  <td className="py-2 pr-3 text-xs">{r.segment.closed ? "Closed" : "Open"}</td>
                  <td className="py-2 pr-3"><AccessPill score={r.accessibility} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}
