"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for the admin screens.
 *
 * Next 16 hands the boundary a `retry` callback rather than `reset`, which is
 * the difference between "try again" re-running the failed request and
 * "try again" remounting the subtree. Using the wrong one leaves the user
 * clicking a button that cannot possibly help.
 */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-card border border-hairline bg-surface p-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[17px] font-semibold text-ink">This admin screen failed to load</h2>
        <p className="max-w-prose text-[13px] leading-relaxed text-ink-2">
          The data could not be read. This is usually the store being briefly
          unavailable rather than anything wrong with your account.
        </p>
      </div>

      {error.digest ? (
        <p className="font-mono text-[11px] text-ink-3">Reference: {error.digest}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={retry}>
          Try again
        </Button>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-pill border border-line px-4 text-[13px] font-medium text-ink-2 transition-colors hover:bg-sunken"
        >
          Back to my projects
        </Link>
      </div>
    </div>
  );
}