"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Theme control: system / light / dark.
 *
 * Native dark mode, not a filter. The stylesheet already responds to
 * `prefers-color-scheme`, so "system" is simply the absence of an override.
 * Choosing light or dark writes `data-theme` on <html>, which wins over the
 * media query, and persists the choice.
 *
 * State is read through `useSyncExternalStore` rather than `useState` + effect.
 * localStorage is an external store, and reading it during render is exactly
 * what that hook is for: the effect version had to setState inside an effect,
 * which is the pattern React 19's lint rules flag, and it also produced a second
 * render pass. The server snapshot is always "system" so the first client render
 * matches the server HTML; the real value arrives on the same commit that
 * hydration completes, before paint.
 *
 * Rendered as a single cycling button rather than a three-way menu: one control,
 * one tab stop, no popover state. Order is system -> light -> dark -> system.
 */

export type ThemeChoice = "system" | "light" | "dark";

const STORAGE_KEY = "pj-theme";
const ORDER: ThemeChoice[] = ["system", "light", "dark"];

/** Notified whenever the choice changes, so subscribed components re-render. */
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readChoice(): ThemeChoice {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // Private browsing can throw on localStorage. System default is fine.
  }
  return "system";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // The OS preference can change while the tab is open, which matters because
  // "system" is a live state rather than a one-time read.
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
  };
}

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

function setChoice(choice: ThemeChoice) {
  apply(choice);
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Non-fatal: the theme still applies for this page view.
  }
  emit();
}

export function ThemeToggle({ className }: { className?: string }) {
  const choice = useSyncExternalStore(subscribe, readChoice, () => "system" as const);

  const cycle = useCallback(() => {
    setChoice(ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length]);
  }, [choice]);

  const Icon = choice === "light" ? Sun : choice === "dark" ? Moon : Monitor;
  const label =
    choice === "system"
      ? "Theme: following your system. Switch to light."
      : choice === "light"
        ? "Theme: light. Switch to dark."
        : "Theme: dark. Switch to your system setting.";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-pill border border-hairline",
        "text-ink-2 transition-colors hover:bg-sunken hover:text-ink",
        className,
      )}
    >
      <Icon aria-hidden size={15} />
    </button>
  );
}

/**
 * Applies the stored theme before first paint.
 *
 * Without this the page renders light, then flips to dark once React hydrates —
 * a visible white flash for every dark-mode visitor. This runs synchronously in
 * <head>, before any body content exists, which is the only place it can work.
 */
export function ThemeScript() {
  const code = `(function(){try{var s=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(s==="light"||s==="dark"){document.documentElement.setAttribute("data-theme",s);}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
