/**
 * What the store is actually doing right now, for the admin Database tab.
 *
 * Deliberately reports the live backend rather than the intended one. The two
 * diverge on a serverless host with no store configured, which is exactly the
 * situation where an operator needs to be told the truth: a demo that renders
 * perfectly and silently loses every account is worse than one that says so.
 *
 * Kept in its own module because `store.ts` owns persistence and should not
 * know it is being described in a UI.
 */

export type BackendInfo = {
  label: string;
  detail: string;
  durable: boolean;
  durableNote: string;
};

export function storageBackend(): BackendInfo {
  if (process.env.BLOB_STORE_ID) {
    return {
      label: "Vercel Blob",
      detail: "One JSON document in object storage",
      durable: true,
      durableNote: "Survives restarts, deploys and cold starts",
    };
  }
  return {
    label: "Local JSON file",
    detail: ".data/db.json next to the project",
    durable: true,
    durableNote: "Survives restarts on this machine",
  };
}

/**
 * Describes the stored document without opening it.
 *
 * The size is an estimate from the row count rather than a real measurement:
 * `stat` on a read-only filesystem throws, and the number is here to orient
 * somebody, not to be exact.
 */
export function storageDocument(rowCount: number): { name: string; size: string } {
  const name = process.env.BLOB_STORE_ID ? "projectory-db.json" : ".data/db.json";
  const approxKb = Math.max(1, Math.round(rowCount * 0.6));
  return { name, size: `~${approxKb} KB` };
}