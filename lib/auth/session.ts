import { randomBytes } from "node:crypto";

import { withDb, type Session } from "@/lib/data/store";

/**
 * Session primitives for the local auth provider.
 *
 * A session is an opaque random token stored server-side and referenced by an
 * httpOnly cookie, so the browser never holds anything it can forge. This is
 * the same shape Clerk gives us, which is why `lib/auth/index.ts` can treat the
 * two providers identically.
 */

export const SESSION_COOKIE = "pj_session";
const SESSION_TTL_DAYS = 30;

export async function createSession(userId: string): Promise<Session> {
  const session: Session = {
    token: randomBytes(32).toString("hex"),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000).toISOString(),
  };
  await withDb((db) => {
    db.sessions = db.sessions.filter((s) => Date.parse(s.expiresAt) > Date.now());
    db.sessions.push(session);
  });
  return session;
}

/** Resolves a token to a userId, deleting it if it has expired. */
export async function resolveSession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const found = await withDb((db) => {
    const session = db.sessions.find((s) => s.token === token);
    if (!session) return null;
    if (Date.parse(session.expiresAt) <= Date.now()) {
      db.sessions = db.sessions.filter((s) => s.token !== token);
      return null;
    }
    return session.userId;
  });
  return found ?? null;
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await withDb((db) => {
    db.sessions = db.sessions.filter((s) => s.token !== token);
  });
}
