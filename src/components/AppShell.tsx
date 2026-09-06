import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Route as RouteIcon,
  Map,
  Truck,
  Mountain,
  TriangleAlert,
  Accessibility,
  BellRing,
  BarChart3,
  FileText,
  Settings,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, useAuth, type Role } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/locales";
import { LanguageSwitcher } from "@/components/voice/LanguageSwitcher";
import { SpeakButton } from "@/components/voice/SpeakButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NAV_GROUPS: {
  labelKey: TranslationKey;
  items: { to: string; labelKey: TranslationKey; icon: typeof Map }[];
}[] = [
  {
    labelKey: "nav.group.operations",
    items: [
      { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
      { to: "/planner", labelKey: "nav.planner", icon: RouteIcon },
      { to: "/freight", labelKey: "nav.freight", icon: Truck },
      { to: "/map", labelKey: "nav.map", icon: Map },
    ],
  },
  {
    labelKey: "nav.group.risk",
    items: [
      { to: "/risk", labelKey: "nav.risk", icon: Mountain },
      { to: "/incidents", labelKey: "nav.incidents", icon: TriangleAlert },
      { to: "/alerts", labelKey: "nav.alerts", icon: BellRing },
      { to: "/accessibility", labelKey: "nav.accessibility", icon: Accessibility },
    ],
  },
  {
    labelKey: "nav.group.insights",
    items: [
      { to: "/analytics", labelKey: "nav.analytics", icon: BarChart3 },
      { to: "/reports", labelKey: "nav.reports", icon: FileText },
      { to: "/admin", labelKey: "nav.admin", icon: Settings },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, can, setRole } = useAuth();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((n) => can(n.to)) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <button
            className="rounded-md p-2 hover:bg-muted lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("nav.toggle")}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="size-4.5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-foreground">{t("app.name")}</span>
              <span className="hidden text-[11px] text-muted-foreground sm:block">{t("app.tagline")}</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <span className="hidden rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground lg:inline">
              SIH26002 · {t("app.demoBadge")}
            </span>
            <SpeakButton />
            <LanguageSwitcher />
            <ThemeToggle />
            <Select value={user?.role ?? "authority"} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="hidden h-9 w-[168px] text-xs sm:flex" aria-label={t("header.role")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={cn(
            "fixed inset-y-14 left-0 z-30 w-64 overflow-y-auto border-r border-sidebar-border bg-sidebar px-2 py-3 transition-transform lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <nav className="space-y-4">
            {groups.map((group) => (
              <div key={group.labelKey}>
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
                  {t(group.labelKey)}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = pathname === item.to;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex min-h-11 items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors",
                          active
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : "hover:bg-sidebar-accent/60",
                        )}
                      >
                        <Icon className="size-4 shrink-0 opacity-80" />
                        {t(item.labelKey)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="mt-4 rounded-md border border-sidebar-border p-3 text-[11px] leading-relaxed text-sidebar-foreground/70">
            <p className="font-medium text-sidebar-foreground">{user?.name}</p>
            <p>{user ? ROLE_LABELS[user.role] : ""}</p>
            <p className="mt-1">{user?.org}</p>
            <p className="mt-2 border-t border-sidebar-border pt-2">
              All datasets in this build are simulated. No live government feed is connected.
            </p>
          </div>
        </aside>

        {open ? (
          <div
            className="fixed inset-0 top-14 z-20 bg-foreground/30 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
        ) : null}

        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6">
          <div className="mx-auto max-w-[1400px] space-y-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
