/**
 * Voice layer: Web Speech API text-to-speech and speech-to-text.
 * Languages without a browser voice fall back to a transliterated line spoken
 * with the closest available voice (see LanguageMeta.speech) — never silence.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { LANGUAGES } from "@/locales";

export function speechTagFor(lang: string): string {
  return LANGUAGES.find((l) => l.code === lang)?.speech ?? "en-IN";
}

export function ttsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(tag: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.replace("_", "-").toLowerCase() === tag.toLowerCase()) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(tag.split("-")[0]!.toLowerCase())) ??
    voices.find((v) => v.lang.toLowerCase().startsWith("en"))
  );
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

/** Speak text; resolves when playback finishes (or immediately if unsupported). */
export function speak(text: string, lang: string): Promise<void> {
  if (!ttsSupported() || !text.trim()) return Promise.resolve();
  const tag = speechTagFor(lang);
  return new Promise((resolve) => {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = tag;
      const v = pickVoice(tag);
      if (v) u.voice = v;
      u.rate = 0.95;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    } catch {
      resolve();
    }
  });
}

/** Collect readable text from a container for the "read this page" control. */
export function collectReadableText(root: HTMLElement | null): string {
  if (!root) return "";
  const parts: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const el = node.parentElement;
      if (!el) return NodeFilter.FILTER_REJECT;
      if (el.closest("[data-voice-skip]")) return NodeFilter.FILTER_REJECT;
      if (el.getAttribute("aria-hidden") === "true") return NodeFilter.FILTER_REJECT;
      const text = node.textContent?.trim() ?? "";
      if (!text) return NodeFilter.FILTER_REJECT;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n = walker.nextNode();
  while (n && parts.length < 220) {
    const text = n.textContent!.trim();
    if (text && parts[parts.length - 1] !== text) parts.push(text);
    n = walker.nextNode();
  }
  return parts.join(". ");
}

type RecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, RecognitionCtor | undefined>;
  return w["SpeechRecognition"] ?? w["webkitSpeechRecognition"];
}

export function sttSupported() {
  return !!recognitionCtor();
}

/** Microphone dictation in the currently selected language. */
export function useSpeechInput(lang: string, onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const ref = useRef<SpeechRecognitionLike | null>(null);
  const cb = useRef(onResult);
  cb.current = onResult;

  useEffect(() => () => ref.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return false;
    try {
      const rec = new Ctor();
      ref.current = rec;
      rec.lang = speechTagFor(lang);
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (e) => {
        const text = e.results?.[0]?.[0]?.transcript ?? "";
        if (text) cb.current(text);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      rec.start();
      setListening(true);
      return true;
    } catch {
      setListening(false);
      return false;
    }
  }, [lang]);

  const stop = useCallback(() => {
    ref.current?.stop();
    setListening(false);
  }, []);

  return { listening, start, stop, supported: sttSupported() };
}
