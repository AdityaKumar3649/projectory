import type { Metadata } from "next";
import { Inbox } from "lucide-react";

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

  /*
   * Queue age is deliberately NOT `updatedAt`.
   *
   * Moderation used to write `updatedAt`, so deciding on a project reset its
   * own age to zero and pushed it to the bottom of the queue - the longer
   * something waited, the further down it sank. `createdAt` is when it was
   * submitted, which is the only timestamp that means "how long has this been
   * waiting for me".
   */
  const age = Object.fromEntries(
    projects.map((p) => [p.id, relativeTime(p.createdAt).replace(" ago", "")]),
  );

  const sorted = [...projects].sort((a, b) => {
    // Pending first: that is the queue a moderator came here to clear.
    const rank = { pending: 0, approved: 1, rejected: 2 } as const;
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    if (a.status === "pending") {
      // Oldest pending first. It used to sort by most-recently-updated first,
      // which is the exact inverse of how a queue should be worked.
      return a.createdAt.localeCompare(b.createdAt);
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  const waiting = projects.filter((p) => p.status === "pending").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">Projects</h1>
          <p className="text-[13px] text-ink-3">
            {waiting === 0
              ? "The queue is clear. Nothing is waiting for a decision."
              : `${waiting} ${waiting === 1 ? "submission is" : "submissions are"} waiting for a decision, oldest first.`}
          </p>
        </div>
        {waiting > 0 ? (
          <span className="inline-flex h-8 items-center gap-2 rounded-pill bg-pending px-3 text-[12px] font-semibold text-pending-fg">
            <Inbox size={14} aria-hidden />
            {waiting} to review
          </span>
        ) : null}
      </div>

      <AdminProjectsClient projects={sorted} when={when} age={age} />
    </div>
  );
}
