# Reading the codebase in VS Code

Open this file in a second editor tab and keep it beside the code. It tells you
**which file to open, in what order, and what to look for once you're in it.**

---

## VS Code shortcuts that make this fast

| Key | What it does | Why it helps here |
| --- | --- | --- |
| `Ctrl+P` | Go to file | Fastest way to jump. Type `store` to find the database. |
| `Ctrl+Shift+F` | Search in all files | Find *every* place something is used. |
| `F12` | Go to definition | Follow a function to where it's written. |
| `Alt+F12` | Peek definition | See the code without leaving your file. **Best one.** |
| `Shift+Alt+F12` | Find all references | "Where is `requireUser` called?" — answers that instantly. |
| `Ctrl+` | Toggle line comment | |
| `Ctrl+Shift+P` → `Rename Symbol` | Rename everywhere | Shows how widely something is used. |

> **Pro tip:** if a symbol has 40 references, don't read all 40. Use
> `Shift+Alt+F12`, look at the *count*, and move on.

---

## Reading order — 9 files, about 20 minutes

Read them in this order. Each one only makes sense after the previous.

### 1. `lib/contracts/types.ts` — what IS a project?

Open it. It's only data, no logic. This is the vocabulary for everything else.

```ts
export const PROJECT_STATUSES = ["pending", "approved", "rejected"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: string;
  ownerId: string;
  title: string;
  description: string;      // short one-liner for cards
  longDescription: string;  // long body
  repoUrl: string;
  liveUrl: string;
  tags: string[];
  organizationId: string | null;
  status: ProjectStatus;    // pending | approved | rejected
  createdAt: string;
  updatedAt: string;
}
```

**Notice:** `ProjectInput` is the same thing *minus* the fields the server
decides:

```ts
export type ProjectInput = Omit<
  Project,
  "id" | "ownerId" | "status" | "createdAt" | "updatedAt"
>;
```

That's a deliberate safety property — a user can never send their own
`status: "approved"` or someone else's `ownerId`. The type system prevents it.

> **Why this file is special:** it's the contract with your teammate. He writes
> the database, you write the app, and you *both* import this file so you can't
> disagree about what a project is.

---

### 2. `lib/validators/project.ts` — what counts as valid?

The rules for input, in one place.

```ts
export const projectInputSchema = z.object({
  title: z.string().trim()
    .min(3,  { error: "Title must be at least 3 characters" })
    .max(120,{ error: "Title must be 120 characters or fewer" }),
  repoUrl: httpUrl("repository", true),   // must be a real http(s) URL
  liveUrl: httpUrl("live", false),         // optional
  tags: z.array(tagSchema).max(5, { error: "Use at most 5 tags" }),
  // ...
});
```

**The key line for your teacher:**

```ts
export function parseOrFieldErrors(schema, value) {
  const result = schema.safeParse(value);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, fieldErrors: toFieldErrors(result.error) };
}
```

`safeParse` never throws — it returns success or failure. That's why this is
used in both the browser and the server without any try/catch.

---

### 3. `lib/data/store.ts` — how data is saved

The biggest file. Read only these parts:

**a) Which backend am I using?**

```ts
async function canWrite(): Promise<boolean> {
  if (writable !== null) return writable;          // cached: probe once
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_DIR, fs.constants.W_OK);
    writable = true;
  } catch {
    writable = false;   // read-only host, e.g. Vercel
  }
  return writable;
}
```

Three backends: file → Vercel Blob → memory. Search for `usesBlob()` to see it.

**b) The atomic write** — the fix for the data-loss bug:

```ts
async function writeAtomic(db: DbShape): Promise<void> {
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  try {
    await fs.rename(tmp, DB_FILE);      // atomic within a directory
  } catch {
    await fs.rm(tmp, { force: true }).catch(() => {});
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
    throw ...;
  }
}
```

**Why:** `writeFile` truncates the target first, so for a moment the file is
*half a document*. A read landing in that window fails to parse. Writing to a
temp file and renaming means a reader sees either the old file or the new one,
never a broken one.

**c) The queue** — why writes can't overlap:

```ts
export function withDb<T>(mutator: (db: DbShape) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    await persist(db);
    return result;
  });
  queue = run.then(() => undefined, () => undefined);  // keep the chain alive
  return run;
}
```

Everything chains onto `queue`. One write finishes before the next starts.

---

### 4. `lib/auth/index.ts` — the security gate ⭐ most important

```ts
export const getCurrentUser = cache(async (): Promise<AuthUser | null> =>
  authMode === "clerk" ? clerkUser() : localUser(),
);

export async function requireUser(returnTo?: string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}` : "/sign-in");
  }
  return user;
}
```

**Two things to understand here:**

1. `cache(...)` — React only runs this **once per page render**, even if three
   components call it. Without it, one page load would read the cookie and hit
   the database three times.

2. `requireUser()` **throws** (via `redirect`). That's why callers write:

```ts
const user = await requireUser();     // if this returns, you ARE logged in
```

The type is `Promise<AuthUser>`, not `AuthUser | null` — TypeScript knows that
if you got a value back, you're authenticated.

> **Search the project for `requireUser`** (`Ctrl+Shift+F`). Every protected page
> and every Server Action calls it. That's the whole security model.

---

### 5. `app/actions/projects.ts` — a write path

Every change to data goes through one of three files here. Look at create:

```ts
export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser();                      // 1. who are you?

  const parsed = parseOrFieldErrors(projectInputSchema, readInput(formData));
  if (!parsed.ok) {                                     // 2. is this valid?
    return { error: "Please fix the highlighted fields.",
             fieldErrors: parsed.fieldErrors };
  }

  const result = await createProject(user.id, parsed.data);   // 3. write
  if (!result.ok) return { error: result.error };

  revalidatePath("/dashboard");                          // 4. refresh the list
  redirect("/dashboard");                                // 5. go there
}
```

**Read this as a checklist.** Every action follows it:
1. Who are you?
2. Is the input valid?
3. Only then touch the data.

Note step 1 comes *first* — an unauthenticated request never even gets validated.

---

### 6. `app/(app)/dashboard/page.tsx` — a page is tiny

```ts
export default async function DashboardPage({ searchParams }) {
  const user = await requireUser();
  const [projects, query] = await Promise.all([
    getMyProjects(user.id),
    searchParams,
  ]);

  const filter = pick(first(query.filter), FILTERS, "all");
  const sort   = pick(first(query.sort),   SORTS,  "updated");

  return (
    <ProjectList projects={filterAndSortProjects(projects, filter, sort)} />
  );
}
```

**That's the whole page.** It checks login, fetches, and hands the data to a
component. All the visual work is in `components/dashboard/`.

The `pick(...)` helper is deliberate: `?sort=<script>` is user input, so unknown
values fall back to the default instead of throwing.

---

### 7. `components/ui/input.tsx` — the design system

The smallest reusable pieces. Look at `Field` and this comment, which explains a
subtle bug that was fixed:

```tsx
const FieldMessageContext = createContext<{ id?: string }>({});

const messageId =
  htmlFor && (error || hint) ? `${htmlFor}-field-message` : undefined;

// ...

<FieldMessageContext.Provider value={{ id: messageId }}>
  {children}
</FieldMessageContext.Provider>

{error ? (
  <p id={messageId} role="alert" className="text-xs text-rejected-fg">{error}</p>
) : hint ? (
  <p id={messageId} className="text-xs text-ink-3">{hint}</p>
) : null}
```

Then `Input` picks the id up from context. This exists because the obvious fix —
`cloneElement` the child to inject `aria-describedby` — silently does nothing
when the child is react-hook-form's `<Controller>`.

---

### 8. `app/globals.css` — all the colours

One place. Search for `--pj-accent`:

```css
:root {
  --pj-base:     #fcfcfd;
  --pj-surface:  #ffffff;
  --pj-ink:      #0c0c0f;
  --pj-accent:   #1f4bff;
}

[data-theme="dark"] {
  --pj-base:     #0b0b0e;
  --pj-surface:  #141418;
  --pj-ink:      #f4f4f6;
  --pj-accent:   #7d97ff;   /* lighter, because #1f4bff is unreadable on near-black */
}

@theme inline {
  --color-accent: var(--pj-accent);   /* exposes it to Tailwind */
  /* ... */
}
```

Dark mode is a **second authored palette**, not a filter. That's why it reads
properly rather than looking like an inverted screenshot.

---

### 9. `proxy.ts` — the front door

Short file. It runs before any page renders:

```ts
// Optimistic only: is a cookie present?
// It deliberately does NOT validate it.
```

**Why so cautious:** trying to be clever here caused an
`ERR_TOO_MANY_REDIRECTS` loop with stale cookies. The real validation is
`requireUser()`.

---

## Things that will confuse you, explained

**"Why is there a `(app)` folder — is that a URL?"**
No. Parentheses mean *grouping only*. `(app)/dashboard/page.tsx` → the URL is
just `/dashboard`. The group exists so signed-in pages can share one layout and
signed-out pages another.

**"Why does `[id]` have brackets?"**
That name comes from the URL. `app/(app)/dashboard/[id]/edit/page.tsx` handles
`/dashboard/prj_abc123/edit`.

**"Why does the form call `action(null, fd)`?"**
Server Actions are written for `useActionState`, which passes the previous state
first. The `null` is that unused previous state.

**"Where's the database code?"**
`lib/data/`. Your teammate replaces these three files and nothing else changes.

**"What does `"use client"` mean?"**
The file runs in the browser too, so it can hold state and handle clicks. Files
*without* it run only on the server — that's why `lib/auth/index.ts` (which
imports `cookies()`) must never have it.

---

## Search recipes

| Looking for | Search for |
| --- | --- |
| Every place that checks login | `requireUser(` |
| Every place data changes | `withDb(` |
| Every Server Action | `"use server"` |
| Where a field is validated | `projectInputSchema` |
| Where a colour is used | `--pj-` in `globals.css`, then `text-` / `bg-` in components |
| Which page uses a component | `Alt+F12` on the component name |
| All my own commits | `git log --oneline` in the terminal |

---

## If you only remember five things

1. **`lib/contracts/types.ts` defines the vocabulary** — everything else uses it.
2. **`lib/data/` owns the database.** Swapping it is your teammate's whole job.
3. **`requireUser()` is the gate.** Called by every page *and* every action.
4. **`app/actions/` is the only place that writes.** One place to audit.
5. **Build order was bottom-up** — types → store → validators → auth → actions →
   UI. Building the UI first means inventing things the data then disagrees with.