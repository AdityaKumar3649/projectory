/**
 * Skeleton that mirrors the real admin overview: a heading, five stat tiles and
 * two panels, drawn at the same size as the real thing so nothing shifts when
 * the data lands. A generic spinner would leave the whole page to shift, which
 * on a moderation screen means the approve button can move under the pointer
 * between click and render.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading admin data</span>

      <div className="flex flex-col gap-2">
        <div className="h-7 w-36 animate-pulse rounded-input bg-sunken" />
        <div className="h-3.5 w-72 animate-pulse rounded-pill bg-sunken" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2.5 rounded-card border border-hairline bg-surface p-4"
          >
            <div className="h-2.5 w-14 animate-pulse rounded-pill bg-sunken" />
            <div className="h-6 w-8 animate-pulse rounded-input bg-sunken" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-card border border-hairline bg-surface">
          <div className="h-[46px] border-b border-hairline bg-sunken" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b border-hairline px-4 py-3">
              <div className="size-2 shrink-0 animate-pulse rounded-pill bg-sunken" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="h-3.5 w-1/2 animate-pulse rounded-pill bg-sunken" />
                <div className="h-3 w-1/3 animate-pulse rounded-pill bg-sunken" />
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-card border border-hairline bg-surface">
          <div className="h-[46px] border-b border-hairline bg-sunken" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b border-hairline px-4 py-2.5">
              <div className="size-7 shrink-0 animate-pulse rounded-pill bg-sunken" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="h-3.5 w-2/3 animate-pulse rounded-pill bg-sunken" />
                <div className="h-3 w-1/2 animate-pulse rounded-pill bg-sunken" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}