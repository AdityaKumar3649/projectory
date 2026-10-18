import { LogOut } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";

/**
 * Sign-out, as a server-action form.
 *
 * A form rather than an onClick handler on purpose: it works before hydration,
 * so the control is never briefly dead, and it submits with progressive
 * enhancement rather than depending on a bundle having loaded.
 *
 * This exists as its own component because the admin panel had no way to log out
 * at all - the control lived only in the member navigation, which the admin
 * shell does not render.
 */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      {/*
        type="submit" is required: the shared Button defaults to
        type="button", which silently turns this into a no-op inside a form.
      */}
      <button
        type="submit"
        className={
          className ??
          "flex h-9 w-full items-center gap-2.5 rounded-input px-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink"
        }
      >
        <LogOut size={15} aria-hidden className="text-ink-3" />
        Sign out
      </button>
    </form>
  );
}
