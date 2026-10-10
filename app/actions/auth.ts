"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authMode } from "@/lib/auth";
import { SESSION_COOKIE, destroySession } from "@/lib/auth/session";
import { localSignIn, localSignUp } from "@/lib/auth/service";

/**
 * Form-facing auth actions (Member 1's half).
 *
 * Member 3 owns `lib/actions/*`. These live in `app/actions/*` so the two sets
 * of Server Actions never collide during a merge.
 *
 * Every action follows the same shape: validate, do the work, set a cookie, then
 * `redirect()` OUTSIDE any try/catch — `redirect` throws a control-flow exception
 * that must not be swallowed.
 */

export type AuthFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

/**
 * Only same-origin relative paths are accepted as a post-sign-in destination.
 * Without this check `?next=https://evil.example` would turn the sign-in page
 * into an open redirect.
 *
 * The character class rejects backslash plus anything unprintable. Backslash is
 * the important one: several browsers normalise a backslash to a forward slash,
 * so `/\evil.example` and `//evil.example` are the same attack and only the
 * second spelling is caught by the first check. Unprintable characters are
 * rejected because a tab or newline inside a redirect target is how request
 * splitting starts, and because a browser may normalise them after this check
 * has already run.
 *
 * This previously read `/[\\ -]/`, which was a mangled class matching backslash,
 * space and hyphen. That silently rewrote `/sign-in` and `/sign-up` - both real
 * routes on this site - to /dashboard, while letting a leading tab straight
 * through. It failed closed, so it was never exploitable, but it was rejecting
 * legitimate URLs and failing to reject the thing it was written for.
 */
function safeNext(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return /[\\\s\p{Cc}]/u.test(raw) ? "/dashboard" : raw;
}

/**
 * `remember` was previously ignored: the checkbox posted nothing and every
 * session cookie lasted 30 days regardless. "Keep me signed in" ticked now
 * means a persistent cookie with that expiry; unticked means a session cookie
 * that disappears when the browser closes.
 */
function cookieOptions(remember: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Omitting `expires` makes it a session cookie.
    ...(remember ? { expires: new Date(Date.now() + 30 * 86_400_000) } : {}),
  };
}

function wantsRemember(formData: FormData): boolean {
  const value = formData.get("remember");
  // Absent means the control was not rendered, so default to the safer option:
  // never keep someone signed in implicitly.
  if (value === null) return false;
  return value === "1" || value === "on" || value === "true";
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (authMode === "clerk") {
    return { error: "Clerk is enabled - use the Clerk sign-up component." };
  }

  // Enforced server-side, not just in the form. Client-side gating is advisory:
  // this request can be posted directly without ever loading the page, so the
  // server is the only place the rule is actually true.
  const terms = formData.get("terms");
  if (terms !== "on" && terms !== "true") {
    const message = "Please accept the Terms and Privacy Policy to continue.";
    return { error: message, fieldErrors: { terms: message } };
  }

  const result = await localSignUp({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  const jar = await cookies();
  // Not a hardcoded 30 days. Sign-in has always let the member choose between a
  // persistent cookie and one that dies with the browser; sign-up offered no
  // such control but still issued the persistent one, so anyone registering on
  // a shared or library machine stayed signed in for a month, and the privacy
  // page described behaviour that did not apply to this path. Absent the field,
  // `wantsRemember` reads false - the safe default.
  jar.set(SESSION_COOKIE, result.token, cookieOptions(wantsRemember(formData)));
  redirect(safeNext(formData.get("next")));
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (authMode === "clerk") {
    return { error: "Clerk is enabled - use the Clerk sign-in component." };
  }

  const result = await localSignIn({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, result.token, cookieOptions(wantsRemember(formData)));
  redirect(safeNext(formData.get("next")));
}

export async function signOutAction() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  await destroySession(token);
  jar.delete(SESSION_COOKIE);
  redirect("/sign-in");
}
