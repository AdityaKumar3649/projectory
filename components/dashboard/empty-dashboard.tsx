import Link from "next/link";
import { FolderPlus, SearchX } from "lucide-react";

import { buttonClass } from "@/components/ui/button";
import { Panel } from "@/components/ui/primitives";
import type { StatusFilter as StatusKey } from "@/lib/data/projects";

/**
 * The dashboard has two distinct "nothing here" states and they are not the
 * same message:
 *
 *  - no projects at all  -> teach the member how the queue works, and give them
 *    the one action that matters.
 *  - nothing in this filter -> they have work, the filter is just wrong, so
 *    the fix is to clear the filter, not to create something.
 */

const FILTER_NOUN: Record<StatusKey, string> = {
  all: "projects",
  pending: "pending projects",
  approved: "approved projects",
  rejected: "rejected projects",
};

export function EmptyDashboard({
  hasProjects,
  filter,
}: {
  hasProjects: boolean;
  filter: StatusKey;
}) {
  if (!hasProjects) {
    return (
      <Panel className="flex flex-col items-center gap-3 px-8 py-14 text-center">
        <span className="inline-flex size-11 items-center justify-center rounded-pill bg-sunken text-ink-2">
          <FolderPlus aria-hidden size={20} />
        </span>
        <h2 className="text-[17px] font-semibold">No projects yet</h2>
        <p className="max-w-[400px] text-[13px] leading-relaxed text-ink-3">
          Projects you submit will appear here while they await review. Approved ones also show up
          publicly on Explore.
        </p>
        <Link href="/dashboard/new" className={buttonClass()}>
          Create your first project
        </Link>
      </Panel>
    );
  }

  return (
    <Panel className="flex flex-col items-center gap-3 px-8 py-14 text-center">
      <span className="inline-flex size-11 items-center justify-center rounded-pill bg-sunken text-ink-2">
        <SearchX aria-hidden size={20} />
      </span>
      <h2 className="text-[17px] font-semibold">Nothing here yet</h2>
      <p className="max-w-[400px] text-[13px] leading-relaxed text-ink-3">
        You have no {FILTER_NOUN[filter]} to show. Switch the filter above, or clear it to see
        everything you have submitted.
      </p>
      <Link href="/dashboard" className="text-[13px] font-medium text-accent hover:underline">
        Clear the filter
      </Link>
    </Panel>
  );
}
