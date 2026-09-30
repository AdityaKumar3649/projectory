import { z } from "zod";

import type { AuthUser } from "@/lib/contracts/types";
import { hashPassword, newId, readDb, verifyPassword, withDb } from "@/lib/data/store";
import { createSession } from "@/lib/auth/session";

/**
 * Credentials auth for the local provider.
 *
 * Clerk owns authentication in the target stack. This exists so Member 1's
 * half of the app is fully runnable and demoable on day one, without waiting
 * on an external account. `lib/auth/index.ts` picks a provider at runtime, so
 * this file is deleted the day Clerk keys exist.
 */

export const signUpSchema = z.object({
  name: z.string().trim().min(2, { error: "Name must be at least 2 characters" }).max(50),
  email: z.email({ error: "Enter a valid email address" }).trim().toLowerCase(),
  password: z.string().min(8, { error: "Password must be at least 8 characters" }).max(200),
});

export const signInSchema = z.object({
  email: z.email({ error: "Enter a valid email address" }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Enter your password" }),
});

export type LocalAuthOutcome =
  | { ok: true; user: AuthUser; token: string; expiresAt: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export async function localSignUp(raw: unknown): Promise<LocalAuthOutcome> {
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const { name, email, password } = parsed.data;

  const db = await readDb();
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
    return { ok: false, error: "Enter your email and password.", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const { email, password } = parsed.data;

  const db = await readDb();
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
