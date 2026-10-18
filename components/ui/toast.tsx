"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Info, Undo2, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error" | "neutral";

export type ToastSpec = {
  message: string;
  tone?: ToastTone;
  /** Label for the inline action, e.g. "Undo". Omit for a plain message. */
  actionLabel?: string;
  onAction?: () => void;
};

const TONE_ICON = {
  success: CircleCheck,
  error: CircleAlert,
  neutral: Info,
} as const;

/** How long an action stays available. Long enough to notice, short enough to feel temporary. */
const ACTION_WINDOW_MS = 8000;
const PLAIN_WINDOW_MS = 3200;

/**
 * A single toast, mounted once and driven by a queue.
 *
 * Extracted because the admin projects and users screens each carried their own
 * copy of this state machine - roughly thirty duplicated lines, and the two had
 * already drifted.
 *
 * Two decisions worth stating:
 *
 * The surface is neutral (`bg-surface`), never a full status tint. A status
 * fill on a floating object reads as a page section rather than a notification,
 * and it spends the loud-colour budget that `globals.css` reserves for status
 * meaning. A coloured icon carries the same information without the shout.
 *
 * On a phone it is a bottom sheet, not a corner card. Bottom-right is the
 * hardest corner to reach one-handed, and it is where the sticky bulk-action bar
 * lives, so a toast there would be covered at exactly the moment it matters.
 */
export function useToast() {
  const [toast, setToast] = useState<(ToastSpec & { key: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextKey = useRef(0);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setToast(null);
  }, []);

  const show = useCallback((spec: ToastSpec) => {
    // One timer, cleared before each new one. With a bare setTimeout per toast,
    // a second action starts a second timer and the older one then clears the
    // newer message early.
    if (timer.current) clearTimeout(timer.current);
    nextKey.current += 1;
    setToast({ ...spec, key: nextKey.current });
    timer.current = setTimeout(
      () => setToast(null),
      spec.actionLabel ? ACTION_WINDOW_MS : PLAIN_WINDOW_MS,
    );
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { toast, show, clear };
}

export function Toast({
  toast,
  onDismiss,
}: {
  toast: (ToastSpec & { key: number }) | null;
  onDismiss: () => void;
}) {
  if (!toast) return null;
  const Icon = TONE_ICON[toast.tone ?? "neutral"];

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4
                 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:justify-end sm:pb-0 sm:pr-0"
    >
      <div
        // Keyed so a second toast restarts the entry animation rather than the
        // first one morphing in place.
        key={toast.key}
        className="pointer-events-auto flex w-full max-w-md animate-[toast-in_160ms_ease-out] items-center gap-3
                   rounded-card border border-hairline bg-surface px-3.5 py-2.5 shadow-overlay"
      >
        <Icon
          size={16}
          aria-hidden
          className={cn(
            "shrink-0",
            toast.tone === "success" && "text-approved-fg",
            toast.tone === "error" && "text-rejected-fg",
            toast.tone === "neutral" && "text-ink-3",
          )}
        />
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink">{toast.message}</p>

        {toast.actionLabel && toast.onAction ? (
          <button
            type="button"
            onClick={() => {
              toast.onAction?.();
              onDismiss();
            }}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-input px-2 text-[13px] font-semibold
                       text-accent transition-colors hover:bg-accent-soft"
          >
            <Undo2 size={13} aria-hidden />
            {toast.actionLabel}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-input text-ink-3 transition-colors hover:bg-hover hover:text-ink"
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
