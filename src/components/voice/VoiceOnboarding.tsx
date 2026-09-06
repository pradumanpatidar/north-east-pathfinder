import { useEffect, useState } from "react";
import { ShieldCheck, Volume2 } from "lucide-react";
import { translate, useI18n } from "@/lib/i18n";
import { speak, stopSpeaking } from "@/lib/voice";
import { cn } from "@/lib/utils";

/**
 * First-run experience: animated splash + spoken greeting, then a language
 * grid with native-script labels and audio confirmation on tap.
 */
export function VoiceOnboarding() {
  const { lang, languages, setLang, hasChosen, markChosen, hydrated, t } = useI18n();
  const [phase, setPhase] = useState<"splash" | "choose" | "done">("splash");

  useEffect(() => {
    if (!hydrated) return;
    if (hasChosen) {
      setPhase("done");
      return;
    }
    void speak(translate(lang, "app.greeting"), lang);
    const timer = setTimeout(() => setPhase("choose"), 1800);
    return () => clearTimeout(timer);
  }, [hydrated, hasChosen, lang]);

  if (!hydrated || phase === "done") return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-5 py-8">
      {phase === "splash" ? (
        <div className="flex animate-in flex-col items-center gap-4 fade-in zoom-in-95 duration-500">
          <span className="flex size-16 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-8" />
          </span>
          <p className="text-xl font-semibold text-foreground">{t("app.name")}</p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Volume2 className="size-4 animate-pulse motion-reduce:animate-none" />
            {translate(lang, "app.greeting")}
          </p>
        </div>
      ) : (
        <div className="flex w-full max-w-3xl animate-in flex-col fade-in slide-in-from-bottom-2 duration-300">
          <h1 className="text-center text-2xl font-semibold text-foreground">{t("lang.choose")}</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">{t("lang.chooseHint")}</p>
          <div className="mt-6 grid max-h-[55vh] grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3">
            {languages.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setLang(l.code);
                  void speak(translate(l.code, "app.greeting"), l.code);
                }}
                className={cn(
                  "flex min-h-[68px] flex-col items-start justify-center rounded-lg border px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  l.code === lang ? "border-primary bg-primary/10" : "border-border bg-card",
                )}
              >
                <span className="text-base font-semibold text-foreground">{l.native}</span>
                <span className="text-[11px] text-muted-foreground">{l.english}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              markChosen();
              setPhase("done");
            }}
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform hover:bg-primary/90 active:scale-[0.98]"
          >
            {t("lang.continue")}
          </button>
        </div>
      )}
    </div>
  );
}
