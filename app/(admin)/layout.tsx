import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/roles";
import { adminGetAllData } from "@/app/actions/admin";
import { AdminNav } from "./admin-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SignOutButton } from "@/components/ui/sign-out-button";

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

  // One read for the shell. The nav shows the queue depth, and fetching it
  // separately from the overview would mean two reads of the same store per
  // page view purely to render a badge.
  const { projects } = await adminGetAllData();
  const pendingCount = projects.filter((p) => p.status === "pending").length;

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
      {/*
        `lg:sticky lg:top-0 lg:h-dvh` so the sidebar stays put. It used to
        scroll away with the page, which on a long moderation table meant
        navigating back up to reach another section.
      */}
      <div className="flex shrink-0 flex-col lg:sticky lg:top-0 lg:h-dvh">
        <AdminNav pendingCount={pendingCount} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-[52px] items-center gap-3 border-b border-hairline bg-surface px-4 sm:px-6">
          <p className="min-w-0 flex-1 truncate text-[12px] text-ink-3">
            Signed in as{" "}
            <span className="font-semibold text-ink">{user.email}</span>
          </p>
          {/*
            Sign-out is in this bar on a phone, where the sidebar collapses to a
            horizontal strip with no room for a footer.
          */}
          <div className="lg:hidden">
            <SignOutButton className="inline-flex h-9 items-center gap-1.5 rounded-input px-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink" />
          </div>
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
          className="mx-auto w-full min-w-0 max-w-[1400px] flex-1 px-4 pb-16 pt-6 focus:outline-none sm:px-6 sm:pt-7"
        >
          {children}
        </main>
      </div>
    </div>
  );
}