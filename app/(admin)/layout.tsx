import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/roles";
import { AdminNav } from "./admin-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/**
 * Admin shell: a persistent sidebar plus the page.
 *
 * This gate stops a non-admin reaching a page they cannot use. It is not the
 * security boundary - `app/actions/admin.ts` re-checks on every mutation,
 * because a layout is a UI concern and anyone can POST to an action endpoint
 * directly. The rule itself lives once, in `lib/auth/roles.ts`.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (!isAdmin(user.id)) {
    redirect("/dashboard");
  }

  return (
    /*
     * Stacks on narrow screens, sidebar on wider ones.

     * The first version of this shell was an unconditional `flex` row with a
     * fixed 236px sidebar. On a 320px phone that left the content column 84px
     * wide, and because nothing clipped it the headings painted straight past
     * the viewport - 62 to 65px of sideways document scroll on every admin page.
     * No amount of `min-w-0` on the children fixes that; the row itself has to
     * stop being a row.
     */
    <div className="flex min-h-dvh flex-col bg-base lg:flex-row">
      <AdminNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-[52px] items-center gap-3 border-b border-hairline bg-surface px-4 sm:px-6">
          <p className="min-w-0 flex-1 truncate text-[12px] text-ink-3">
            Signed in as{" "}
            <span className="font-semibold text-ink">{user.email}</span>
          </p>
          <ThemeToggle />
        </div>
        {/*
          `id` and `tabIndex` because the root layout's skip link targets this.
          Without the tab stop the link would scroll here but focus would stay
          in the nav, so the next Tab would resume inside the very navigation the
          link exists to bypass.
        */}
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full min-w-0 max-w-[1120px] flex-1 px-4 pb-16 pt-6 focus:outline-none sm:px-6 sm:pt-7"
        >
          {children}
        </main>
      </div>
    </div>
  );
}