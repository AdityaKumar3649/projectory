import { SkeletonHeading } from "../skeleton";

/** Mirrors the storage screen: heading, then three summary tiles. */
export default function AdminDatabaseLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading storage details</span>
      <SkeletonHeading />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2.5 rounded-card border border-hairline bg-surface p-4 shadow-raised">
            <div className="h-2.5 w-16 animate-pulse rounded-pill bg-skeleton" />
            <div className="h-6 w-12 animate-pulse rounded-input bg-skeleton" />
            <div className="h-2.5 w-20 animate-pulse rounded-pill bg-skeleton" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-raised">
        <div className="h-[41px] border-b border-hairline bg-sunken" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b border-hairline px-4 py-3.5 last:border-b-0">
            <div className="h-3.5 w-28 shrink-0 animate-pulse rounded-pill bg-skeleton" />
            <div className="h-3.5 flex-1 animate-pulse rounded-pill bg-skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
