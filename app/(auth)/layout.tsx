import type { ReactNode } from "react";

/**
 * The shell both auth screens sit in: a 56/44 split — form on white on the
 * left, a quiet sunken panel on the right. The two surfaces are separated by a
 * single hairline; there is no card and no shadow anywhere on this route.
 *
 * Next 16 note: a layout only ever receives `children`, so it cannot be given
 * per-screen props. Everything the two screens share — the proportions, the
 * wordmark, the padding — therefore lives here, while the right-hand panel
 * (whose copy differs per screen) is rendered by each page and anchored into
 * the reserved 44% with `absolute`. `relative` on the root is what makes that
 * anchor work.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh bg-base">
      <main className="flex w-full flex-col justify-between bg-surface px-12 py-12 lg:w-[56%]">
        <Wordmark />
        {children}
      </main>
    </div>
  );
}

/** 28px ink tile plus the product name. Purely a mark, so it is not a link. */
function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-7 items-center justify-center rounded-pill bg-ink text-sm font-semibold text-white">
        P
      </span>
      <span className="text-[17px] font-semibold text-ink">Projectory</span>
    </div>
  );
}
