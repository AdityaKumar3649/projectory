import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getCurrentUser } from "@/lib/auth";

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
 *
 * A visitor who already has a working session has no business on /sign-in, so
 * they are sent to the dashboard. This deliberately lives here rather than in
 * `proxy.ts`: proxy can only see that a cookie exists, not whether the session
 * behind it is still valid, so bouncing on cookie presence alone deadlocks with
 * `requireUser()` into an infinite redirect loop for anyone holding a stale
 * cookie. Resolving the session properly is what makes the two agree.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-dvh bg-base">
      <main
        id="main"
        tabIndex={-1}
        className="flex w-full flex-col justify-between bg-surface px-6 py-8 focus:outline-none sm:px-12 sm:py-12 lg:w-[56%]"
      >
        <div className="flex items-center justify-between gap-4">
          <Wordmark />
          {/* Present here too: someone who lands on /sign-in in dark mode should
              not have to sign in before they can get to a readable page. */}
          <ThemeToggle />
        </div>
        {children}
      </main>
    </div>
  );
}

/** 28px ink tile plus the product name. Purely a mark, so it is not a link. */
function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-7 items-center justify-center rounded-pill bg-ink text-sm font-semibold text-on-ink">
        P
      </span>
      <span className="text-[17px] font-semibold text-ink">Projectory</span>
    </div>
  );
}
