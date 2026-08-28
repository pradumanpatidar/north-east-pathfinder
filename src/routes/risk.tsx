import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { DemoNotice, MetricCard, PageHeader, RiskPill, ScoreBar, SectionCard } from "@/components/common";
import { CORRIDOR_REGISTER, regionalRisk } from "@/lib/ner/demo-data";
import { SEGMENTS } from "@/lib/ner/geo";
import { services, type RockWatchPrediction } from "@/lib/services";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/risk")({
  head: () => ({
    meta: [
      { title: "Disaster & Risk — NER-Route AI" },
      {
        name: "description",
        content:
          "Explainable 0–100 corridor risk scoring for landslide, rockfall, flood, rainfall, blockage and connectivity disruption in the North East.",
      },
      { property: "og:title", content: "Disaster & Risk — NER-Route AI" },
      { property: "og:description", content: "Corridor-level disaster risk assessment with RockWatch AI module." },
    ],
  }),
  component: RiskPage,
});

function RiskPage() {
  const [preds, setPreds] = useState<RockWatchPrediction[]>([]);
  const [loading, setLoading] = useState(false);

  const runRockWatch = async () => {
    setLoading(true);
    const out = await services.rockwatch.predictAll();
    setPreds(out);
    setLoading(false);
  };

  useEffect(() => {
    void runRockWatch();
  }, []);

  const categories = [
    { key: "Landslide", value: avg(SEGMENTS.map((s) => s.landslideRisk)) },
    { key: "Rockfall", value: avg(SEGMENTS.map((s) => s.landslideRisk * 0.8)) },
    { key: "Flood", value: avg(SEGMENTS.map((s) => s.floodRisk)) },
    { key: "Heavy rainfall", value: avg(SEGMENTS.map((s) => Math.min(100, s.rainfallMm24h * 0.8))) },
    { key: "Road blockage", value: avg(SEGMENTS.map((s) => (s.closed ? 100 : 100 - s.roadCondition))) },
    { key: "Connectivity disruption", value: avg(SEGMENTS.map((s) => (s.laneWidthM < 6 ? 72 : 34))) },
  ];

  const worst = [...CORRIDOR_REGISTER].sort((a, b) => b.risk - a.risk).slice(0, 8);

  return (
    <>
      <PageHeader
        title="Disaster & Risk Assessment"
        subtitle="Composite 0–100 corridor risk built from rainfall, terrain, historical incidents, road condition, slope vulnerability and flood exposure."
      />
      <DemoNotice />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Regional risk level" value={regionalRisk} unit="/100" tone={regionalRisk >= 55 ? "high" : "moderate"} />
        <MetricCard label="Severe corridors" value={CORRIDOR_REGISTER.filter((c) => c.risk >= 75).length} tone="severe" hint="Risk ≥ 75" />
        <MetricCard label="Corridors under watch" value={CORRIDOR_REGISTER.filter((c) => c.risk >= 55 && c.risk < 75).length} tone="high" hint="Risk 55–74" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Risk by category" description="Network-wide averages (0–100)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="key" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Explainable risk factors" description="How the composite score is computed">
          <div className="space-y-3">
            <ScoreBar label="Rainfall (24h observed)" value={40} weight={0.2} />
            <ScoreBar label="Terrain / slope vulnerability" value={45} weight={0.1} />
            <ScoreBar label="Landslide susceptibility" value={52} weight={0.4} />
            <ScoreBar label="Flood exposure" value={38} weight={0.25} />
            <ScoreBar label="Road condition" value={30} weight={0.05} />
            <p className="pt-1 text-xs text-muted-foreground">
              Each corridor's score is a weighted sum of these factors, length-weighted when aggregated to a route.
              Values shown are network averages; per-corridor values appear in the register below.
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="RockWatch AI — rockfall & landslide prediction module"
        description="API-ready interface. No ML model is connected in this prototype."
        actions={
          <Button size="sm" variant="outline" onClick={runRockWatch} disabled={loading}>
            <Brain className="mr-1 size-4" /> {loading ? "Running…" : "Re-run prediction"}
          </Button>
        }
      >
        <DemoNotice
          className="mb-3"
          text="DEMO / SIMULATED PREDICTIONS — outputs are deterministic functions of terrain, rainfall and road attributes, not a trained model. Endpoint contract: POST /rockwatch/predict → { rockfallProbability, landslideProbability, riskScore, confidence }."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Corridor</th>
                <th className="py-2 pr-3 font-medium">Rockfall prob.</th>
                <th className="py-2 pr-3 font-medium">Landslide prob.</th>
                <th className="py-2 pr-3 font-medium">Risk score</th>
                <th className="py-2 pr-3 font-medium">Confidence</th>
                <th className="py-2 pr-3 font-medium">Model</th>
              </tr>
            </thead>
            <tbody>
              {preds
                .slice()
                .sort((a, b) => b.riskScore - a.riskScore)
                .slice(0, 10)
                .map((p) => {
                  const c = CORRIDOR_REGISTER.find((x) => x.segment.id === p.segmentId);
                  return (
                    <tr key={p.segmentId} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 text-xs">{c?.segment.highway} · {c?.segment.name}</td>
                      <td className="py-2 pr-3 tabular text-xs">{(p.rockfallProbability * 100).toFixed(1)}%</td>
                      <td className="py-2 pr-3 tabular text-xs">{(p.landslideProbability * 100).toFixed(1)}%</td>
                      <td className="py-2 pr-3"><RiskPill score={p.riskScore} /></td>
                      <td className="py-2 pr-3 tabular text-xs">{(p.confidence * 100).toFixed(0)}%</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{p.modelVersion} ({p.mode})</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Highest-risk corridors" description="Ranked by composite disaster risk">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Corridor</th>
                <th className="py-2 pr-3 font-medium">Terrain</th>
                <th className="py-2 pr-3 font-medium">Rain 24h</th>
                <th className="py-2 pr-3 font-medium">Landslide</th>
                <th className="py-2 pr-3 font-medium">Flood</th>
                <th className="py-2 pr-3 font-medium">Incidents</th>
                <th className="py-2 pr-3 font-medium">Composite</th>
              </tr>
            </thead>
            <tbody>
              {worst.map((c) => (
                <tr key={c.segment.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 text-xs">
                    {c.segment.highway} · {c.segment.name} {c.segment.closed ? <span className="text-risk-severe">(closed)</span> : null}
                  </td>
                  <td className="py-2 pr-3 text-xs capitalize">{c.segment.terrain}</td>
                  <td className="py-2 pr-3 tabular text-xs">{c.segment.rainfallMm24h} mm</td>
                  <td className="py-2 pr-3 tabular text-xs">{c.segment.landslideRisk}</td>
                  <td className="py-2 pr-3 tabular text-xs">{c.segment.floodRisk}</td>
                  <td className="py-2 pr-3 tabular text-xs">{c.incidents}</td>
                  <td className="py-2 pr-3"><RiskPill score={c.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}

const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
