/**
 * Skeleton that mirrors the real dashboard: 4 stat tiles, the toolbar, and two
 * list rows drawn inside the same single-container list, so nothing jumps when
 * the real rows replace it.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your projects</span>

      <div className="flex items-center gap-4">
        <div className="flex flex-1 flex-col gap-2.5">
          <div className="h-7 w-40 animate-pulse rounded-input bg-sunken" />
          <div className="h-3.5 w-52 animate-pulse rounded-pill bg-sunken" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-pill bg-sunken" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2.5 rounded-card border border-hairline bg-surface p-4"
          >
            <div className="h-7 w-10 animate-pulse rounded-input bg-sunken" />
            <div className="h-3 w-16 animate-pulse rounded-pill bg-sunken" />
          </div>
        ))}
      </div>

      <div className="h-[38px] w-[268px] animate-pulse rounded-pill bg-sunken sm:w-[300px]" />

      <div className="overflow-hidden rounded-card border border-hairline bg-surface divide-y divide-hairline">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="h-4 w-1/3 animate-pulse rounded-pill bg-sunken" />
              <div className="h-3.5 w-3/4 animate-pulse rounded-pill bg-sunken" />
              <div className="h-3 w-1/4 animate-pulse rounded-pill bg-sunken" />
            </div>
            <div className="h-6 w-[74px] shrink-0 animate-pulse rounded-pill bg-sunken" />
            <div className="size-8 shrink-0 animate-pulse rounded-pill bg-sunken" />
          </div>
        ))}
      </div>
    </div>
  );
}
