import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, HeartPulse, Inbox } from "lucide-react";

import { adminGetAllData } from "@/app/actions/admin";
import { storageBackend } from "@/lib/data/backend-info";
import { cn, relativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin",
  description: "Moderation queue and platform health.",
};

const DAY = 86_400_000;

/** One empty state shape, reused. */
function Nothing({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-[13px] font-medium text-ink-2">{title}</p>
      <p className="mx-auto mt-1 max-w-[34ch] text-[12px] leading-relaxed text-ink-3">{body}</p>
    </div>
  );
}

/**
 * The overview answers two questions a moderator opens the panel with: what is
 * waiting for a decision, and how long has it been waiting.
 *
 * The previous version led with five equal tiles, one of which ("Projects") was
 * the arithmetic sum of the next three, and another ("Members") had nothing to
 * do with moderation. Status colour was spent on `Chip`s whose labels - "live",
 * "hidden", "total" - did not mean a status at all, which spent the loud-colour
 * budget `globals.css` reserves for status meaning and told the reader nothing.
 *
 * Dates render through `relativeTime`, never `toLocaleDateString`. Formatting a
 * date on the server produces text from the server's locale and timezone, and
 * the browser computes a different string from the same value, which React
 * reports as a hydration mismatch. One helper, one behaviour, both sides agree.
 */
export default async function AdminOverviewPage() {
  const { accounts, projects, activeSessions } = await adminGetAllData();
  const backend = storageBackend();

  const counts = {
    pending: projects.filter((p) => p.status === "pending").length,
    approved: projects.filter((p) => p.status === "approved").length,
    rejected: projects.filter((p) => p.status === "rejected").length,
  };

  // Oldest first. The queue is a queue, not a feed.
  const queue = projects
    .filter((p) => p.status === "pending")
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const oldest = queue[0];

  /*
   * `Date.now()` is an impure render call, and the lint rule is right about
   * Client Components: it re-renders, so a timestamp read during render can
   * disagree with itself between passes. This is an async Server Component -
   * it runs exactly once per request and produces a finished HTML string, so
   * there is no second pass to disagree with. The value is read once here and
   * reused, rather than being called inline in each of the five expressions
   * below, so even the arithmetic is internally consistent.
   */
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const oldestMs = oldest ? now - new Date(oldest.createdAt).getTime() : 0;
  const oldestDays = Math.max(0, Math.floor(oldestMs / DAY));

  // A moderator's actual SLA question, bucketed so the number is actionable
  // rather than just a figure.
  const buckets = [
    { label: "Over a week", test: (d: number) => d >= 7 },
    { label: "3 to 7 days", test: (d: number) => d >= 3 && d < 7 },
    { label: "1 to 3 days", test: (d: number) => d >= 1 && d < 3 },
    { label: "Under a day", test: (d: number) => d < 1 },
  ].map((b) => ({
    label: b.label,
    count: queue.filter((p) => b.test((now - new Date(p.createdAt).getTime()) / DAY)).length,
  }));

  const total = projects.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/*
          `min-w-0` on the title block. A flex item's default `min-width` is
          `auto`, which means it refuses to shrink below its own text - the row
          overflows the viewport and the document scrolls sideways at 320px.
        */}
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">Overview</h1>
          <p className="text-[13px] text-ink-3">
            {queue.length === 0
              ? "The queue is clear. Nothing is waiting for a decision."
              : `${queue.length} waiting. Oldest has been in the queue ${oldestDays === 0 ? "less than a day" : `${oldestDays} ${oldestDays === 1 ? "day" : "days"}`}.`}
          </p>
        </div>
        {queue.length > 0 ? (
          <Link
            href="/admin/projects"
            className="inline-flex h-10 items-center gap-2 rounded-pill bg-accent px-4 text-[13px] font-semibold text-on-ink transition-colors hover:bg-accent-hover"
          >
            <Inbox size={15} aria-hidden />
            Review queue
          </Link>
        ) : null}
      </div>

      {/*
        The one number that matters, given the room to be the largest thing on
        the screen. When there is nothing pending this whole band disappears
        rather than showing a row of zeroes - "0 waiting" is not information.
      */}
      {queue.length > 0 ? (
        <section className="flex flex-col gap-5 rounded-card border border-hairline bg-surface p-5 shadow-raised sm:flex-row sm:items-center sm:gap-8">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              Needs a decision
            </span>
            <span className="text-[44px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-ink">
              {queue.length}
            </span>
            <span className="text-[12px] text-ink-3">
              oldest waiting {relativeTime(oldest!.createdAt).replace(" ago", "")}
            </span>
          </div>

          <div className="hidden h-14 w-px shrink-0 bg-hairline sm:block" />

          <dl className="flex min-w-0 flex-1 flex-wrap gap-x-8 gap-y-3">
            {buckets.map((b) => (
              <div key={b.label} className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-[11px] font-medium text-ink-3">{b.label}</dt>
                <dd
                  className={cn(
                    "text-[20px] font-semibold tabular-nums",
                    // The one bucket that means "you are late" gets the only
                    // loud colour on the page.
                    b.label === "Over a week" && b.count > 0 ? "text-rejected-fg" : "text-ink",
                  )}
                >
                  {b.count}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/*
        Status distribution as one proportional bar rather than three more
        tiles. Widths are inline styles computed from the counts - no chart
        library, and the whole thing collapses to one labelled image for a
        screen reader.
      */}
      <section className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-5 shadow-raised">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-ink">Status breakdown</h2>
          <span className="text-[12px] text-ink-3">
            {total} {total === 1 ? "project" : "projects"}
          </span>
        </div>

        {total > 0 ? (
          <>
            <div
              role="img"
              aria-label={`${total} projects: ${counts.approved} approved, ${counts.pending} pending, ${counts.rejected} rejected`}
              className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-pill"
            >
              {counts.approved > 0 ? (
                <span
                  className="h-full rounded-l-pill bg-dot-approved"
                  style={{ width: `${(counts.approved / total) * 100}%` }}
                />
              ) : null}
              {counts.pending > 0 ? (
                <span className="h-full bg-dot-pending" style={{ width: `${(counts.pending / total) * 100}%` }} />
              ) : null}
              {counts.rejected > 0 ? (
                <span
                  className="h-full rounded-r-pill bg-dot-rejected"
                  style={{ width: `${(counts.rejected / total) * 100}%` }}
                />
              ) : null}
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
              {[
                { label: "approved", count: counts.approved, dot: "bg-dot-approved" },
                { label: "pending", count: counts.pending, dot: "bg-dot-pending" },
                { label: "rejected", count: counts.rejected, dot: "bg-dot-rejected" },
              ].map((s) => (
                <li key={s.label} className="flex items-center gap-2 text-[12px] text-ink-2">
                  <span aria-hidden className={cn("size-2 rounded-full", s.dot)} />
                  <span className="tabular-nums">{s.count}</span>
                  <span className="text-ink-3">{s.label}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-[12px] text-ink-3">No projects have been submitted yet.</p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex flex-col overflow-hidden rounded-card border border-hairline bg-surface shadow-raised">
          <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
            <h2 className="text-[13px] font-semibold text-ink">Oldest in the queue</h2>
            {queue.length > 0 ? (
              <Link
                href="/admin/projects"
                className="inline-flex min-h-8 items-center gap-1 text-[12px] font-medium text-accent hover:underline"
              >
                Review all
                <ArrowRight size={13} aria-hidden />
              </Link>
            ) : null}
          </header>

          {queue.length === 0 ? (
            <Nothing
              title="Nothing waiting"
              body="Every project has had a decision. New submissions appear here the moment they are sent."
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {queue.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover">
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-dot-pending" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{p.title}</span>
                    <span className="block truncate text-[12px] text-ink-3">{p.ownerName}</span>
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-ink-3">
                    {relativeTime(p.createdAt).replace(" ago", "")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className="flex flex-col overflow-hidden rounded-card border border-hairline bg-surface shadow-raised">
            <header className="flex items-center gap-2 border-b border-hairline px-4 py-3">
              <HeartPulse size={15} aria-hidden className="text-ink-3" />
              <h2 className="text-[13px] font-semibold text-ink">Platform</h2>
            </header>
            <dl className="flex flex-col">
              {[
                { term: "Storage", detail: backend.label },
                { term: "Members", detail: `${accounts.length} registered` },
                { term: "Sessions", detail: `${activeSessions} active` },
                {
                  term: "Last write",
                  detail: relativeTime(
                    projects
                      .map((p) => p.updatedAt)
                      .sort()
                      .at(-1) ?? new Date().toISOString(),
                  ),
                },
              ].map((row) => (
                <div
                  key={row.term}
                  className="flex items-baseline justify-between gap-3 border-b border-hairline px-4 py-2.5 last:border-b-0"
                >
                  <dt className="shrink-0 text-[12px] text-ink-3">{row.term}</dt>
                  <dd className="min-w-0 truncate text-right text-[12px] font-medium text-ink-2">{row.detail}</dd>
                </div>
              ))}
            </dl>
          </section>

          {queue.length === 0 && projects.length > 0 ? (
            <section className="flex items-center gap-3 rounded-card border border-approved bg-approved px-4 py-3.5">
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-pill bg-surface">
                <Check size={16} className="text-approved-fg" />
              </span>
              <p className="min-w-0 text-[12px] leading-relaxed text-approved-fg">
                Every submission has been reviewed. Nothing is waiting on you.
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
