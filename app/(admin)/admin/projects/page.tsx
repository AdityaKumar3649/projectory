import type { Metadata } from "next";

import { adminGetAllData } from "@/app/actions/admin";
import { relativeTime } from "@/lib/utils";
import { AdminProjectsClient } from "./projects-client";

export const metadata: Metadata = {
  title: "Projects",
  description: "Approve, reject or remove any project on the platform.",
};

export default async function AdminProjectsPage() {
  const { projects } = await adminGetAllData();

  /*
   * Relative time is computed here, on the server, and passed down as a plain
   * string. The table is a Client Component, so formatting the date inside it
   * would produce text from the browser's locale against the server's copy of
   * the same value - a hydration mismatch every single load.
   */
  const when = Object.fromEntries(projects.map((p) => [p.id, relativeTime(p.updatedAt)]));

  const sorted = [...projects].sort((a, b) => {
    // Pending first: that is the queue a moderator came here to clear.
    const rank = { pending: 0, approved: 1, rejected: 2 } as const;
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">Projects</h1>
          <p className="text-[13px] text-ink-3">
            Approve, reject or remove any project on the platform.
          </p>
        </div>
      </div>
      <AdminProjectsClient projects={sorted} when={when} />
    </div>
  );
}