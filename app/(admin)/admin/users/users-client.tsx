"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { adminDeleteUser } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<AdminAccount | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);

  const showToast = (message: string, ok: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

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
    startTransition(async () => {
      const res = await adminDeleteUser(victim.id);
      showToast(res.ok ? `${victim.email} deleted.` : res.error, res.ok);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Scrolls the table rather than the page: measured at 62px of document
          overflow on a 320px viewport without this. */}
      <div className="overflow-x-auto rounded-card border border-hairline bg-surface">
        <table className="w-full min-w-[520px] text-left">
          <caption className="sr-only">Registered members and the actions available on each</caption>
          <thead>
            <tr className="border-b border-hairline bg-sunken">
              <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">Member</th>
              <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">Projects</th>
              <th scope="col" className="hidden px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3 sm:table-cell">Joined</th>
              <th scope="col" className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {accounts.map((a) => {
              const isSelf = a.id === viewerId;
              return (
                <tr key={a.id} className="transition-colors hover:bg-sunken/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="grid size-7 shrink-0 place-items-center rounded-pill bg-accent-soft text-[12px] font-semibold text-accent"
                      >
                        {a.name.charAt(0).toUpperCase()}
                      </span>
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
                  <td className="px-4 py-3 text-[13px] tabular-nums text-ink-2">
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
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[13px] text-ink-3">
                  No members yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="admin-user-dialog-title"
        onClose={() => setTarget(null)}
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-card border border-hairline bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/45 open:block"
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

      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-50">
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