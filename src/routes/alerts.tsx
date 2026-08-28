import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { DemoNotice, MetricCard, PageHeader, SectionCard } from "@/components/common";
import { Button } from "@/components/ui/button";
import { ALERTS, type Alert } from "@/lib/ner/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — NER-Route AI" },
      {
        name: "description",
        content:
          "Operational alerts for blocked routes, disaster risk, severe rainfall, shipment delays and accessibility deterioration in the North East.",
      },
      { property: "og:title", content: "Alerts — NER-Route AI" },
      { property: "og:description", content: "Severity-graded freight advisories with recommended actions." },
    ],
  }),
  component: Alerts,
});

function Alerts() {
  const [state, setState] = useState<Alert[]>(ALERTS);
  const [filter, setFilter] = useState<"all" | "open">("open");

  const rows = state.filter((a) => (filter === "open" ? !a.acknowledged : true));

  const ack = (id: string) => {
    setState((s) => s.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    toast.success(`${id} acknowledged and logged to the alert audit trail.`);
  };

  return (
    <>
      <PageHeader
        title="Alert System"
        subtitle="Severity-graded advisories with location, affected route and the recommended operational action."
        actions={
          <Button size="sm" variant="outline" onClick={() => setFilter((f) => (f === "open" ? "all" : "open"))}>
            {filter === "open" ? "Showing unacknowledged" : "Showing all"}
          </Button>
        }
      />
      <DemoNotice />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Critical" value={state.filter((a) => a.severity === "Critical").length} tone="severe" />
        <MetricCard label="Warning" value={state.filter((a) => a.severity === "Warning").length} tone="moderate" />
        <MetricCard label="Unacknowledged" value={state.filter((a) => !a.acknowledged).length} tone="high" />
      </div>

      <SectionCard title={`Alerts (${rows.length})`} description="Acknowledge to remove from the active queue">
        <div className="space-y-2.5">
          {rows.map((a) => (
            <article
              key={a.id}
              className={cn(
                "rounded-sm border-l-2 border border-border p-3",
                a.severity === "Critical"
                  ? "border-l-risk-severe"
                  : a.severity === "Warning"
                    ? "border-l-risk-moderate"
                    : "border-l-primary",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="tabular text-xs text-muted-foreground">{a.id}</span>
                  <h3 className="text-sm font-semibold">{a.kind}</h3>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      a.severity === "Critical"
                        ? "text-risk-severe"
                        : a.severity === "Warning"
                          ? "text-risk-moderate"
                          : "text-muted-foreground",
                    )}
                  >
                    {a.severity}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular text-[11px] text-muted-foreground">
                    {new Date(a.issuedAt).toLocaleString("en-GB")}
                  </span>
                  {a.acknowledged ? (
                    <span className="rounded-sm border border-border px-2 py-0.5 text-[11px]">Acknowledged</span>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => ack(a.id)}>
                      Acknowledge
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {a.location} · Affected route: {a.affectedRoute}
              </p>
              <p className="mt-1.5 text-sm">
                <span className="font-medium">Recommended action: </span>
                {a.action}
              </p>
            </article>
          ))}
          {!rows.length ? <p className="text-sm text-muted-foreground">No alerts in this view.</p> : null}
        </div>
      </SectionCard>
    </>
  );
}
