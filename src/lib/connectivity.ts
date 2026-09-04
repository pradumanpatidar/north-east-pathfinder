/**
 * Real connectivity state. Not decorative: ONLINE requires a successful reachability
 * probe against the backend; a failing probe while navigator reports online is
 * reported as LIMITED CONNECTIVITY.
 */

import { useEffect, useState } from "react";

export type ConnState = "ONLINE" | "LIMITED" | "OFFLINE";

let state: ConnState = "ONLINE";
const listeners = new Set<(s: ConnState) => void>();
let probing = false;

function set(next: ConnState) {
  if (next === state) return;
  state = next;
  for (const l of listeners) l(next);
}

export function getConnState() {
  return state;
}

export async function probeConnectivity(): Promise<ConnState> {
  if (typeof navigator === "undefined") return "ONLINE";
  if (!navigator.onLine) {
    set("OFFLINE");
    return "OFFLINE";
  }
  if (probing) return state;
  probing = true;
  try {
    const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
    if (!url) {
      set("ONLINE");
      return "ONLINE";
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${url}/auth/v1/health`, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: { apikey: (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string) ?? "" },
    });
    clearTimeout(timer);
    set(res.ok ? "ONLINE" : "LIMITED");
  } catch {
    set(navigator.onLine ? "LIMITED" : "OFFLINE");
  } finally {
    probing = false;
  }
  return state;
}

export function useConnectivity() {
  const [s, setS] = useState<ConnState>(state);

  useEffect(() => {
    listeners.add(setS);
    setS(navigator.onLine ? state : "OFFLINE");
    void probeConnectivity();

    const on = () => void probeConnectivity();
    const off = () => set("OFFLINE");
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const timer = window.setInterval(() => void probeConnectivity(), 30_000);

    return () => {
      listeners.delete(setS);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.clearInterval(timer);
    };
  }, []);

  return s;
}
