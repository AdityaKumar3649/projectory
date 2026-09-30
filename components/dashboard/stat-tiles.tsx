import type { ProjectCounts } from "@/lib/contracts/types";

/**
 * The four counters above the list.
 *
 * Purely presentational: the numbers come from `countByStatus()` on the server
 * and nothing here is interactive. The dot beside each label is the only place
 * outside `StatusBadge` where a status colour appears, and it always means the
 * same thing.
 */

type Tile = {
  key: keyof ProjectCounts;
  label: string;
  dot: string;
};

const TILES: Tile[] = [
  { key: "all", label: "Total", dot: "bg-ink-3" },
  { key: "pending", label: "Pending", dot: "bg-pending-fg" },
  { key: "approved", label: "Approved", dot: "bg-approved-fg" },
  { key: "rejected", label: "Rejected", dot: "bg-rejected-fg" },
];

export function StatTiles({ counts }: { counts: ProjectCounts }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {TILES.map(({ key, label, dot }) => (
        <div
          key={key}
          className="flex flex-col gap-1.5 rounded-card border border-hairline bg-surface p-4"
        >
          <span className="text-[26px] leading-none font-semibold tracking-[-0.02em] tabular-nums">
            {counts[key]}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-ink-3">
            <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
