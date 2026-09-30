import { NextResponse, type NextRequest } from "next/server";

/**
 * Next 16 renamed `middleware.ts` to `proxy.ts`. This file is Member 1's
 * exclusive territory (per the team's branch-ownership rules) — Member 2 and
 * Member 3 should not edit it.
 *
 * IMPORTANT: this is an OPTIMISTIC check only. It looks for the presence of a
 * session cookie and nothing else, because proxy runs on every request
 * (including prefetches) and must never touch the database. The real,
 * authoritative check is `requireUser()` in `lib/auth/index.ts`, which every
 * protected page calls. Proxy exists to give guests a clean redirect instead of
 * a flash of half-rendered content.
 *
 * WHY THERE IS NO "BOUNCE SIGNED-IN USERS OFF /sign-in" RULE HERE
 * An earlier version redirected an authenticated visitor away from /sign-in.
 * That rule cannot tell a *valid* session from a *stale* one — the cookie is
 * still in the browser either way — so it deadlocked with requireUser():
 *
 *   stale cookie → /dashboard passes proxy → requireUser() → /sign-in
 *                → proxy sees the cookie → /dashboard → requireUser() → ...
 *
 * which is an infinite redirect loop, and ERR_TOO_MANY_REDIRECTS for the user.
 * Bouncing a signed-in user off the auth pages is done in `app/(auth)/layout.tsx`
 * instead, where the session can be resolved properly and the two checks cannot
 * disagree.
 */

const SESSION_COOKIE = "pj_session";
/** Clerk's own cookie, checked so this file keeps working once Clerk is enabled. */
const CLERK_COOKIE = "__session";

const PROTECTED_PREFIXES = ["/dashboard", "/settings"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const hasSession = Boolean(
    request.cookies.get(SESSION_COOKIE)?.value ?? request.cookies.get(CLERK_COOKIE)?.value,
  );

  if (isProtected && !hasSession) {
    const url = new URL("/sign-in", request.url);
    // Remember where they were headed so sign-in can send them back.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js)$).*)",
  ],
};
