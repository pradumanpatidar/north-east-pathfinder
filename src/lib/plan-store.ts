import type { RouteOption, RouteRequest } from "./ner/scoring";

export interface StoredPlan {
  request: RouteRequest;
  options: Array<Omit<RouteOption, "segments"> & { segmentIds: string[] }>;
  createdAt: string;
}

const KEY = "ner-route-ai.last-plan";

export function savePlan(request: RouteRequest, options: RouteOption[]) {
  const payload: StoredPlan = {
    request,
    options: options.map(({ segments, ...rest }) => ({ ...rest, segmentIds: segments.map((s) => s.id) })),
    createdAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
  return payload;
}

export function loadPlan(): StoredPlan | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredPlan) : null;
  } catch {
    return null;
  }
}
