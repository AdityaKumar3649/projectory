import type { Metadata } from "next";
import Link from "next/link";

import { adminGetAllData } from "@/app/actions/admin";
import { Chip } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/utils";

/** Matches the tone of each stat tile to the status colours used elsewhere. */
const TILE_TONE: Record<string, string> = {
  default: "bg-accent-soft text-accent",
  pending: "bg-pending text-pending-fg",
  approved: "bg-approved text-approved-fg",
  rejected: "bg-rejected text-rejected-fg",
};

/** The one empty state shape used across the admin screens. */
function Nothing({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-[13px] font-medium text-ink-2">{title}</p>
      <p className="mt-1 text-[12px] text-ink-3">{body}</p>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Admin",
  description: "Moderation queue and platform health.",
};

/**
 * The overview answers two questions a moderator opens the panel with: what is
 * waiting for a decision, and is anything broken.
 *
 * Dates render through `relativeTime`, never `toLocaleDateString`. Formatting a
 * date on the server produces text from the server's locale and timezone, and
 * the browser then computes a different string from the same value, which React
 * reports as a hydration mismatch. One helper, one behaviour, both sides agree.
 */
export default async function AdminOverviewPage() {
  const { accounts, projects, activeSessions } = await adminGetAllData();

  const byStatus = (status: string) => projects.filter((p) => p.status === status);
  const queue = byStatus("pending")
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const tiles = [
    { label: "Projects", value: projects.length, sub: "all", tone: "default" },
    { label: "Pending", value: byStatus("pending").length, sub: "queued", tone: "pending" },
    { label: "Approved", value: byStatus("approved").length, sub: "live", tone: "approved" },
    { label: "Rejected", value: byStatus("rejected").length, sub: "hidden", tone: "rejected" },
    { label: "Members", value: accounts.length, sub: "total", tone: "default" },
  ] as const;
  void byStatus;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/*
          `min-w-0` on the title block. A flex item's default `min-width` is
          `auto`, which means it refuses to shrink below its own text. Without
          this the heading and subtitle hold their intrinsic width, the row
          overflows the viewport, and the whole document scrolls sideways at
          320px - measured at 65px before it was added.
        */}
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">Overview</h1>
          <p className="text-[13px] text-ink-3">
            Moderation queue and platform health at a glance.
          </p>
        </div>
        <Link
          href="/admin/projects"
          className="inline-flex h-9 items-center rounded-pill bg-accent px-4 text-[13px] font-semibold text-on-ink transition-colors hover:bg-accent-hover"
        >
          Review queue
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <li key={t.label} className="flex min-w-0 flex-col gap-1.5 rounded-card border border-hairline bg-surface p-4">
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">
              {t.label}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-[26px] font-semibold tabular-nums text-ink">{t.value}</span>
              <Chip className={cn("h-[18px] px-2 text-[10px] font-semibold", TILE_TONE[t.tone])}>
                {t.sub}
              </Chip>
            </span>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex flex-col gap-2 overflow-hidden rounded-card border border-hairline bg-surface">
          <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
            <h2 className="text-[13px] font-semibold text-ink">Awaiting review</h2>
            {/* `inline-flex min-h-6 items-center` rather than a bare text link:
                a bare anchor is ~18px tall here, under the 24px minimum, and
                these sit in the corner a thumb aims for. */}
            <Link
              href="/admin/projects"
              className="inline-flex min-h-6 items-center text-[12px] font-medium text-accent hover:underline"
            >
              View all
            </Link>
          </header>
          {queue.length === 0 ? (
            <Nothing
              title="Nothing waiting"
              body="Every project has had a decision. New submissions will appear here."
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {queue.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-dot-pending" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{p.title}</span>
                    <span className="block truncate text-[12px] text-ink-3">{p.ownerName}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-3">
                    {relativeTime(p.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2 overflow-hidden rounded-card border border-hairline bg-surface">
          <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
            <h2 className="text-[13px] font-semibold text-ink">Recent members</h2>
            <Link
              href="/admin/users"
              className="inline-flex min-h-6 items-center text-[12px] font-medium text-accent hover:underline"
            >
              Manage
            </Link>
          </header>
          {accounts.length === 0 ? (
            <Nothing title="No members yet" body="Accounts will appear here as people sign up." />
          ) : (
            <ul className="divide-y divide-hairline">
              {accounts.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span
                    aria-hidden
                    className="grid size-7 shrink-0 place-items-center rounded-pill bg-accent-soft text-[12px] font-semibold text-accent"
                  >
                    {a.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{a.name}</span>
                    <span className="block truncate text-[12px] text-ink-3">{a.email}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-3">{relativeTime(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="text-[12px] text-ink-3">
        {activeSessions} active session{activeSessions === 1 ? "" : "s"} · storage
        details on the Database tab.
      </p>
    </div>
  );
}