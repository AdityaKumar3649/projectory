import type { ReactNode } from "react";

import { AppNav } from "@/components/nav/app-nav";
import { requireUser } from "@/lib/auth";

/**
 * The authenticated shell. Every route under this group renders inside the
 * sticky nav and the shared content column.
 *
 * `requireUser()` is the AUTHORITATIVE gate. `proxy.ts` only does an optimistic
 * cookie check (it cannot touch the database because it runs on every request),
 * so a stale cookie still lands here and is thrown out to /sign-in.
 *
 * Note this layout is shared by /dashboard and /settings, and Next 16 layouts do
 * not re-render on navigation and receive no route params - which is why the
 * nav resolves its own active link on the client rather than being told.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh bg-base">
      <AppNav user={user} />
      {/*
      `tabIndex={-1}` because the skip link targets this element. A fragment link
      scrolls to it, but without a tab stop the browser does not move focus
      there, so the next Tab would resume inside the header the link was meant to
      bypass. The negative tabIndex takes it out of the natural tab order while
      still letting it receive programmatic focus.
    */}
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full max-w-[1120px] px-4 pt-8 pb-16 sm:px-6 focus:outline-none"
    >
      {children}
    </main>
    </div>
  );
}
