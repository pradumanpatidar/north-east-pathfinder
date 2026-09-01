import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Crosshair, CloudOff, Loader2, Upload, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEGMENTS, segmentById } from "@/lib/ner/geo";
import type { Incident, IncidentType } from "@/lib/ner/demo-data";
import { addReport, nearestSegmentId, useFieldReports } from "@/lib/field-reports";
import { cn } from "@/lib/utils";

const TYPES: IncidentType[] = [
  "Landslide",
  "Rockfall",
  "Flood",
  "Accident",
  "Road closure",
  "Heavy rainfall",
  "Other",
];

const SEVERITIES: Incident["severity"][] = ["Low", "Medium", "High", "Critical"];

/**
 * Compact, mobile-first field-officer incident report.
 * Works offline: reports are queued locally and synchronised when connectivity returns.
 */
export function IncidentReportDialog({
  trigger,
  onSubmitted,
}: {
  trigger: React.ReactNode;
  onSubmitted?: () => void;
}) {
  const { online } = useFieldReports();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<IncidentType>("Landslide");
  const [severity, setSeverity] = useState<Incident["severity"]>("High");
  const [segmentId, setSegmentId] = useState<string>(SEGMENTS[0]!.id);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsState, setGpsState] = useState<"idle" | "locating" | "denied" | "ok">("idle");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    if (open) setNow(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
  }, [open]);

  const captureGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsState("denied");
      toast.info("GPS unavailable on this device — select the affected road manually.");
      return;
    }
    setGpsState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setCoords({ lat, lng });
        setSegmentId(nearestSegmentId(lat, lng));
        setGpsState("ok");
        toast.success("GPS captured — nearest corridor segment selected.");
      },
      () => {
        setGpsState("denied");
        toast.info("Location permission unavailable — select the affected road manually.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const onPhoto = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = () => {
    const seg = segmentById(segmentId);
    const mid = seg?.path[Math.floor(seg.path.length / 2)];
    const lat = coords?.lat ?? mid?.[0] ?? 26.14;
    const lng = coords?.lng ?? mid?.[1] ?? 91.73;
    addReport({
      type,
      severity,
      segmentId,
      lat,
      lng,
      locationLabel: coords
        ? `GPS ${lat}, ${lng} · ${seg?.name ?? ""}`
        : `${seg?.name ?? "Unknown"} (manual selection)`,
      description,
      ...(photo ? { photoDataUrl: photo } : {}),
    });
    toast[online ? "success" : "warning"](
      online
        ? "Incident reported and synced. Corridor risk recalculated."
        : "OFFLINE — report stored locally and queued for sync.",
    );
    setOpen(false);
    setDescription("");
    setPhoto(undefined);
    setCoords(null);
    setGpsState("idle");
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Report road incident</DialogTitle>
          <DialogDescription>
            Field-officer report · {now || "—"} IST. Feeds straight into corridor risk and route scoring.
          </DialogDescription>
        </DialogHeader>

        {!online ? (
          <p className="flex items-center gap-2 rounded-sm border border-risk-high/40 bg-risk-high/10 px-3 py-2 text-xs font-medium text-risk-high">
            <WifiOff className="size-4" aria-hidden /> OFFLINE MODE — the report will be stored on this device and
            marked “Pending sync”.
          </p>
        ) : null}

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Incident type</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "min-h-11 rounded-sm border px-2 text-xs font-medium",
                    type === t ? "border-primary bg-accent text-foreground" : "border-border bg-card hover:bg-muted",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Severity</Label>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {SEVERITIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={cn(
                    "min-h-11 rounded-sm border px-2 text-xs font-medium",
                    severity === s
                      ? "border-risk-severe bg-risk-severe/10 text-risk-severe"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
            <Button type="button" variant="outline" className="min-h-11" onClick={captureGps}>
              {gpsState === "locating" ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Crosshair className="mr-1 size-4" />
              )}
              Use my GPS location
            </Button>
            <p className="text-xs text-muted-foreground">
              {coords
                ? `Captured ${coords.lat}, ${coords.lng}`
                : gpsState === "denied"
                  ? "GPS unavailable — choose the affected road below."
                  : "Optional. Coordinates auto-match the nearest corridor."}
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Affected road / segment</Label>
            <Select value={segmentId} onValueChange={setSegmentId}>
              <SelectTrigger className="mt-1.5 min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEGMENTS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.highway} · {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Photo (camera or upload)</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <Input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
              <Button type="button" variant="outline" className="min-h-11" onClick={() => fileRef.current?.click()}>
                <Camera className="mr-1 size-4" /> Capture / attach
              </Button>
              {photo ? (
                <img src={photo} alt="Attached incident evidence" className="h-11 w-16 rounded-sm object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">No photo attached</span>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="inc-desc" className="text-xs text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="inc-desc"
              className="mt-1.5"
              rows={3}
              placeholder="Debris across both lanes, single-lane movement only…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {online ? <Upload className="size-3.5" /> : <CloudOff className="size-3.5" />}
            {online ? "Will sync immediately" : "Queued for sync"}
          </span>
          <Button className="min-h-11" onClick={submit}>
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
