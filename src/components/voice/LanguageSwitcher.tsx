import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { speak, stopSpeaking } from "@/lib/voice";
import { translate } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Header language control. Switching only changes the language state —
 * no navigation, no reload, so in-progress form data is preserved.
 */
export function LanguageSwitcher() {
  const { lang, meta, languages, setLang, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-voice-skip
        aria-label={t("lang.switch")}
        className="inline-flex h-9 min-h-9 items-center gap-1.5 rounded-md border border-border px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-2.5"
      >
        <Languages className="size-4" />
        <span className="hidden sm:inline">{meta.native}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70vh] w-60 overflow-y-auto">
        <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("lang.switch")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languages.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => {
              stopSpeaking();
              setLang(l.code);
              void speak(translate(l.code, "app.greeting"), l.code);
            }}
            className="flex min-h-11 items-center justify-between gap-2 text-sm"
          >
            <span className="flex flex-col">
              <span className="font-medium">{l.native}</span>
              <span className="text-[11px] text-muted-foreground">{l.english}</span>
            </span>
            {l.code === lang ? <span className="text-xs text-primary">●</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
