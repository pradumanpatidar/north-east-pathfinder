import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Prototype role-based access control.
 * Sessions are stored locally so the demo runs without a backend.
 * Swap `signIn`/`signUp` for Supabase Auth calls to move to production.
 */

export type Role = "admin" | "authority" | "operator" | "analyst";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  authority: "Government Authority",
  operator: "Logistics Operator",
  analyst: "Analyst",
};

export interface AppUser {
  name: string;
  email: string;
  role: Role;
  org: string;
}

export const NAV_PERMISSIONS: Record<string, Role[]> = {
  "/": ["admin", "authority", "operator", "analyst"],
  "/planner": ["admin", "authority", "operator"],
  "/map": ["admin", "authority", "operator", "analyst"],
  "/freight": ["admin", "authority", "operator"],
  "/risk": ["admin", "authority", "analyst"],
  "/incidents": ["admin", "authority", "operator", "analyst"],
  "/accessibility": ["admin", "authority", "operator", "analyst"],
  "/alerts": ["admin", "authority", "operator", "analyst"],
  "/analytics": ["admin", "authority", "analyst"],
  "/reports": ["admin", "authority", "operator", "analyst"],
  "/admin": ["admin"],
};

const STORAGE_KEY = "ner-route-ai.session";

const DEFAULT_USER: AppUser = {
  name: "Demo Controller",
  email: "controller@mdoner.gov.in",
  role: "authority",
  org: "MDoNER — NER Freight Cell",
};

interface AuthValue {
  user: AppUser | null;
  hydrated: boolean;
  signIn: (email: string, role: Role, name?: string) => void;
  signOut: () => void;
  setRole: (role: Role) => void;
  can: (path: string) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setUser(raw ? (JSON.parse(raw) as AppUser) : DEFAULT_USER);
    } catch {
      setUser(DEFAULT_USER);
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: AppUser | null) => {
    setUser(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      hydrated,
      signIn: (email, role, name) =>
        persist({
          name: name || (email.split("@")[0] ?? email).replace(/[._]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
          email,
          role,
          org: role === "operator" ? "Registered Logistics Operator" : "MDoNER — NER Freight Cell",
        }),
      signOut: () => persist(null),
      setRole: (role) => persist({ ...(user ?? DEFAULT_USER), role }),
      can: (path) => {
        const allowed = NAV_PERMISSIONS[path];
        if (!allowed) return true;
        return !!user && allowed.includes(user.role);
      },
    }),
    [user, hydrated, persist],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
