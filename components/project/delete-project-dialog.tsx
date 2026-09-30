"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { deleteProjectAction } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";

/**
 * Destructive confirm for removing a project.
 *
 * Uses the native `<dialog>` element rather than a hand-rolled overlay because
 * `showModal()` buys three things that are tedious and easy to get wrong by
 * hand: focus is trapped inside, Esc closes, and the rest of the page becomes
 * inert for screen readers.
 */
export function DeleteProjectDialog({
  projectId,
  projectTitle,
}: {
  projectId: string;
  projectTitle: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = () => {
    setError(null);
    dialogRef.current?.showModal();
  };

  const close = () => dialogRef.current?.close();

  const confirm = () => {
    startTransition(async () => {
      const result = await deleteProjectAction(projectId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      close();
      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <>
      <Button variant="destructive" onClick={open}>
        <Trash2 size={15} aria-hidden />
        Delete project
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-project-heading"
        // Esc and the backdrop both fire `close`; clearing the error here means
        // a dismissed dialog never reopens showing a stale failure.
        onClose={() => setError(null)}
        // The UA stylesheet centres modal dialogs, so `m-auto` keeps that
        // behaviour explicit. The width is capped by `max-w-md` on desktop and
        // by the viewport minus a gutter on a phone.
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-card border border-hairline bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/40 open:block"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <h3 id="delete-project-heading" className="text-[17px] font-semibold">
              Delete this project?
            </h3>
            <p className="text-[13px] leading-relaxed text-ink-2">
              &ldquo;{projectTitle}&rdquo; will be permanently removed, along with its votes. This
              cannot be undone.
            </p>
          </div>

          {error ? <Alert tone="error">{error}</Alert> : null}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirm} disabled={pending}>
              {pending ? "Deleting…" : "Delete project"}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
