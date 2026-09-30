import type { AuthUser } from "@/lib/contracts/types";
import { hashPassword, newId, readDbQueued, verifyPassword, withDb } from "@/lib/data/store";
import { createSession } from "@/lib/auth/session";
import { authFieldErrors, signInSchema, signUpSchema } from "@/lib/auth/schemas";

/**
 * Credentials auth for the local provider.
 *
 * Clerk owns authentication in the target stack. This exists so Member 1's
 * half of the app is fully runnable and demoable on day one, without waiting
 * on an external account. `lib/auth/index.ts` picks a provider at runtime, so
 * this file is dead code the day Clerk keys exist.
 *
 * The schemas are NOT defined here — they live in `lib/auth/schemas.ts` so the
 * sign-in and sign-up forms import the exact same objects rather than keeping
 * hand-copied versions in step by hand.
 */

export type LocalAuthOutcome =
  | { ok: true; user: AuthUser; token: string; expiresAt: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function localSignUp(raw: unknown): Promise<LocalAuthOutcome> {
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: authFieldErrors(parsed.error),
    };
  }
  const { name, email, password } = parsed.data;

  const db = await readDbQueued();
  if (db.accounts.some((a) => a.email === email)) {
    return {
      ok: false,
      error: "That email is already registered.",
      fieldErrors: { email: "That email is already registered." },
    };
  }

  const userId = newId("user");
  const { salt, hash } = hashPassword(password);
  const now = new Date().toISOString();

  await withDb((write) => {
    write.accounts.push({ id: userId, email, name, passwordHash: hash, passwordSalt: salt, createdAt: now });
    write.profiles.push({
      userId,
      email,
      displayName: name,
      headline: "",
      bio: "",
      githubUrl: "",
      websiteUrl: "",
      twitterUrl: "",
      avatarUrl: "",
      createdAt: now,
    });
  });

  const session = await createSession(userId);
  return {
    ok: true,
    token: session.token,
    expiresAt: session.expiresAt,
    user: { id: userId, email, name, avatarUrl: "", isDemo: false },
  };
}

export async function localSignIn(raw: unknown): Promise<LocalAuthOutcome> {
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Enter your email and password.",
      fieldErrors: authFieldErrors(parsed.error),
    };
  }
  const { email, password } = parsed.data;

  const db = await readDbQueued();
  const account = db.accounts.find((a) => a.email === email);
  // Same message either way so the form cannot be used to discover accounts.
  const invalid: LocalAuthOutcome = {
    ok: false,
    error: "That email and password combination is not right.",
    fieldErrors: { password: "That email and password combination is not right." },
  };
  if (!account) return invalid;
  if (!verifyPassword(password, account.passwordSalt, account.passwordHash)) return invalid;

  const session = await createSession(account.id);
  return {
    ok: true,
    token: session.token,
    expiresAt: session.expiresAt,
    user: { id: account.id, email: account.email, name: account.name, avatarUrl: "", isDemo: false },
  };
}
