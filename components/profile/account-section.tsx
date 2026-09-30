import { LogOut } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { authMode } from "@/lib/auth";
import type { AuthUser } from "@/lib/contracts/types";
import { Button } from "@/components/ui/button";
import { Alert, Chip } from "@/components/ui/primitives";
import { cn, formatDate } from "@/lib/utils";

/**
 * Read-only account facts plus sign-out.
 *
 * Server Component on purpose: it only renders values the session already
 * holds and submits `signOutAction` through a plain form action, so it needs
 * no client bundle. `authMode` is the single source of truth for which identity
 * provider is live - never assume Clerk is configured.
 */
export function AccountSection({
  user,
  createdAt,
  isDemo,
}: {
  user: AuthUser;
  createdAt: string;
  isDemo: boolean;
}) {
  const provider =
    authMode === "clerk" ? "Managed by Clerk" : isDemo ? "Demo account" : "Local account";
  const memberSince = formatDate(createdAt);

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3">
      <div className="divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-xs text-ink-3">Email address</p>
            <p className={cn("text-sm text-ink", !user.email && "text-ink-3")}>
              {user.email || "—"}
            </p>
          </div>
          <Chip>{provider}</Chip>
        </div>

        <div className="flex items-center gap-4 px-5 py-4">
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-xs text-ink-3">Member since</p>
            <p className={cn("text-sm text-ink", !memberSince && "text-ink-3")}>
              {memberSince || "—"}
            </p>
          </div>
          {/* type="submit" is required: Button defaults to type="button", which
              would render the button inert inside a plain action form. */}
          <form action={signOutAction}>
            <Button type="submit" variant="destructive" size="sm">
              <LogOut size={14} aria-hidden />
              Sign out
            </Button>
          </form>
        </div>
      </div>

      {isDemo ? (
        <Alert tone="info" title="You are signed in with the demo account">
          Seeded sample projects are visible so you can browse before committing. Signing up creates a
          fresh account with a dashboard of its own.
        </Alert>
      ) : null}
    </div>
  );
}
