import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { MapLayers, MapRoute } from "./NerMap";

const NerMap = lazy(() => import("./NerMap"));

export function MapPanel(props: {
  layers?: Partial<MapLayers>;
  routes?: MapRoute[];
  height?: string;
  focusSegmentIds?: string[];
}) {
  const fallback = (
    <div
      style={{ height: props.height ?? "480px" }}
      className="flex w-full items-center justify-center rounded-md border border-border bg-muted text-sm text-muted-foreground"
    >
      Loading GIS layers…
    </div>
  );
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <NerMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
