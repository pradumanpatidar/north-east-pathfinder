import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DEMO_NOTICE } from "@/lib/ner/demo-data";
import { AlertTriangle, Database } from "lucide-react";

export function DemoNotice({ className, text }: { className?: string; text?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground",
        className,
      )}
    >
      <Database className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        <span className="font-semibold text-foreground">DEMO / SIMULATED DATA</span> — {text ?? DEMO_NOTICE}
      </span>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  unit,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: "default" | "low" | "moderate" | "high" | "severe";
  icon?: ReactNode;
}) {
  const toneClass = {
    default: "text-foreground",
    low: "text-risk-low",
    moderate: "text-risk-moderate",
    high: "text-risk-high",
    severe: "text-risk-severe",
  }[tone];

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p className={cn("mt-2 text-2xl font-semibold tabular", toneClass)}>
        {value}
        {unit ? <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function RiskPill({ score, label }: { score: number; label?: string }) {
  const tone =
    score >= 75 ? "severe" : score >= 55 ? "high" : score >= 35 ? "moderate" : "low";
  const classes = {
    low: "border-risk-low/40 bg-risk-low/10 text-risk-low",
    moderate: "border-risk-moderate/40 bg-risk-moderate/15 text-risk-moderate",
    high: "border-risk-high/40 bg-risk-high/12 text-risk-high",
    severe: "border-risk-severe/40 bg-risk-severe/12 text-risk-severe",
  }[tone];
  const text = label ?? (tone === "severe" ? "Severe" : tone === "high" ? "High" : tone === "moderate" ? "Moderate" : "Low");
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium", classes)}>
      {text}
      <span className="tabular opacity-80">{score}</span>
    </span>
  );
}

export function AccessPill({ score }: { score: number }) {
  const tone = score >= 70 ? "low" : score >= 45 ? "moderate" : "severe";
  const classes = {
    low: "border-risk-low/40 bg-risk-low/10 text-risk-low",
    moderate: "border-risk-moderate/40 bg-risk-moderate/15 text-risk-moderate",
    severe: "border-risk-severe/40 bg-risk-severe/12 text-risk-severe",
  }[tone];
  const text = score >= 70 ? "Accessible" : score >= 45 ? "Moderate" : "Difficult";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium", classes)}>
      {text} <span className="tabular opacity-80">{score}</span>
    </span>
  );
}

export function ScoreBar({ label, value, weight }: { label: string; value: number; weight?: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">
          {label}
          {weight !== undefined ? <span className="ml-1 opacity-70">({Math.round(weight * 100)}%)</span> : null}
        </span>
        <span className="tabular font-medium text-foreground">{value}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-sm bg-muted">
        <div
          className="h-full rounded-sm bg-primary"
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-md border border-border bg-card", className)}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
      <AlertTriangle className="size-4" aria-hidden /> {message}
    </div>
  );
}
