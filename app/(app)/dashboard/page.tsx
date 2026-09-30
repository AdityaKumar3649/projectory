import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { EmptyDashboard } from "@/components/dashboard/empty-dashboard";
import { ProjectList } from "@/components/dashboard/project-list";
import { StatTiles } from "@/components/dashboard/stat-tiles";
import { SortSelect, StatusFilter } from "@/components/dashboard/status-filter";
import { buttonClass } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth";
import {
  countByStatus,
  filterAndSortProjects,
  getMyProjects,
  type ProjectSort,
  type StatusFilter as StatusKey,
} from "@/lib/data/projects";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your projects",
};

const FILTERS = ["all", "pending", "approved", "rejected"] as const satisfies readonly StatusKey[];
const SORTS = ["updated", "created", "title"] as const satisfies readonly ProjectSort[];

/** A repeated query param (`?filter=a&filter=b`) collapses to its first value. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Unknown values fall back to the default instead of throwing - the URL is user input. */
function pick<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.find((candidate) => candidate === value) ?? fallback;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();

  const [projects, query] = await Promise.all([getMyProjects(user.id), searchParams]);
  const counts = countByStatus(projects);

  const filter = pick(first(query.filter), FILTERS, "all");
  const sort = pick(first(query.sort), SORTS, "updated");
  const visible = filterAndSortProjects(projects, filter, sort);

  // getMyProjects returns most-recently-updated first, so [0] is the freshest.
  const latest = projects[0]?.updatedAt;
  const caption =
    `${counts.all} project${counts.all === 1 ? "" : "s"}` +
    (user.isDemo && latest ? ` · last updated ${relativeTime(latest)}` : "");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.015em]">Your projects</h1>
          <p className="text-[13px] text-ink-3">{caption}</p>
        </div>
        <Link href="/dashboard/new" className={buttonClass()}>
          <Plus aria-hidden size={15} />
          New project
        </Link>
      </div>

      <StatTiles counts={counts} />

      <div className="flex flex-wrap items-center gap-3">
        <StatusFilter active={filter} counts={counts} />
        <div className="flex-1" />
        <SortSelect filter={filter} sort={sort} />
      </div>

      {counts.pending > 0 ? (
        <Alert
          tone="info"
          title={`${counts.pending} project${counts.pending === 1 ? " is" : "s are"} waiting on a review decision`}
        >
          Approved projects appear publicly on Explore. Rejected ones stay private to you.
        </Alert>
      ) : null}

      {visible.length === 0 ? (
        <EmptyDashboard hasProjects={counts.all > 0} filter={filter} />
      ) : (
        <ProjectList projects={visible} />
      )}
    </div>
  );
}
