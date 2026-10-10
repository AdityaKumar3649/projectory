"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import {
  adminDeleteProject,
  adminUpdateProjectStatus,
  type AdminProject,
} from "@/app/actions/admin";
import { StatusBadge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/contracts/types";

type Filter = "all" | ProjectStatus;
type Pending = { type: "approve" | "reject" | "delete"; project: AdminProject };

/**
 * Moderation table.
 *
 * Two things here are deliberate rather than incidental:
 *
 * The confirm step uses a native `<dialog>` opened with `showModal()`, the same
 * as the delete dialog on the project form. An earlier version of this file
 * hand-rolled an absolutely-positioned overlay, which meant no focus trap, no
 * Escape handling, no `aria-modal` and no focus restoration - a keyboard user
 * could tab straight out of a dialog asking whether to permanently delete
 * something. The platform already provides all four.
 *
 * Dates are not formatted here. This component hydrates, and a locale-formatted
 * date computed on the client cannot match the server's copy of the same
 * string, which React reports as a hydration mismatch. Relative time is passed
 * in from the server instead.
 */
export function AdminProjectsClient({
  projects,
  when,
}: {
  projects: AdminProject[];
  when: Record<string, string>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);

  /*
   * One timer ref, cleared before each new one. With a bare setTimeout per
   * toast, firing a second action starts a second timer while the first is
   * still pending, and the older timer then clears the newer message early.
   */
  const showToast = (message: string, ok: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // The dialog is opened by effect rather than in the click handler, because the
  // element is only mounted once `confirm` is set.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (confirm && !d.open) d.showModal();
    if (!confirm && d.open) d.close();
  }, [confirm]);

  const needle = search.trim().toLowerCase();
  const visible = projects.filter((p) => {
    const byStatus = filter === "all" || p.status === filter;
    const bySearch =
      needle === "" ||
      p.title.toLowerCase().includes(needle) ||
      p.ownerName.toLowerCase().includes(needle) ||
      p.tags.some((t) => t.toLowerCase().includes(needle));
    return byStatus && bySearch;
  });

  const counts = {
    all: projects.length,
    pending: projects.filter((p) => p.status === "pending").length,
    approved: projects.filter((p) => p.status === "approved").length,
    rejected: projects.filter((p) => p.status === "rejected").length,
  };

  const run = () => {
    const action = confirm;
    setConfirm(null);
    if (!action) return;

    startTransition(async () => {
      let res: { ok: true } | { ok: false; error: string };
      if (action.type === "delete") {
        res = await adminDeleteProject(action.project.id);
      } else {
        res = await adminUpdateProjectStatus(
          action.project.id,
          action.type === "approve" ? "approved" : "rejected",
        );
      }
      showToast(
        res.ok
          ? action.type === "delete"
            ? `“${action.project.title}” deleted.`
            : `“${action.project.title}” ${action.type === "approve" ? "approved" : "rejected"}.`
          : res.error,
        res.ok,
      );
      router.refresh();
    });
  };

  const dialogCopy = confirm
    ? confirm.type === "delete"
      ? {
          title: "Delete this project?",
          body: `“${confirm.project.title}” will be permanently removed. This cannot be undone.`,
          label: "Delete",
          tone: "destructive" as const,
        }
      : confirm.type === "approve"
        ? {
            title: "Approve this project?",
            body: `“${confirm.project.title}” becomes publicly visible on Explore.`,
            label: "Approve",
            tone: "primary" as const,
          }
        : {
            title: "Reject this project?",
            body: `“${confirm.project.title}” stays private and the owner sees it was rejected.`,
            label: "Reject",
            tone: "destructive" as const,
          }
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {/*
          `min-w-0` on the group and a full-width search on small screens.

          The group's intrinsic width is all four pills side by side, because its
          own wrapping happens inside it rather than being offered to the parent
          row. The parent therefore sees a ~340px item, the search input cannot
          share the line, and the row overflows - 171px at 320px before this.
        */}
        <div role="group" aria-label="Filter by status" className="flex min-w-0 flex-wrap gap-1.5">
          {(["all", "pending", "approved", "rejected"] as const).map((key) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-[30px] items-center gap-1.5 rounded-pill border px-3 text-[12px] font-semibold transition-colors",
                  active
                    ? "border-transparent bg-accent text-on-ink"
                    : "border-hairline bg-surface text-ink-2 hover:bg-sunken",
                )}
              >
                {key === "all" ? "All" : key.charAt(0).toUpperCase() + key.slice(1)}
                <span className={cn("tabular-nums", active ? "opacity-80" : "text-ink-3")}>
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>

        <label className="relative ml-auto flex w-full min-w-0 items-center sm:w-56 sm:flex-none">
          <span className="sr-only">Search projects or owners</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects or owners"
            className="h-[30px] w-full min-w-0 rounded-input border border-line bg-surface pl-3 pr-3 text-[13px] text-ink placeholder:text-ink-3 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </label>
      </div>

      {/*
        `overflow-x-auto` on a wrapper, `min-w-full` on the table.

        A five-column moderation table cannot compress to 320px, and without this
        the whole document scrolls sideways: measured at 171px of overflow on a
        phone. Scrolling the table alone is the right behaviour - the page keeps
        its own scroll position, and the actions stay reachable by swiping the
        table rather than the entire layout.
      */}
      <div className="overflow-x-auto rounded-card border border-hairline bg-surface">
        <table className="w-full min-w-[640px] text-left">
          <caption className="sr-only">
            All projects, with the controls to approve, reject or delete each one
          </caption>
          <thead>
            <tr className="border-b border-hairline bg-sunken">
              <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">Project</th>
              <th scope="col" className="hidden px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3 sm:table-cell">Owner</th>
              <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">Status</th>
              <th scope="col" className="hidden px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3 lg:table-cell">Updated</th>
              <th scope="col" className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {visible.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-sunken/60">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        p.status === "approved" && "bg-dot-approved",
                        p.status === "pending" && "bg-dot-pending",
                        p.status === "rejected" && "bg-dot-rejected",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="max-w-[280px] truncate text-[13px] font-medium text-ink">{p.title}</p>
                      <p className="max-w-[280px] truncate text-[12px] text-ink-3">{p.description}</p>
                      {p.tags.length > 0 ? (
                        <p className="mt-1 flex flex-wrap gap-1">
                          {p.tags.slice(0, 3).map((t) => (
                            <span key={t} className="rounded-pill bg-sunken px-2 py-0.5 text-[10px] text-ink-2">
                              {t}
                            </span>
                          ))}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <p className="text-[13px] text-ink-2">{p.ownerName}</p>
                  <p className="max-w-[180px] truncate text-[12px] text-ink-3">{p.ownerEmail}</p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} size="sm" />
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-[12px] text-ink-3 lg:table-cell">
                  {when[p.id] ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {p.status !== "approved" ? (
                      <Button
                        type="button"
                        disabled={isPending}
                        onClick={() => setConfirm({ type: "approve", project: p })}
                        className="h-8 bg-approved px-3 text-[12px] font-semibold text-approved-fg hover:opacity-90"
                      >
                        <Check size={13} aria-hidden />
                        Approve
                      </Button>
                    ) : null}
                    {p.status !== "rejected" ? (
                      <Button
                        type="button"
                        disabled={isPending}
                        onClick={() => setConfirm({ type: "reject", project: p })}
                        className="h-8 bg-rejected px-3 text-[12px] font-semibold text-rejected-fg hover:opacity-90"
                      >
                        <X size={13} aria-hidden />
                        Reject
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isPending}
                      onClick={() => setConfirm({ type: "delete", project: p })}
                      className="h-8 px-3 text-[12px] font-semibold"
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <p className="text-[13px] font-medium text-ink-2">Nothing matches</p>
                  <p className="mt-1 text-[12px] text-ink-3">
                    {needle ? `No project or owner matches “${needle}”.` : "No projects with that status yet."}
                  </p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/*
        Native dialog, so focus trapping, Escape, background inertness and focus
        restoration all come from the platform rather than from hand-written
        key handling that tends to be wrong in exactly the ways that matter.
      */}
      <dialog
        ref={dialogRef}
        aria-labelledby="admin-confirm-title"
        onClose={() => setConfirm(null)}
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-card border border-hairline bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/45 open:block"
      >
        {dialogCopy ? (
          <div className="flex flex-col gap-4 p-5">
            <h2 id="admin-confirm-title" className="text-[17px] font-semibold">
              {dialogCopy.title}
            </h2>
            <p className="text-[13px] leading-relaxed text-ink-2">{dialogCopy.body}</p>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => setConfirm(null)} disabled={isPending}>
                Cancel
              </Button>
              <Button
                variant={dialogCopy.tone === "destructive" ? "destructive" : "primary"}
                onClick={run}
                disabled={isPending}
              >
                {dialogCopy.label}
              </Button>
            </div>
          </div>
        ) : null}
      </dialog>

      {/*
        `role="status"` gives it a polite live region, so the outcome of a
        moderation action is announced rather than appearing silently. Without
        it the feedback exists only for people who can see the corner of the
        screen where it landed.
      */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-50"
      >
        {toast ? (
          <p
            className={cn(
              "rounded-card border px-4 py-2.5 text-[13px] font-medium shadow-pop",
              toast.ok
                ? "border-approved bg-approved text-approved-fg"
                : "border-rejected bg-rejected text-rejected-fg",
            )}
          >
            {toast.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}