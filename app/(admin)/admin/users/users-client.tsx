"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { adminDeleteUser } from "@/app/actions/admin";
import { Avatar } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Toast, useToast } from "@/components/ui/toast";

export type AdminAccount = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  projectCount: number;
  joined: string;
};

export function AdminUsersClient({
  accounts,
  viewerId,
}: {
  accounts: AdminAccount[];
  viewerId: string;
}) {
  const router = useRouter();
  const { toast, show, clear } = useToast();
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<AdminAccount | null>(null);
  const [rows, setRows] = useState(accounts);
  const [seen, setSeen] = useState(accounts);
  const dialogRef = useRef<HTMLDialogElement>(null);

  /*
   * Adopt a new server list by adjusting state during render rather than in an
   * effect. `router.refresh()` delivers a new `accounts` array after every
   * action, and an effect would cost a second render pass to do it - which is
   * what React 19's set-state-in-effect rule is about. Comparing against the
   * last-seen array is the documented way to do this without the extra pass,
   * and it is a no-op on every render where the prop has not changed.
   */
  if (accounts !== seen) {
    setSeen(accounts);
    setRows(accounts);
  }

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (target && !d.open) d.showModal();
    if (!target && d.open) d.close();
  }, [target]);

  const confirm = () => {
    const victim = target;
    setTarget(null);
    if (!victim) return;
    const before = rows;
    // Optimistic, like the projects table. Deleting a member cascades to their
    // profile, sessions and projects, so leaving the row on screen for half a
    // second reads as "nothing happened".
    setRows((prev) => prev.filter((a) => a.id !== victim.id));

    startTransition(async () => {
      const res = await adminDeleteUser(victim.id);
      if (!res.ok) {
        setRows(before);
        show({ message: res.error, tone: "error" });
        return;
      }
      show({ message: `${victim.email} deleted.`, tone: "neutral" });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-ink-3" aria-live="polite">
        {rows.length} {rows.length === 1 ? "member" : "members"}
      </p>

      {/* Scrolls the table rather than the page: measured at 62px of document
          overflow on a 320px viewport without this. */}
      <div className="overflow-x-auto rounded-card border border-hairline bg-surface shadow-raised">
        <table className="w-full min-w-[520px] text-left">
          <caption className="sr-only">Registered members and the actions available on each</caption>
          <thead>
            <tr className="border-b border-hairline bg-sunken">
              <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                Member
              </th>
              <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                Projects
              </th>
              <th scope="col" className="hidden px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 sm:table-cell">
                Joined
              </th>
              <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.map((a) => {
              const isSelf = a.id === viewerId;
              return (
                <tr key={a.id} className="transition-colors hover:bg-hover">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* The shared primitive, rather than a hand-rolled
                          initial: it reads two initials and falls back when the
                          avatar image fails to load. */}
                      <Avatar name={a.name} size={28} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-medium text-ink">{a.name}</span>
                          {a.isAdmin ? (
                            <span className="rounded-pill bg-pending px-1.5 py-0.5 text-[10px] font-semibold text-pending-fg">
                              admin
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate text-[12px] text-ink-3">{a.email}</span>
                      </span>
                    </div>
                  </td>
                  {/* A count is a number: right-aligned, tabular, so the digits
                      line up down the column instead of raggedly. */}
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-ink-2">
                    {a.projectCount}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-[12px] text-ink-3 sm:table-cell">
                    {a.joined}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isSelf ? (
                      <span className="text-[12px] text-ink-3">This is you</span>
                    ) : (
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => setTarget(a)}
                        className="h-8 px-3 text-[12px] font-semibold"
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[13px] text-ink-3">
                  No members yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/*
        No `backdrop:bg-ink/45` here any more. The scrim now comes from
        `dialog::backdrop` reading --pj-scrim, which is a token that darkens in
        both themes. The utility version resolved `ink` to near-white in dark
        mode, so it laid a 45% white wash over the page.
      */}
      <dialog
        ref={dialogRef}
        aria-labelledby="admin-user-dialog-title"
        onClose={() => setTarget(null)}
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-card border border-hairline bg-surface p-0 text-ink shadow-overlay open:block"
      >
        {target ? (
          <div className="flex flex-col gap-4 p-5">
            <h2 id="admin-user-dialog-title" className="text-[17px] font-semibold">
              Delete this member?
            </h2>
            <p className="text-[13px] leading-relaxed text-ink-2">
              <span className="font-medium text-ink">{target.email}</span> will be removed, along
              with their profile and all {target.projectCount} of their project
              {target.projectCount === 1 ? "" : "s"}. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => setTarget(null)} disabled={isPending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirm} disabled={isPending}>
                Delete member
              </Button>
            </div>
          </div>
        ) : null}
      </dialog>

      <Toast toast={toast} onDismiss={clear} />
    </div>
  );
}
