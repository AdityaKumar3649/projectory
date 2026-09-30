import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import type { Project, UserProfile } from "@/lib/contracts/types";

/**
 * A tiny file-backed store standing in for Member 3's Drizzle + PostgreSQL layer.
 *
 * WHY THIS EXISTS
 * Member 3 owns the database. He is not available yet, and Member 1's UI cannot
 * be built or demoed without something behind it. So every function in
 * `lib/data/*` is written against the exact contract the team plan specifies
 * (createProject / updateProject / deleteProject / getMyProjects, plus the
 * profile pair). When Member 3's Server Actions land, only the *bodies* of
 * those functions change — no component, form or page imports this file directly.
 *
 * When swapping to the real database:
 *   1. delete .data/db.json
 *   2. reimplement the exports in lib/data/projects.ts + lib/data/profile.ts
 *      against @/db (Drizzle)
 *   3. delete this file and lib/data/store.ts
 */

export interface Account {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface DbShape {
  accounts: Account[];
  profiles: UserProfile[];
  projects: Project[];
  sessions: Session[];
}

const DATA_DIR = ".data";
const DB_FILE = `${DATA_DIR}/db.json`;

/** Serialises writes so two concurrent requests cannot clobber the file. */
let queue: Promise<unknown> = Promise.resolve();

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return { salt, hash: scryptSync(password, salt, 64).toString("hex") };
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

function seed(): DbShape {
  const demoId = "user_demo";
  const { salt, hash } = hashPassword("projectory");

  const demoProfile: UserProfile = {
    userId: demoId,
    email: "demo@projectory.app",
    displayName: "Aditya Sharma",
    headline: "CS student building developer tools",
    bio: "Final-year CS student. I build small, sharp tools for the terminal and spend most of my evenings on Rust and TypeScript.",
    githubUrl: "https://github.com/aditya",
    websiteUrl: "https://adityasharma.dev",
    twitterUrl: "",
    avatarUrl: "",
    createdAt: daysAgo(120),
  };

  const project = (
    partial: Pick<Project, "title" | "description" | "longDescription" | "repoUrl" | "liveUrl" | "tags" | "status" | "createdAt" | "updatedAt"> &
      Partial<Pick<Project, "id" | "organizationId">>,
  ): Project => ({
    id: partial.id ?? newId("prj"),
    ownerId: demoId,
    title: partial.title,
    description: partial.description,
    longDescription: partial.longDescription,
    repoUrl: partial.repoUrl,
    liveUrl: partial.liveUrl,
    tags: partial.tags,
    organizationId: partial.organizationId ?? null,
    status: partial.status,
    createdAt: partial.createdAt,
    updatedAt: partial.updatedAt,
  });

  return {
    accounts: [
      {
        id: demoId,
        email: demoProfile.email,
        name: demoProfile.displayName,
        passwordHash: hash,
        passwordSalt: salt,
        createdAt: demoProfile.createdAt,
      },
    ],
    profiles: [demoProfile],
    sessions: [],
    projects: [
      project({
        title: "Terminal Focus",
        description: "A focused terminal that stays out of the way.",
        longDescription:
          "Terminal Focus is a terminal emulator built around a single idea: nothing should compete for your attention. Tabs, splits and search are all keyboard-first, and the chrome recedes the moment you start typing.",
        repoUrl: "https://github.com/aditya/terminal-focus",
        liveUrl: "https://terminalfocus.app",
        tags: ["cli", "rust", "terminal"],
        status: "approved",
        createdAt: daysAgo(30),
        updatedAt: daysAgo(2),
      }),
      project({
        title: "Orbit Sync",
        description: "Real-time Postgres sync for local-first apps.",
        longDescription:
          "Orbit Sync keeps a local Postgres replica in step with the cloud using logical replication, so local-first tools can sync without a central coordinator.",
        repoUrl: "https://github.com/aditya/orbit-sync",
        liveUrl: "",
        tags: ["postgres", "sync"],
        status: "pending",
        createdAt: daysAgo(1),
        updatedAt: hoursAgo(6),
      }),
      project({
        title: "Ledger Lite",
        description: "A double-entry accounting CLI in Rust.",
        longDescription:
          "A small accounting CLI that keeps a plain-text ledger and prints a real balance sheet. Built to learn Rust properly.",
        repoUrl: "https://github.com/aditya/ledger-lite",
        liveUrl: "",
        tags: ["rust", "cli"],
        status: "rejected",
        createdAt: daysAgo(60),
        updatedAt: daysAgo(21),
      }),
      project({
        title: "Patchwork",
        description: "A diff viewer that explains itself.",
        longDescription:
          "Patchwork renders diffs with a plain-language summary of what changed and why, aimed at code review on teams with mixed experience.",
        repoUrl: "https://github.com/aditya/patchwork",
        liveUrl: "https://patchwork.tools",
        tags: ["git", "review"],
        status: "approved",
        createdAt: daysAgo(75),
        updatedAt: daysAgo(30),
      }),
      project({
        title: "Kettle",
        description: "One-command Postgres seeds for small teams.",
        longDescription:
          "Kettle generates realistic seed data from a handful of declarative rules, so a new teammate has a working database in under a minute.",
        repoUrl: "https://github.com/aditya/kettle",
        liveUrl: "",
        tags: ["postgres", "tooling"],
        status: "approved",
        createdAt: daysAgo(90),
        updatedAt: daysAgo(60),
      }),
      project({
        title: "Fathom",
        description: "Terminal charts that read well at any width.",
        longDescription:
          "Fathom renders sparklines and small multiples straight into a terminal, adapting to the window size and degrading to plain text over ssh.",
        repoUrl: "https://github.com/aditya/fathom",
        liveUrl: "",
        tags: ["cli", "tui"],
        status: "pending",
        createdAt: daysAgo(4),
        updatedAt: daysAgo(3),
      }),
    ],
  };
}

/**
 * Where the store lives, and whether it can be written at all.
 *
 * On a normal machine this is just `.data/db.json` and everything is
 * straightforward. On a serverless host (Vercel, Netlify, Cloudflare) the
 * filesystem is read-only apart from /tmp, so writing there throws EROFS and
 * every request would 500. Rather than special-casing the host, the store
 * probes once and falls back to an in-memory copy: the app then works on any
 * platform, with the caveat that state is per-instance and resets on a cold
 * start. That is fine for a demo and is exactly the behaviour Member 3's real
 * database will replace.
 *
 * The probe is deliberately lazy and cached, so it costs one failed write at
 * most per process rather than on every request.
 */
let writable: boolean | null = null;
let memory: DbShape | null = null;
async function canWrite(): Promise<boolean> {
  if (writable !== null) return writable;
  const fs = await import("node:fs/promises");
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_DIR, fs.constants.W_OK);
    writable = true;
  } catch {
    writable = false;
    console.warn(
      "[projectory] .data is not writable (read-only filesystem?). " +
        "Falling back to an in-memory store: data resets when the instance " +
        "restarts. This is expected on serverless hosts.",
    );
  }
  return writable;
}

async function ensureDb(): Promise<void> {
  if (!(await canWrite())) return;
  const fs = await import("node:fs/promises");
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await writeAtomic(seed());
  }
}

async function reseed() {
  if (!(await canWrite())) {
    memory = seed();
    return;
  }
  const fs = await import("node:fs/promises");
  await fs.mkdir(DATA_DIR, { recursive: true });
  await writeAtomic(seed());
  console.warn(
    "[projectory] Local store was unreadable and has been re-seeded. " +
      "Delete .data/db.json to reset at any time.",
  );
}

/**
 * Writes via a temp file and an atomic rename.
 *
 * `fs.writeFile` truncates the target before it writes, so for a window of time
 * the file on disk is half a document. A plain read landing in that window fails
 * to parse. That is not hypothetical: the server log showed the re-seed path
 * firing fifteen times in a row, each one replacing the user's data with the
 * demo seed. `rename` within a directory is atomic, so a reader sees either the
 * old file or the new one, never a torn one.
 */
async function writeAtomic(db: DbShape): Promise<void> {
  const fs = await import("node:fs/promises");
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  try {
    await fs.rename(tmp, DB_FILE);
  } catch (error) {
    // Windows can refuse a rename onto an existing file.
    await fs.rm(tmp, { force: true }).catch(() => {});
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
    throw error;
  }
}

/**
 * Reads the store, and re-seeds only when the file is genuinely unusable.
 *
 * A parse failure is NOT treated as "the database is corrupt, throw it away".
 * It is far more likely to be a torn read or a half-finished write, and
 * re-seeding on that would destroy real data. When a good snapshot is already
 * in memory it is returned instead, and the file is left alone so the next
 * successful write repairs it.
 *
 * A structurally wrong but parseable file is caught too - a half-written object
 * missing `projects` would otherwise fail deep inside a query with a confusing
 * message rather than here.
 *
 * With no writable filesystem the in-memory copy is the database: seeded on
 * first read and mutated in place by `withDb`.
 */
export async function readDb(): Promise<DbShape> {
  if (!(await canWrite())) {
    if (!memory) memory = seed();
    return memory;
  }

  await ensureDb();
  const fs = await import("node:fs/promises");

  let raw: string;
  try {
    raw = await fs.readFile(DB_FILE, "utf8");
  } catch {
    await reseed();
    return seed();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Keep whatever we last knew to be good rather than destroying it.
    if (memory) return memory;
    await reseed();
    return seed();
  }

  const looksRight =
    typeof parsed === "object" &&
    parsed !== null &&
    Array.isArray((parsed as DbShape).projects) &&
    Array.isArray((parsed as DbShape).accounts);

  if (!looksRight) {
    if (memory) return memory;
    await reseed();
    return seed();
  }

  const db = parsed as DbShape;
  // Cache the last known good snapshot so a later torn read can fall back to it.
  memory = db;
  return db;
}

/**
 * Runs `mutator` against the store and persists the result.
 *
 * Every access - reads included - goes through one queue. Reads used to run
 * outside it, so a plain `getMyProjects` could land in the middle of a write
 * and observe a half-written file; the re-seed path then replaced the user's
 * data with the demo seed. Serialising them costs nothing measurable here and
 * removes the whole class of race.
 *
 * With no writable filesystem the mutator's in-place edit of the shared object
 * IS the persistence, so the write-back is skipped rather than allowed to throw
 * and surface as a 500 for a request that actually succeeded.
 */
export function withDb<T>(mutator: (db: DbShape) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    if (await canWrite()) {
      await writeAtomic(db);
      memory = db;
    }
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** A read that cannot interleave with a write. */
export function readDbQueued(): Promise<DbShape> {
  return withDb((db) => db);
}
