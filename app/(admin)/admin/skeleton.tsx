/**
 * Shared skeleton pieces.
 *
 * `bg-sunken` was used for every placeholder until recently, and on `bg-base`
 * that is a contrast ratio of 1.07:1 - the loading state was effectively
 * invisible, so the page appeared to be blank rather than loading. These use
 * `bg-skeleton`, which is one step further from the canvas in both themes.
 */

/** A row of heading-shaped blocks: title plus subtitle. */
export function SkeletonHeading() {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-7 w-36 animate-pulse rounded-input bg-skeleton" />
      <div className="h-3.5 w-72 animate-pulse rounded-pill bg-skeleton" />
    </div>
  );
}

/** A toolbar: the filter pill row plus a search field. */
export function SkeletonToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1.5">
        {[44, 62, 66, 64].map((w, i) => (
          <div key={i} className="h-8 animate-pulse rounded-pill bg-skeleton" style={{ width: w }} />
        ))}
      </div>
      <div className="ml-auto h-8 w-full animate-pulse rounded-input bg-skeleton sm:w-60" />
    </div>
  );
}

/** A table header band plus `rows` body rows of the given shape. */
export function SkeletonTable({
  rows = 5,
  avatar = false,
}: {
  rows?: number;
  avatar?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-raised">
      <div className="h-[41px] border-b border-hairline bg-sunken" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-hairline px-4 py-3 last:border-b-0">
          {avatar ? (
            <div className="size-7 shrink-0 animate-pulse rounded-pill bg-skeleton" />
          ) : (
            <div className="size-2 shrink-0 animate-pulse rounded-pill bg-skeleton" />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="h-3.5 w-1/2 animate-pulse rounded-pill bg-skeleton" />
            <div className="h-3 w-1/3 animate-pulse rounded-pill bg-skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}
