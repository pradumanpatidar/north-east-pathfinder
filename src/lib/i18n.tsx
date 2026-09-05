import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DICTIONARIES, LANGUAGES, en, type LanguageMeta, type TranslationKey } from "@/locales";

const STORAGE_KEY = "ner-route-ai.language";
const ONBOARD_KEY = "ner-route-ai.language-chosen";

interface I18nValue {
  lang: string;
  meta: LanguageMeta;
  languages: LanguageMeta[];
  /** Translate a key; falls back to English, then to the key itself. */
  t: (key: TranslationKey, fallback?: string) => string;
  /** Translate for an arbitrary language (used by the onboarding grid / voice). */
  tIn: (lang: string, key: TranslationKey) => string;
  setLang: (lang: string) => void;
  hasChosen: boolean;
  markChosen: () => void;
  hydrated: boolean;
}

const I18nContext = createContext<I18nValue | null>(null);

function metaFor(code: string): LanguageMeta {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]!;
}

export function translate(lang: string, key: TranslationKey, fallback?: string): string {
  return DICTIONARIES[lang]?.[key] ?? en[key] ?? fallback ?? String(key);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState("en");
  const [hasChosen, setHasChosen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && DICTIONARIES[stored]) setLangState(stored);
      setHasChosen(localStorage.getItem(ONBOARD_KEY) === "1");
    } catch {
      /* storage unavailable */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: string) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const markChosen = useCallback(() => {
    setHasChosen(true);
    try {
      localStorage.setItem(ONBOARD_KEY, "1");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      meta: metaFor(lang),
      languages: LANGUAGES,
      t: (key, fallback) => translate(lang, key, fallback),
      tIn: (l, key) => translate(l, key),
      setLang,
      hasChosen,
      markChosen,
      hydrated,
    }),
    [lang, setLang, hasChosen, markChosen, hydrated],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
