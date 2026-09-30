"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Client Component by necessity: it is the error boundary for the segment, and
 * it needs `retry` to re-run the failed Server Component render.
 *
 * `retry` (rather than the older `reset`) is the Next 16.3+ API. The full
 * error is logged, not rendered - the member gets the reference, the console
 * gets the stack.
 */
export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] failed to load projects:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-hairline bg-surface px-8 py-14 text-center">
      <span className="inline-flex size-11 items-center justify-center rounded-pill bg-rejected text-rejected-fg">
        <TriangleAlert aria-hidden size={20} />
      </span>

      <h2 className="text-[17px] font-semibold">Something went wrong loading your projects.</h2>

      <p className="max-w-[400px] text-[13px] leading-relaxed text-ink-3">
        The list could not be rendered. This is usually temporary - the details are in the server log
        if it keeps happening.
      </p>

      {error.digest ? (
        <p className="font-mono text-xs text-ink-3">reference {error.digest}</p>
      ) : null}

      <div className="mt-1">
        <Button onClick={() => retry()}>
          <RotateCcw aria-hidden size={15} />
          Try again
        </Button>
      </div>
    </div>
  );
}
