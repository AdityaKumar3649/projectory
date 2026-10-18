import { SkeletonHeading } from "./skeleton";

/**
 * Skeleton for the overview only.
 *
 * This used to be the fallback for every admin route, because Next applies a
 * segment's `loading.tsx` to all of its children - so the projects, users and
 * database screens all painted five stat tiles and two panels while their own
 * layout was still loading. Each route now has its own; this one mirrors the
 * overview it actually belongs to.
 *
 * Placeholders use `bg-skeleton`, not `bg-sunken`. `bg-sunken` on `bg-base` is
 * 1.07:1, so the loading state was indistinguishable from an empty page.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading admin overview</span>

      <SkeletonHeading />

      {/* The hero band, present only when something is pending. */}
      <div className="flex flex-col gap-5 rounded-card border border-hairline bg-surface p-5 shadow-raised sm:flex-row sm:items-center sm:gap-8">
        <div className="flex flex-col gap-2">
          <div className="h-2.5 w-24 animate-pulse rounded-pill bg-skeleton" />
          <div className="h-11 w-12 animate-pulse rounded-input bg-skeleton" />
          <div className="h-3 w-28 animate-pulse rounded-pill bg-skeleton" />
        </div>
        <div className="hidden h-14 w-px shrink-0 bg-hairline sm:block" />
        <div className="flex flex-1 flex-wrap gap-x-8 gap-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="h-2.5 w-16 animate-pulse rounded-pill bg-skeleton" />
              <div className="h-5 w-6 animate-pulse rounded-input bg-skeleton" />
            </div>
          ))}
        </div>
      </div>

      {/* Status breakdown card. */}
      <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-5 shadow-raised">
        <div className="flex items-baseline justify-between gap-3">
          <div className="h-3.5 w-28 animate-pulse rounded-pill bg-skeleton" />
          <div className="h-3 w-16 animate-pulse rounded-pill bg-skeleton" />
        </div>
        <div className="h-2.5 w-full animate-pulse rounded-pill bg-skeleton" />
        <div className="flex gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-3 w-20 animate-pulse rounded-pill bg-skeleton" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-raised">
          <div className="h-[49px] border-b border-hairline bg-sunken" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b border-hairline px-4 py-3 last:border-b-0">
              <div className="size-2 shrink-0 animate-pulse rounded-pill bg-skeleton" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="h-3.5 w-1/2 animate-pulse rounded-pill bg-skeleton" />
                <div className="h-3 w-1/3 animate-pulse rounded-pill bg-skeleton" />
              </div>
              <div className="h-3 w-12 shrink-0 animate-pulse rounded-pill bg-skeleton" />
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-raised">
          <div className="h-[49px] border-b border-hairline bg-sunken" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3 last:border-b-0">
              <div className="h-3 w-16 animate-pulse rounded-pill bg-skeleton" />
              <div className="h-3 w-20 animate-pulse rounded-pill bg-skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
