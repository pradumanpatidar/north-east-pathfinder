import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Ambulance,
  Camera,
  CloudRain,
  Construction,
  LifeBuoy,
  MapPin,
  Mountain,
  Truck,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MicButton } from "@/components/voice/MicButton";
import { useI18n } from "@/lib/i18n";
import { speak } from "@/lib/voice";
import { advanceSos, createSos, type SosIssue, type SosRequest } from "@/lib/sos-store";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/locales";

const ISSUES: { id: SosIssue; key: TranslationKey; icon: typeof Mountain }[] = [
  { id: "landslide", key: "sos.type.landslide", icon: Mountain },
  { id: "rain", key: "sos.type.rain", icon: CloudRain },
  { id: "roadblock", key: "sos.type.roadblock", icon: Construction },
  { id: "breakdown", key: "sos.type.breakdown", icon: Truck },
  { id: "medical", key: "sos.type.medical", icon: Ambulance },
  { id: "other", key: "sos.type.other", icon: AlertTriangle },
];

const STAGES: { status: SosRequest["status"]; key: TranslationKey }[] = [
  { status: "sent", key: "sos.status.sent" },
  { status: "accepted", key: "sos.status.accepted" },
  { status: "enroute", key: "sos.status.enroute" },
  { status: "resolved", key: "sos.status.resolved" },
];

/** Always-visible emergency control. 2-second hold prevents accidental triggers. */
export function SosButton() {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [holding, setHolding] = useState(false);
  const [issue, setIssue] = useState<SosIssue | null>(null);
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [request, setRequest] = useState<SosRequest | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    void speak(t("sos.prompt"), lang);
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setGeoError(true),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } else {
      setGeoError(true);
    }
  }, [open, lang, t]);

  // Simulated responder progression, announced by voice at each stage.
  useEffect(() => {
    if (!request || request.status === "queued" || request.status === "resolved") return;
    const next = STAGES[STAGES.findIndex((s) => s.status === request.status) + 1];
    if (!next) return;
    const timer = setTimeout(() => {
      advanceSos(request.id, next.status);
      setRequest((r) => (r ? { ...r, status: next.status } : r));
      void speak(t(next.key), lang);
    }, 4000);
    return () => clearTimeout(timer);
  }, [request, lang, t]);

  const startHold = () => {
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      setHolding(false);
      setOpen(true);
    }, 2000);
  };
  const cancelHold = () => {
    setHolding(false);
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };

  const reset = () => {
    setIssue(null);
    setDescription("");
    setPhoto(undefined);
    setCoords(null);
    setGeoError(false);
    setRequest(null);
  };

  const submit = () => {
    const req = createSos({
      issue: issue ?? "other",
      description,
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      ...(photo ? { photo } : {}),
    });
    setRequest(req);
    void speak(req.status === "queued" ? t("sos.queued") : t("sos.sent"), lang);
  };

  return (
    <>
      <button
        type="button"
        data-voice-skip
        aria-label={t("sos.hold")}
        title={t("sos.hold")}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(true);
        }}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex size-16 flex-col items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          holding && "scale-110 ring-4 ring-destructive/40",
        )}
      >
        <LifeBuoy className="size-5" />
        <span className="text-xs font-bold tracking-wide">{t("sos.button")}</span>
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <LifeBuoy className="size-5" /> {t("sos.title")}
            </DialogTitle>
          </DialogHeader>

          {request ? (
            <div className="space-y-4">
              <p className="rounded-md border border-risk-low/40 bg-risk-low/10 px-3 py-2 text-sm text-foreground">
                {request.status === "queued" ? t("sos.queued") : t("sos.sent")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("sos.responder")}: <span className="font-medium text-foreground">{request.responder}</span>
                {request.responderKm !== undefined ? ` · ${request.responderKm} km` : ""}
              </p>
              <ol className="space-y-2">
                {STAGES.map((s, i) => {
                  const currentIndex = STAGES.findIndex((x) => x.status === request.status);
                  const reached = currentIndex >= i && request.status !== "queued";
                  return (
                    <li key={s.status} className="flex items-center gap-2 text-sm">
                      <span
                        className={cn(
                          "size-2.5 rounded-full",
                          reached ? "bg-primary" : "bg-muted-foreground/30",
                        )}
                      />
                      <span className={reached ? "font-medium text-foreground" : "text-muted-foreground"}>
                        {t(s.key)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">{t("sos.prompt")}</p>
              <div className="grid grid-cols-2 gap-2">
                {ISSUES.map((o) => {
                  const Icon = o.icon;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setIssue(o.id);
                        void speak(t(o.key), lang);
                      }}
                      className={cn(
                        "flex min-h-16 flex-col items-center justify-center gap-1 rounded-md border px-2 py-2 text-center text-xs font-medium transition-transform active:scale-[0.98]",
                        issue === o.id ? "border-destructive bg-destructive/10 text-destructive" : "border-border",
                      )}
                    >
                      <Icon className="size-5" />
                      {t(o.key)}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-start gap-2">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("sos.describe")}
                  aria-label={t("sos.describe")}
                  rows={2}
                  className="flex-1"
                />
                <MicButton size="lg" onText={(text) => setDescription((d) => (d ? `${d} ${text}` : text))} />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-3.5" />
                {coords
                  ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                  : geoError
                    ? t("sos.locationDenied")
                    : t("sos.locating")}
              </div>

              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm">
                <Camera className="size-4" />
                {photo ? "1 photo" : t("sos.photo")}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setPhoto(String(reader.result));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>

              <button
                type="button"
                onClick={submit}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-destructive px-4 text-sm font-semibold text-destructive-foreground transition-transform hover:bg-destructive/90 active:scale-[0.98]"
              >
                {t("sos.send")}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
