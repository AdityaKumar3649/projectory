"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useTransition } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import type { ProjectCounts } from "@/lib/contracts/types";
import type { ProjectSort, StatusFilter as StatusKey } from "@/lib/data/projects";
import { cn } from "@/lib/utils";

/**
 * The dashboard toolbar: a status segmented control plus a sort select.
 *
 * Both write to the URL instead of holding local state, so the dashboard stays
 * a pure function of `?filter=&sort=` - the list is shareable, the back button
 * works, and the Server Component does the actual filtering.
 *
 * `useSearchParams` bails out to client rendering during prerender, so the
 * interactive half of each control is exported separately and re-exported
 * behind a <Suspense> boundary.
 */

const FILTERS: { value: StatusKey; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const SORTS: { value: ProjectSort; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Newest first" },
  { value: "title", label: "Title A-Z" },
];

/** Merges a patch into the current query string and navigates, no full reload. */
function useQueryPush() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const push = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) next.set(key, value);
      const query = next.toString();
      startTransition(() => {
        // Filtering should never yank the page back to the top.
        router.push(query ? `/dashboard?${query}` : "/dashboard", { scroll: false });
      });
    },
    [router, searchParams],
  );

  return { push, pending };
}

function FilterSkeleton() {
  return <div aria-hidden className="h-[38px] w-[268px] animate-pulse rounded-pill bg-sunken sm:w-[300px]" />;
}

function SortSkeleton() {
  return <div aria-hidden className="h-8 w-[168px] animate-pulse rounded-pill bg-sunken" />;
}

function StatusFilterInner({ active, counts }: { active: StatusKey; counts: ProjectCounts }) {
  const { push, pending } = useQueryPush();

  return (
    <div
      role="group"
      aria-label="Filter projects by status"
      aria-busy={pending || undefined}
      className="inline-flex items-center gap-0.5 rounded-pill border border-hairline bg-sunken p-[3px]"
    >
      <span className="sr-only">
        {`${counts.all} projects: ${counts.pending} pending, ${counts.approved} approved, ${counts.rejected} rejected.`}
      </span>
      {FILTERS.map(({ value, label }) => {
        const current = value === active;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={current}
            onClick={() => {
              if (!current) push({ filter: value });
            }}
            className={cn(
              "h-[30px] rounded-pill px-3 text-[13px] transition-colors sm:px-3.5",
              current ? "bg-ink font-medium text-on-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function StatusFilter(props: { active: StatusKey; counts: ProjectCounts }) {
  return (
    <Suspense fallback={<FilterSkeleton />}>
      <StatusFilterInner {...props} />
    </Suspense>
  );
}

function SortSelectInner({ filter, sort }: { filter: StatusKey; sort: ProjectSort }) {
  const { push, pending } = useQueryPush();

  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    push({ sort: event.currentTarget.value });
  }

  // The form is a real GET form so the control still works with JS disabled;
  // intercept it only to keep the navigation client-side.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("sort");
    push({ sort: typeof value === "string" ? value : sort });
  }

  return (
    <form
      action="/dashboard"
      method="get"
      onSubmit={onSubmit}
      aria-busy={pending || undefined}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="filter" value={filter} />
      <label htmlFor="project-sort" className="sr-only">
        Sort projects
      </label>
      <Select
        id="project-sort"
        name="sort"
        defaultValue={sort}
        onChange={onChange}
        className="h-8 w-[168px] rounded-pill px-3 text-[13px]"
      >
        {SORTS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <noscript>
        <Button type="submit" variant="secondary" size="sm">
          Apply
        </Button>
      </noscript>
    </form>
  );
}

export function SortSelect(props: { filter: StatusKey; sort: ProjectSort }) {
  return (
    <Suspense fallback={<SortSkeleton />}>
      <SortSelectInner {...props} />
    </Suspense>
  );
}
