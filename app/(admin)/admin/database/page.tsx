import type { Metadata } from "next";

import { adminGetAllData } from "@/app/actions/admin";
import { Panel } from "@/components/ui/primitives";
import { storageBackend, storageDocument } from "@/lib/data/backend-info";

export const metadata: Metadata = {
  title: "Storage",
  description: "How Projectory is persisted, and where.",
};

/**
 * The Database tab answers the question everyone asks first about a demo with a
 * JSON store: "is this actually connected to anything, or does it disappear?"
 *
 * It reports the live backend rather than describing the intended one. The two
 * used to differ on a serverless host with no store configured, which is exactly
 * when the answer matters most.
 */
export default async function AdminDatabasePage() {
  const { accounts, projects, activeSessions } = await adminGetAllData();
  const backend = storageBackend();
  const document = storageDocument(projects.length + accounts.length);

  const summary = [
    { label: "Connected", value: "Yes", sub: `via ${backend.label}`, live: true },
    { label: "Projects", value: String(projects.length), sub: `across ${accounts.length} member${accounts.length === 1 ? "" : "s"}`, live: false },
    { label: "Active sessions", value: String(activeSessions), sub: "expiring on a timer", live: false },
  ];

  const rows: [string, string, string][] = [
    ["Backend", backend.label, backend.detail],
    ["Durability", backend.durable ? "Durable" : "Volatile", backend.durableNote],
    ["Local fallback", ".data/db.json", "Used on any machine with a writable disk"],
    ["Document", document.name, `${document.size} - one JSON document holds the whole database`],
    ["Write safety", "Queued + atomic", "No overlapping saves, no half-written files"],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">Storage</h1>
          <p className="text-[13px] text-ink-3">How Projectory is persisted, and where.</p>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-3">
        {summary.map((s) => (
          <li key={s.label} className="flex min-w-0 flex-col gap-1.5 rounded-card border border-hairline bg-surface p-4">
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">
              {s.label}
            </span>
            <span className="text-[22px] font-semibold tabular-nums text-ink">{s.value}</span>
            <span className="text-[11px] text-ink-3">
              {s.live ? (
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-1.5 rounded-full bg-dot-approved" />
                  {s.sub}
                </span>
              ) : (
                s.sub
              )}
            </span>
          </li>
        ))}
      </ul>

      {/*
        Scrolls its own content rather than the document. This table has three
        columns of prose, which measured 257px of document overflow at 320px
        before the wrapper was added.
      */}
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <caption className="sr-only">Storage configuration and current values</caption>
          <thead>
            <tr className="border-b border-hairline bg-sunken">
              <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">Setting</th>
              <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">Value</th>
              <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.map(([k, v, d]) => (
              <tr key={k}>
                <th scope="row" className="px-4 py-3 text-left text-[12px] font-medium text-ink-3">{k}</th>
                <td className="px-4 py-3 text-[13px] text-ink">{v}</td>
                <td className="px-4 py-3 text-[12px] text-ink-3">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <p className="rounded-card bg-accent-soft px-4 py-3 text-[12px] text-accent">
        Swapping this for Postgres means replacing the files in{" "}
        <code className="font-mono">lib/data</code> only. Nothing in{" "}
        <code className="font-mono">app/</code> or{" "}
        <code className="font-mono">components/</code> reads the store directly.
      </p>
    </div>
  );
}