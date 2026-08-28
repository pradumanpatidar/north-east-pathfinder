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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/planner", label: "Smart Route Planner", icon: RouteIcon },
  { to: "/map", label: "Live GIS Map", icon: Map },
  { to: "/freight", label: "Freight Management", icon: Truck },
  { to: "/risk", label: "Disaster & Risk", icon: Mountain },
  { to: "/incidents", label: "Road Incidents", icon: TriangleAlert },
  { to: "/accessibility", label: "Accessibility", icon: Accessibility },
  { to: "/alerts", label: "Alerts", icon: BellRing },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/admin", label: "Admin", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, can, setRole } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const nav = NAV.filter((n) => can(n.to));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
          <button
            className="rounded-md p-2 hover:bg-muted lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-sm bg-primary text-primary-foreground">
              <ShieldCheck className="size-4.5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-foreground">NER-Route AI</span>
              <span className="block text-[11px] text-muted-foreground">
                MDoNER · Smart Freight Movement Optimization
              </span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-sm border border-border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground sm:inline">
              SIH26002 · Prototype
            </span>
            <Select value={user?.role ?? "authority"} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="h-8 w-[168px] text-xs" aria-label="Active role">
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
          <nav className="space-y-0.5">
            {nav.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-sidebar-foreground transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/60",
                  )}
                >
                  <Icon className="size-4 shrink-0 opacity-80" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 rounded-sm border border-sidebar-border p-3 text-[11px] leading-relaxed text-sidebar-foreground/70">
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
