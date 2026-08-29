import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { DemoNotice, MetricCard, PageHeader, SectionCard } from "@/components/common";
import { Button } from "@/components/ui/button";
import { PROVIDERS } from "@/lib/services";
import { SCORE_WEIGHTS } from "@/lib/ner/scoring";
import { NAV_PERMISSIONS, ROLE_LABELS, useAuth, type Role } from "@/lib/auth";
import { CITIES, SEGMENTS } from "@/lib/ner/geo";
import { ALERTS, INCIDENTS, SHIPMENTS } from "@/lib/ner/demo-data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — NER-Route AI" },
      {
        name: "description",
        content:
          "System administration: data provider registry, scoring weight configuration, role permissions and dataset inventory for the NER freight platform.",
      },
      { property: "og:title", content: "Administration — NER-Route AI" },
      { property: "og:description", content: "Provider registry and role matrix for NER-Route AI." },
    ],
  }),
  component: Admin,
});

const ROLES: Role[] = ["admin", "authority", "operator", "analyst"];

const WEIGHT_DOC: Record<string, string> = {
  safety: "Landslide, flood and incident exposure on each segment.",
  accessibility: "Road condition, terrain, closures and vehicle suitability.",
  time: "Estimated transit hours against the corridor baseline.",
  cost: "Fuel, tolls, terrain surcharge and detour penalty.",
  reliability: "Historic on-time performance of the corridor.",
  environment: "CO2 emissions proxy from distance and gradient.",
};

function Admin() {
  const { user, can } = useAuth();

  if (!can("/admin")) {
    return (
      <>
        <PageHeader title="Administration" subtitle="Restricted module" />
        <SectionCard title="Access denied" description="Administrator role required">
          <p className="text-sm text-muted-foreground">
            You are signed in as {user ? ROLE_LABELS[user.role] : "guest"}. Switch to the Administrator role from the
            sidebar profile menu to view system configuration.
          </p>
        </SectionCard>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Administration"
        subtitle="Data providers, scoring configuration, access control and dataset inventory."
      />
      <DemoNotice />

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="Corridor segments" value={SEGMENTS.length} hint="Graph edges in routing network" />
        <MetricCard label="Nodes / hubs" value={CITIES.length} hint="Cities & logistics hubs" />
        <MetricCard label="Consignments" value={SHIPMENTS.length} hint="Demo freight register" />
        <MetricCard label="Incidents / alerts" value={`${INCIDENTS.length} / ${ALERTS.length}`} hint="Simulated feeds" />
      </div>

      <SectionCard
        title="Data provider registry"
        description="Every feed is behind an interface — switch a provider to LIVE by supplying credentials, no UI change required."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info("Live provider credentials are configured server-side in production deployments.")}
          >
            Configure credentials
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Provider</th>
                <th className="py-2 pr-3 font-medium">Mode</th>
                <th className="py-2 pr-3 font-medium">Endpoint contract</th>
                <th className="py-2 pr-3 font-medium">Last sync</th>
              </tr>
            </thead>
            <tbody>
              {PROVIDERS.map((p) => (
                <tr key={p.name} className="border-b border-border/60 last:border-0 align-top">
                  <td className="py-2 pr-3">
                    <div className="text-xs font-medium">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">{p.description}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <span className="rounded-sm border border-border px-2 py-0.5 text-[11px]">{p.mode}</span>
                  </td>
                  <td className="py-2 pr-3 font-mono text-[11px]">{p.endpoint}</td>
                  <td className="py-2 pr-3 tabular text-[11px] text-muted-foreground">
                    {new Date(p.lastSync).toLocaleString("en-GB")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Scoring configuration" description="Default weights used by the explainable route engine">
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.entries(SCORE_WEIGHTS).map(([key, weight]) => (
            <div key={key} className="rounded-sm border border-border px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium capitalize">{key}</span>
                <span className="tabular text-xs">{Math.round(weight * 100)}%</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{WEIGHT_DOC[key]}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Emergency Mode re-weights the model toward safety and accessibility and relaxes cost and time penalties.
        </p>
      </SectionCard>

      <SectionCard title="Role permission matrix" description="Module visibility per role">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Module</th>
                {ROLES.map((r) => (
                  <th key={r} className="py-2 pr-3 font-medium">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(NAV_PERMISSIONS).map(([path, roles]) => (
                <tr key={path} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 font-mono text-xs">{path}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="py-2 pr-3 text-xs">
                      {roles.includes(r) ? "✓" : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}
