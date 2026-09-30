import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";

import type { AuthUser } from "@/lib/contracts/types";
import { readDb } from "@/lib/data/store";
import { SESSION_COOKIE, resolveSession } from "@/lib/auth/session";
import { authMode, clerkEnabled, type AuthMode } from "@/lib/auth/mode";

/**
 * The data-access layer for the signed-in user.
 *
 * `requireUser` is the single gate every protected page calls. Per the Next 16
 * authentication guide the check lives here rather than in a layout, because a
 * layout does not re-render on navigation and so cannot be trusted to guard a
 * route on its own.
 *
 * `cache()` deduplicates the lookup across a single render pass, so a page that
 * calls it in three places still reads the cookie once.
 *
 * SERVER ONLY — this module imports `next/headers`. Client Components must
 * import `authMode` / `clerkEnabled` from `@/lib/auth/mode` instead.
 */

export { authMode, clerkEnabled };
export type { AuthMode };

async function clerkUser(): Promise<AuthUser | null> {
  // Imported lazily so the app boots without Clerk installed or configured.
  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? "",
    name: user.fullName ?? user.username ?? "Member",
    avatarUrl: user.imageUrl,
    isDemo: false,
  };
}

async function localUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const userId = await resolveSession(token);
  if (!userId) return null;
  const db = await readDb();
  const account = db.accounts.find((a) => a.id === userId);
  if (!account) return null;
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    avatarUrl: "",
    isDemo: account.id === "user_demo",
  };
}

export const getCurrentUser = cache(async (): Promise<AuthUser | null> =>
  authMode === "clerk" ? clerkUser() : localUser(),
);

/** Throws the guest out to the sign-in screen, preserving where they were going. */
export async function requireUser(returnTo?: string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}` : "/sign-in");
  }
  return user;
}

/** Cheap cookie-presence check for `proxy.ts`, which must not hit the database. */
export async function hasSessionCookie(): Promise<boolean> {
  if (authMode === "clerk") {
    // Clerk's own middleware owns this case; presence of its cookie is enough
    // for the optimistic redirect in proxy.
    return Boolean((await cookies()).get("__session"));
  }
  return Boolean((await cookies()).get(SESSION_COOKIE)?.value);
}
