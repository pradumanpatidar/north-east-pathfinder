import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useSpeechInput } from "@/lib/voice";
import { cn } from "@/lib/utils";

/** Large dictation button for any text input, in the selected language. */
export function MicButton({
  onText,
  className,
  size = "md",
}: {
  onText: (text: string) => void;
  className?: string;
  size?: "md" | "lg";
}) {
  const { lang, t } = useI18n();
  const { listening, start, stop, supported } = useSpeechInput(lang, onText);

  return (
    <button
      type="button"
      data-voice-skip
      aria-label={listening ? t("voice.listening") : t("voice.listen")}
      title={listening ? t("voice.listening") : t("voice.listen")}
      onClick={() => {
        if (!supported) {
          toast.error(t("voice.unsupported"));
          return;
        }
        if (listening) stop();
        else start();
      }}
      className={cn(
        "relative inline-flex items-center justify-center rounded-md border border-border text-foreground transition-transform hover:bg-muted active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        size === "lg" ? "size-12 min-h-12" : "size-11 min-h-11",
        listening && "border-destructive/50 bg-destructive/10 text-destructive",
        className,
      )}
    >
      {listening ? (
        <>
          <span className="absolute inset-0 animate-ping rounded-md bg-destructive/20 motion-reduce:animate-none" />
          <MicOff className="relative size-5" />
        </>
      ) : (
        <Mic className="size-5" />
      )}
    </button>
  );
}
