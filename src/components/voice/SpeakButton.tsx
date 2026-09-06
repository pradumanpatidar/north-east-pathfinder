import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { collectReadableText, speak, stopSpeaking, ttsSupported } from "@/lib/voice";
import { cn } from "@/lib/utils";

/**
 * Reads the visible main content aloud in the selected language.
 * Elements marked data-voice-skip are excluded.
 */
export function SpeakButton({ className }: { className?: string }) {
  const { lang, t } = useI18n();
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => stopSpeaking(), []);

  const toggle = async () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const main = document.querySelector("main");
    const text = collectReadableText(main as HTMLElement | null);
    if (!text) return;
    setSpeaking(true);
    await speak(text, lang);
    setSpeaking(false);
  };

  if (!ttsSupported()) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      data-voice-skip
      aria-label={speaking ? t("voice.stop") : t("voice.read")}
      title={speaking ? t("voice.stop") : t("voice.read")}
      className={cn(
        "inline-flex size-9 min-h-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        speaking && "border-primary/50 bg-primary/10 text-primary",
        className,
      )}
    >
      {speaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </button>
  );
}
