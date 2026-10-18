import { randomBytes } from "node:crypto";

import { readDbQueued, usesBlob, withDb, type Session } from "@/lib/data/store";

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
  }, true);
  return session;
}

/** Resolves a token to a userId, deleting it if it has expired. */
export async function resolveSession(token: string | undefined): Promise<string | null> {
  if (!token) return null;

  // Pure read: validating a session must NOT rewrite the database to disk or Blob
  // on every request / prefetch.
  let db = await readDbQueued(false);
  let session = db.sessions.find((s) => s.token === token);

  // If not found in the container's memory snapshot, force-refresh once from the remote
  // store in case another serverless instance created it.
  if (!session && usesBlob()) {
    db = await readDbQueued(true);
    session = db.sessions.find((s) => s.token === token);
  }

  if (!session) return null;

  if (Date.parse(session.expiresAt) <= Date.now()) {
    // Only write back when genuinely evicting an expired session
    await withDb((writableDb) => {
      writableDb.sessions = writableDb.sessions.filter((s) => s.token !== token);
    }, true);
    return null;
  }

  return session.userId;
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await withDb((db) => {
    db.sessions = db.sessions.filter((s) => s.token !== token);
  }, true);
}
