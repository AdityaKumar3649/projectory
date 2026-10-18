"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Code2, Globe, Search, Trash2, X } from "lucide-react";

import {
  adminBulkUpdateProjectStatus,
  adminDeleteProject,
  adminUpdateProjectStatus,
  type AdminProject,
} from "@/app/actions/admin";
import { StatusBadge } from "@/components/ui/primitives";
import { Button, buttonClass } from "@/components/ui/button";
import { Toast, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/contracts/types";

type Filter = "all" | ProjectStatus;

/** Only the irreversible action earns a modal. */
type Pending = { type: "delete"; project: AdminProject };

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

/**
 * Moderation table.
 *
 * Three things here are deliberate rather than incidental.
 *
 * Approve and reject do not open a dialog. They are reversible, and a
 * confirmation per decision is friction that scales with queue depth - at forty
 * items that is forty modals to click through to do one thing. They apply
 * optimistically and the toast offers Undo for eight seconds. Delete keeps its
 * dialog, because that one really is permanent.
 *
 * Pending state is scoped per row (`pendingIds`), not global. A single
 * `isPending` boolean disabled every button in the table, so acting on one row
 * froze the other thirty-nine.
 *
 * Relative timestamps are passed in from the server. This component hydrates,
 * and a locale-formatted or `Intl`-formatted value computed on the client
 * cannot match the server's copy of the same string - React reports that as a
 * hydration mismatch.
 */
export function AdminProjectsClient({
  projects,
  when,
  age,
}: {
  projects: AdminProject[];
  /** Relative time of the OWNER's last edit, computed server-side. */
  when: Record<string, string>;
  /** How long a pending project has been queued, computed server-side. */
  age: Record<string, string>;
}) {
  const router = useRouter();
  const { toast, show, clear } = useToast();
  // Second slot, not the first: the first is `isPending`, which is global and
  // therefore useless here - pending is tracked per row so acting on one row
  // does not freeze the rest of the table.
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [rows, setRows] = useState(projects);
  const [seen, setSeen] = useState(projects);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /*
   * Adopt a new server list by adjusting state during render, not in an effect.
   * `router.refresh()` delivers a new array after every action; an effect would
   * spend a second render pass doing what one comparison can do inline, which
   * is what React 19's set-state-in-effect rule exists to prevent.
   *
   * The optimistic patch in `decide` is deliberately transient - it covers the
   * gap between the click and the refresh, and is superseded by it.
   */
  if (projects !== seen) {
    setSeen(projects);
    setRows(projects);
  }

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (confirm && !d.open) d.showModal();
    if (!confirm && d.open) d.close();
  }, [confirm]);

  const needle = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      rows.filter((p) => {
        const byStatus = filter === "all" || p.status === filter;
        const bySearch =
          needle === "" ||
          p.title.toLowerCase().includes(needle) ||
          p.ownerName.toLowerCase().includes(needle) ||
          p.tags.some((t) => t.toLowerCase().includes(needle));
        return byStatus && bySearch;
      }),
    [rows, filter, needle],
  );

  const counts = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter((p) => p.status === "pending").length,
      approved: rows.filter((p) => p.status === "approved").length,
      rejected: rows.filter((p) => p.status === "rejected").length,
    }),
    [rows],
  );

  const selectedVisible = visible.filter((p) => selected.has(p.id));
  const allSelected = visible.length > 0 && selectedVisible.length === visible.length;
  const someSelected = selectedVisible.length > 0 && !allSelected;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const markPending = (ids: string[], on: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  /**
   * Applies a status change to one or many projects, optimistically.
   *
   * The previous statuses are captured so Undo can put them back exactly, and
   * the optimistic write happens before the await so the row responds to the
   * click immediately instead of sitting unchanged for 200-600ms.
   */
  const decide = (ids: string[], next: ProjectStatus, label: string) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const before = rows.filter((p) => idSet.has(p.id));
    const at = new Date().toISOString();

    setRows((prev) =>
      prev.map((p) => (idSet.has(p.id) ? { ...p, status: next, moderatedAt: at } : p)),
    );
    markPending(ids, true);

    startTransition(async () => {
      const res =
        ids.length === 1
          ? await adminUpdateProjectStatus(ids[0], next)
          : await adminBulkUpdateProjectStatus(ids, next);

      markPending(ids, false);

      if (!res.ok) {
        // Put the rows back exactly as they were rather than guessing.
        setRows((prev) => prev.map((p) => (idSet.has(p.id) ? before.find((b) => b.id === p.id)! : p)));
        show({ message: res.error, tone: "error" });
        return;
      }

      const count = "updated" in res ? res.updated : 1;
      show({
        message: ids.length === 1 ? `“${before[0].title}” ${label}.` : `${count} projects ${label}.`,
        tone: "success",
        actionLabel: "Undo",
        onAction: () => {
          // Undo is itself optimistic, and reuses the single-item path when
          // there is only one row to put back.
          const previous = before[0]?.status;
          if (!previous) return;
          setRows((prev) =>
            prev.map((p) => (idSet.has(p.id) ? { ...p, status: previous } : p)),
          );
          markPending(ids, true);
          startTransition(async () => {
            const res =
              ids.length === 1
                ? await adminUpdateProjectStatus(ids[0], previous)
                : await adminBulkUpdateProjectStatus(ids, previous);
            markPending(ids, false);
            if (res.ok) {
              show({ message: "Change undone.", tone: "neutral" });
            } else {
              show({ message: res.error, tone: "error" });
              router.refresh();
            }
          });
        },
      });

      setSelected(new Set());
      router.refresh();
    });
  };

  const runDelete = () => {
    const action = confirm;
    setConfirm(null);
    if (!action) return;
    const id = action.project.id;
    const before = rows;
    setRows((prev) => prev.filter((p) => p.id !== id));
    markPending([id], true);

    startTransition(async () => {
      const res = await adminDeleteProject(id);
      markPending([id], false);
      if (!res.ok) {
        setRows(before);
        show({ message: res.error, tone: "error" });
        return;
      }
      show({ message: `“${action.project.title}” deleted.`, tone: "neutral" });
      router.refresh();
    });
  };

  // "/" focuses search, the way it does in most tools a moderator already uses.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const bulkBar = selected.size > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {/*
          `min-w-0` on the group and a full-width search on small screens.

          The group's intrinsic width is all four pills side by side, because its
          own wrapping happens inside it rather than being offered to the parent
          row. The parent therefore sees a ~340px item, the search input cannot
          share the line, and the row overflows.
        */}
        <div role="group" aria-label="Filter by status" className="flex min-w-0 flex-wrap gap-1.5">
          {FILTERS.map(({ key, label }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-[12px] font-semibold transition-colors",
                  active
                    ? "border-transparent bg-ink text-on-ink"
                    : "border-hairline bg-surface text-ink-2 hover:bg-hover",
                )}
              >
                {label}
                <span className={cn("tabular-nums", active ? "opacity-70" : "text-ink-3")}>
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>

        <label className="relative ml-auto flex w-full min-w-0 items-center sm:w-60 sm:flex-none">
          <span className="sr-only">Search projects or owners</span>
          <Search
            size={14}
            aria-hidden
            className="pointer-events-none absolute left-3 text-ink-3"
          />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="h-8 w-full min-w-0 rounded-input border border-control-border bg-surface pl-8 pr-3 text-[13px] text-ink
                       placeholder:text-ink-3 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-2.5 hidden rounded border border-hairline px-1.5 py-0.5 font-sans text-[10px] text-ink-3 lg:block"
          >
            /
          </kbd>
        </label>
      </div>

      {/*
        Replaces the filter row rather than sitting below it, so the two never
        compete for the same line and the bulk count is never somewhere the eye
        is not already looking.
      */}
      {bulkBar ? (
        <div
          className="sticky top-2 z-30 flex flex-wrap items-center gap-2 rounded-card border border-hairline bg-surface px-3 py-2 shadow-raised"
        >
          <span className="text-[13px] font-medium tabular-nums text-ink">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="inline-flex h-8 items-center rounded-input px-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-hover"
          >
            Clear
          </button>
          <div className="flex-1" />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8"
            onClick={() => decide([...selected], "rejected", "rejected")}
          >
            <X size={13} aria-hidden />
            Reject
          </Button>
          <Button type="button" size="sm" className="h-8" onClick={() => decide([...selected], "approved", "approved")}>
            <Check size={13} aria-hidden />
            Approve
          </Button>
        </div>
      ) : null}

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] text-ink-3" aria-live="polite">
          {visible.length === rows.length
            ? `${rows.length} ${rows.length === 1 ? "project" : "projects"}`
            : `${visible.length} of ${rows.length} projects`}
        </p>
      </div>

      {/*
        Desktop: a real table in its own bounded scroll region.

        `overflow-auto` rather than `overflow-x-auto` on purpose. Setting
        overflow-x to anything but visible forces the used value of overflow-y
        to auto, so the wrapper becomes a scroll container on BOTH axes - and a
        `sticky top-0` header then resolves against that wrapper, which has no
        vertical scroll, and does not stick. Giving the box a max-height makes
        the stick real instead of decorative.
      */}
      <div className="hidden overflow-auto rounded-card border border-hairline bg-surface shadow-raised md:block lg:max-h-[calc(100dvh-19rem)]">
        <table className="w-full min-w-[820px] text-left">
          <caption className="sr-only">
            All projects, with controls to approve, reject or delete each one
          </caption>
          <thead className="sticky top-0 z-10">
            <tr className="bg-sunken">
              <th scope="col" className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(node) => {
                    if (node) node.indeterminate = someSelected;
                  }}
                  onChange={() =>
                    setSelected(allSelected ? new Set() : new Set(visible.map((p) => p.id)))
                  }
                  aria-label="Select all visible projects"
                  className="size-4 cursor-pointer rounded border border-control-border accent-accent"
                />
              </th>
              <th scope="col" className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                Project
              </th>
              <th scope="col" className="hidden px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 sm:table-cell">
                Owner
              </th>
              <th scope="col" className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                Status
              </th>
              <th scope="col" className="hidden px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 lg:table-cell">
                Queue age
              </th>
              <th scope="col" className="w-px px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {visible.map((p) => {
              const busy = pendingIds.has(p.id);
              const isSelected = selected.has(p.id);
              const detail = openId === p.id;
              return (
                <tr
                  key={p.id}
                  aria-busy={busy || undefined}
                  className={cn(
                    "transition-colors",
                    isSelected
                      ? "bg-selected shadow-[inset_3px_0_0_var(--color-accent)]"
                      : "hover:bg-hover",
                  )}
                >
                  <td className="px-3 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(p.id)}
                      aria-label={`Select ${p.title}`}
                      className="mt-0.5 size-4 cursor-pointer rounded border border-control-border accent-accent"
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
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
                        <button
                          type="button"
                          onClick={() => setOpenId(detail ? null : p.id)}
                          aria-expanded={detail}
                          className="block max-w-full truncate text-left text-[14px] font-medium text-ink hover:text-accent"
                          title={p.title}
                        >
                          {p.title}
                        </button>
                        {/*
                          No max-w here. It used to be capped at 280px while the
                          column was ~500px wide, so a third of every row was
                          empty on a laptop and the text was truncated anyway.
                          Truncation should be a consequence of the space left,
                          not a constant.
                        */}
                        <p className="line-clamp-1 text-[12px] text-ink-3">{p.description}</p>
                        {p.tags.length > 0 ? (
                          <p className="mt-1 flex flex-wrap gap-1">
                            {p.tags.slice(0, 3).map((t) => (
                              <span key={t} className="rounded-pill bg-sunken px-2 py-0.5 text-[10px] text-ink-2">
                                {t}
                              </span>
                            ))}
                            {p.tags.length > 3 ? (
                              <span className="px-1 py-0.5 text-[10px] text-ink-3">
                                +{p.tags.length - 3}
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                        {detail ? <ProjectDetail project={p} edited={when[p.id]} /> : null}
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 align-top sm:table-cell">
                    <p className="text-[13px] text-ink-2">{p.ownerName}</p>
                    <p className="max-w-[180px] truncate text-[12px] text-ink-3">{p.ownerEmail}</p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <StatusBadge status={p.status} size="sm" />
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-right text-[12px] tabular-nums text-ink-3 lg:table-cell">
                    {p.status === "pending" ? (age[p.id] ?? "—") : <span className="text-ink-3">—</span>}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex items-center justify-end gap-1.5">
                      {p.status !== "approved" ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={() => decide([p.id], "approved", "approved")}
                          className="h-8 bg-approved px-3 text-[12px] font-semibold text-approved-fg transition-colors hover:bg-approved/90"
                        >
                          <Check size={13} aria-hidden />
                          Approve
                        </Button>
                      ) : null}
                      {p.status !== "rejected" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => decide([p.id], "rejected", "rejected")}
                          className="h-8 px-3 text-[12px] font-semibold"
                        >
                          Reject
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setConfirm({ type: "delete", project: p })}
                        aria-label={`Delete ${p.title}`}
                        className="size-8 px-0 text-ink-3 hover:text-rejected-fg"
                      >
                        <Trash2 size={14} aria-hidden />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/*
        Phone: cards, not a table.

        A five-column table on a 430px screen puts Approve in the rightmost
        column, off-screen, behind a horizontal swipe nobody knows exists - and
        its 32px buttons are under the 44px touch minimum with a destructive
        control 60px from an approving one. An accordion was rejected instead
        because moderation is a scanning task and hiding the owner, age and tags
        behind a tap defeats the point. The data is shared through `visible`;
        only the markup differs.
      */}
      <ul className="flex flex-col gap-3 md:hidden">
        {visible.map((p) => {
          const busy = pendingIds.has(p.id);
          const isSelected = selected.has(p.id);
          return (
            <li
              key={p.id}
              aria-busy={busy || undefined}
              className={cn(
                "rounded-card border bg-surface p-3.5 shadow-raised transition-colors",
                isSelected ? "border-accent bg-selected" : "border-hairline",
              )}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(p.id)}
                  aria-label={`Select ${p.title}`}
                  className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border border-control-border accent-accent"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-medium text-ink">{p.title}</p>
                    <StatusBadge status={p.status} size="sm" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-3">{p.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
                    <span className="text-ink-2">{p.ownerName}</span>
                    {p.status === "pending" ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="tabular-nums">{age[p.id] ?? "—"}</span>
                      </>
                    ) : null}
                  </div>
                  {p.tags.length > 0 ? (
                    <p className="mt-2 flex flex-wrap gap-1">
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t} className="rounded-pill bg-sunken px-2 py-0.5 text-[10px] text-ink-2">
                          {t}
                        </span>
                      ))}
                    </p>
                  ) : null}
                </div>
              </div>

              {/*
                44px, not 32px. This is the primary action on the screen and it
                is being used with a thumb.
              */}
              <div className="mt-3 flex gap-2">
                {p.status !== "approved" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide([p.id], "approved", "approved")}
                    className={buttonClass({ size: "sm" })}
                  >
                    <Check size={15} aria-hidden />
                    Approve
                  </button>
                ) : null}
                {p.status !== "rejected" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide([p.id], "rejected", "rejected")}
                    className={buttonClass({ variant: "secondary", size: "sm" })}
                  >
                    Reject
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirm({ type: "delete", project: p })}
                  className={buttonClass({ variant: "ghost", size: "sm" })}
                >
                  <Trash2 size={15} aria-hidden />
                  <span className="sr-only">Delete {p.title}</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {visible.length === 0 ? (
        <div className="rounded-card border border-hairline bg-surface px-6 py-14 text-center shadow-raised">
          <p className="text-[13px] font-medium text-ink-2">Nothing matches</p>
          <p className="mt-1 text-[12px] text-ink-3">
            {needle ? `No project or owner matches “${needle}”.` : "No projects with that status yet."}
          </p>
        </div>
      ) : null}

      {/*
        Native dialog, so focus trapping, Escape, background inertness and focus
        restoration all come from the platform rather than from hand-written key
        handling that tends to be wrong in exactly the ways that matter. Only
        delete reaches here.
      */}
      <dialog
        ref={dialogRef}
        aria-labelledby="admin-confirm-title"
        onClose={() => setConfirm(null)}
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-card border border-hairline bg-surface p-0 text-ink shadow-overlay open:block"
      >
        {confirm ? (
          <div className="flex flex-col gap-4 p-5">
            <h2 id="admin-confirm-title" className="text-[17px] font-semibold">
              Delete this project?
            </h2>
            <p className="text-[13px] leading-relaxed text-ink-2">
              “{confirm.project.title}” will be permanently removed, along with everything on it. This
              cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={runDelete}>
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </dialog>

      <Toast toast={toast} onDismiss={clear} />
    </div>
  );
}

/**
 * The thing a moderator actually needs in order to decide.
 *
 * `longDescription`, `repoUrl` and `liveUrl` were fetched for every row and
 * rendered nowhere, so submissions were being approved without anyone reading
 * them. Expanded inline rather than in a side drawer: on a table this wide an
 * inline expansion keeps the row's context on screen, and it needs no focus
 * management of its own because it is not a dialog.
 */
function ProjectDetail({ project, edited }: { project: AdminProject; edited?: string }) {
  const host = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-input border border-hairline bg-sunken p-3">
      {project.longDescription ? (
        <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-ink-2">
          {project.longDescription}
        </p>
      ) : (
        <p className="text-[12px] italic text-ink-3">No long description was provided.</p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {project.repoUrl ? (
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 font-mono text-[12px] text-accent hover:underline"
          >
            <Code2 size={13} aria-hidden />
            {host(project.repoUrl)}
          </a>
        ) : null}
        {project.liveUrl ? (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 font-mono text-[12px] text-accent hover:underline"
          >
            <Globe size={13} aria-hidden />
            {host(project.liveUrl)}
          </a>
        ) : null}
      </div>

      <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]">
        <div className="flex gap-1.5">
          <dt className="text-ink-3">Owner</dt>
          <dd className="text-ink-2">{project.ownerName}</dd>
        </div>
        {/*
          The owner's own last edit, which is NOT the same as the queue age and
          used to be the only timestamp on the screen. Moderation no longer
          writes `updatedAt`, so these two genuinely diverge - a project can sit
          in the queue for a week while its owner last touched it a month ago.
        */}
        <div className="flex gap-1.5">
          <dt className="text-ink-3">Owner last edited</dt>
          <dd className="text-ink-2">{edited ?? "—"}</dd>
        </div>
      </dl>

      {project.moderationNote ? (
        <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-ink-3">
          <ChevronRight size={13} aria-hidden className="mt-0.5 shrink-0" />
          <span>
            <span className="font-medium text-ink-2">Last decision note:</span> {project.moderationNote}
          </span>
        </p>
      ) : null}
    </div>
  );
}
