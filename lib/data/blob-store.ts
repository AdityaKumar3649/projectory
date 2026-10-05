/**
 * Persistence for hosts with a read-only filesystem.
 *
 * Vercel's serverless filesystem is read-only apart from /tmp, so `.data/db.json`
 * cannot be written there. Falling back to an in-memory copy made the app *run*
 * but not *work*: every instance seeded its own copy, so a sign-up handled by one
 * instance was invisible to the next request served by another. That was verified
 * on a real deployment - an account created through /sign-up could not then be
 * signed into.
 *
 * Vercel Blob is a single object store, so the whole database is one JSON blob
 * at a stable pathname. Credentials arrive through OIDC, so there is no token in
 * the environment to leak and nothing to rotate by hand.
 *
 * This is deliberately the *same shape* as the file store, one read and one
 * write, so the queue and the recovery paths in store.ts apply unchanged. It is
 * still a placeholder for Member 3's Postgres, not a replacement for it: every
 * read and write is a network round trip, which is exactly the cost a real
 * database will absorb properly.
 */

import { get, put } from "@vercel/blob";

/**
 * Fixed pathname with no random suffix, so the blob is overwritten in place
 * rather than accumulating a new version on every write.
 */
const PATHNAME = "projectory-db.json";

/**
 * True when a Blob store is configured. Checked at call time rather than at
 * module load so a local run that happens to have the variable set still works,
 * and so the check is trivial to reason about in tests.
 */
export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_STORE_ID);
}

/** The raw JSON document, or null when nothing has been stored yet. */
export async function readBlob(): Promise<string | null> {
  const result = await get(PATHNAME, {
    access: "private",
    // Read through to origin, not the CDN cache. The database is rewritten on
    // every write, so a cached copy would hand back stale accounts and projects.
    useCache: false,
  });
  if (!result) return null;
  return result.stream ? await new Response(result.stream).text() : null;
}

/**
 * Overwrites the blob with the given document.
 *
 * `addRandomSuffix: false` keeps the pathname stable, and `allowOverwrite` is
 * required because without it the SDK throws once the blob exists.
 */
export async function writeBlob(json: string): Promise<void> {
  await put(PATHNAME, json, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    // The database changes on every write; a cached copy would resurrect
    // stale accounts and projects for up to a month.
    cacheControlMaxAge: 60,
  });
}