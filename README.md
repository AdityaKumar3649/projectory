# Projectory — Member 1

**Authentication, User & Project Management** (the plan's "User Module").

A platform for developers, students and indie makers to publish the projects they
have built. This repository contains Member 1's half: signing in, a profile, and
creating / editing / deleting your own projects while tracking their review status.

---

## Quick start

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>. There is nothing to configure — no database to
provision, no API keys to fetch, no accounts to create.

**Demo account**

| Field    | Value                  |
| -------- | ---------------------- |
| Email    | `demo@projectory.app`  |
| Password | `projectory`           |

It is seeded with six projects across all three review states, so the dashboard
shows real data rather than a wall of empty states. Or sign up with any email and
password (8+ characters) to get an empty account.

---

## What is in here

| Screen                | Route                    | Notes                                        |
| --------------------- | ------------------------ | -------------------------------------------- |
| Sign in               | `/sign-in`               | Preserves `?next=` so you land where you meant |
| Sign up               | `/sign-up`               |                                              |
| Dashboard             | `/dashboard`             | Your projects, filterable by review status    |
| Create project        | `/dashboard/new`         |                                              |
| Edit project          | `/dashboard/[id]/edit`   | Owner-only; includes the delete danger zone   |
| Profile / settings    | `/settings`              | Public details, links, account, sign out      |

Guests hitting `/dashboard` or `/settings` are redirected to sign-in by
`proxy.ts`, and again by `requireUser()` — the second check is the real one.

---

## The one architectural decision worth understanding

The team plan gives Member 3 the database and all the Server Actions, and gives
Member 1 the screens that consume them. Member 3 is not available yet, so this
half would otherwise be unbuildable and undemoable.

So every piece of data access sits behind **`lib/data/`**, written to the exact
function signatures the plan specifies:

```ts
createProject(ownerId, input)      updateProject(ownerId, id, input)
deleteProject(ownerId, id)         getMyProjects(ownerId)
getProfile(userId)                 updateProfile(userId, input)
```

No component, form or page imports `lib/data/` directly for its own logic — they
go through Server Actions in `app/actions/`, which resolve the owner from the
**server-side session** and call into `lib/data/`.

Behind `lib/data/` sits a small JSON store (`.data/db.json`, gitignored) that
hashes passwords with scrypt and keeps server-side sessions. It exists only so the
UI is runnable today. Delete `.data/` at any time and it re-seeds itself on the
next request.

### When Member 3's backend lands

1. Delete `.data/db.json` and `lib/data/store.ts`.
2. Reimplement the exports in `lib/data/projects.ts` and `lib/data/profile.ts`
   against Drizzle. **Keep the signatures identical.**
3. Nothing else changes. No page, form or component needs to be touched.

`lib/contracts/types.ts` is the single place the `Project` shape is written down.
When Member 3's Drizzle schema exists, re-export his inferred types from there
rather than editing call sites.

### Shared files with Member 3

Per the plan, Member 1 drafts these collaboratively rather than Member 3 owning
them alone, so the browser and the server cannot drift apart:

- `lib/validators/project.ts` — `projectInputSchema` and `profileInputSchema`
- `lib/contracts/types.ts` — the `Project` / `UserProfile` shapes

Member 3 should **import** these in his Server Actions, not redeclare them.

### One more thing when the backend lands

`organizationId` is currently free text (a company name) and the form field is a
plain input rather than a dropdown. There is no Organisations table yet, so a
select would have meant inventing company names. When the table lands, swap the
input in `components/project/project-form.tsx` for a populated select and change
`organizationId` to store an id.

---

## Deploying

Works on any Node host. Vercel is the easiest because it detects Next.js.

```bash
npx vercel          # preview
npx vercel --prod   # production
```

No environment variables are required. The app boots with no configuration.

### Option B: a public URL with no account at all

If you just need a link for a day, a Cloudflare quick tunnel needs no sign-up:

```bash
npm run build
npx next start -p 3001
cloudflared tunnel --url http://localhost:3001 --no-autoupdate
```

It prints a `https://<random>.trycloudflare.com` URL immediately. Because the
app runs on your own machine, the file store is writable, so data persists
normally — the read-only caveat below only applies to real serverless hosts.

Trade-offs: the URL is random each run, the tunnel dies if the process or the
machine stops, and anyone with the link can sign up. Treat it as a demo link,
not a permanent home.

**Windows note:** if `cloudflared` is not on your PATH, grab it once from
<https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/>
or run
`Invoke-WebRequest https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe -OutFile cloudflared.exe`.

### Serverless caveat

The local store writes to `.data/`, and serverless hosts (Vercel, Netlify,
Cloudflare Workers) ship a read-only filesystem. `lib/data/store.ts` probes for
a writable directory once and falls back to an in-memory store, so the app works
unmodified — verified by simulating `EROFS`. The consequence there is that
**data is per-instance and resets when the instance recycles**: a project you
create may vanish a few minutes later, and a session cookie stops resolving
after a cold start. Fine for a day-long demo, and exactly what Member 3's
PostgreSQL layer replaces.

### Before you share a link

- The demo login is `demo@projectory.app` / `projectory` and is printed on the
  sign-in page. That is deliberate for a demo, so do not put anything private in
  it.
- Anyone can sign up and create their own projects. That is the intended
  behaviour of the User Module.
- `.data/`, `.env*` and `next-env.d.ts` are gitignored, and only tracked files
  are uploaded, so no local data or secrets are included. Verified.

---

## Known gaps

- The Organisation field is free text, pending Member 3's table (above).
- Real Clerk and real PostgreSQL are wired but not exercised here — see
  `docs/member1-verification.md` for exactly what was and was not tested.

---

## Enabling Clerk

The target stack uses Clerk. It needs an external account, so until keys exist
the app uses a local credentials provider instead. To switch over:

1. Create a free account at <https://clerk.com> and create an application.
2. Copy `.env.example` to `.env.local` and set both keys:

   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

3. Restart the dev server.

`lib/auth/index.ts` detects the keys and `authMode` flips from `"local"` to
`"clerk"`. `components/auth/providers.tsx` mounts `ClerkProvider` at that point,
and the sign-in / sign-up pages are the only two places that need their `<SignIn>`
/ `<SignUp>` components swapped in. Nothing else branches on the provider.

Local auth is then dead code and can be removed: `lib/auth/service.ts`,
`lib/auth/session.ts` and the `LOCAL` half of `lib/auth/index.ts`.

---

## Design system

Tokens live in `app/globals.css` inside a Tailwind v4 `@theme` block, and the
source-of-truth design is the pen.dev canvas frame **"Projectory — Design
System"**. The two are kept in sync deliberately — if you change a value in one,
change it in the other.

Near-monochrome surfaces, **one** accent (`--color-accent`), and colour reserved
strictly for review status. Buttons are pill-shaped and get their definition from
a 1px border, never a drop shadow. The only shadow in the system is `shadow-pop`,
used by the delete dialog.

Generated utilities: `bg-base` `bg-surface` `bg-sunken` `border-hairline`
`border-line` `text-ink` `text-ink-2` `text-ink-3` `text-accent` `bg-accent-soft`
`bg-pending` `text-pending-fg` `bg-approved` `text-approved-fg` `bg-rejected`
`text-rejected-fg` `rounded-pill` `rounded-input` `rounded-card` `font-mono`.

---

## File ownership (to avoid merge conflicts)

Member 1 owns these outright. **Members 2 and 3 should not edit them:**

- `proxy.ts` · `app/layout.tsx` · `app/globals.css`
- `app/(auth)/**` · `app/(app)/**` · `app/actions/**`
- `components/ui/**` · `components/auth/**` · `components/nav/**`
- `components/dashboard/**` · `components/project/**` · `components/profile/**`
- `lib/**`

Member 3 owns `db/`, `drizzle/`, and `lib/actions/*`. Note the deliberate split:
Member 1's Server Actions live in `app/actions/*`, Member 3's in `lib/actions/*`.

---

## Definition of Done

From the plan, section 10:

- [x] Authentication works — sign in, sign out, session persists across refresh
- [x] Protected routes block unauthenticated access
- [x] A user can create, edit and delete their own project — and only their own
- [x] Validation rejects invalid project and profile input
- [x] The dashboard accurately reflects each project's current status

Verification notes are in [`docs/member1-verification.md`](docs/member1-verification.md).

---

## Notes on this version of the stack

Next.js 16 renamed `middleware.ts` to **`proxy.ts`** and moved to Turbopack by
default. `cookies()`, `headers()`, `params` and `searchParams` are all async and
must be awaited. `revalidateTag` now takes a second argument. Auth checks live in
`lib/auth/index.ts` rather than in a layout, because a layout does not re-render
on navigation and so cannot be trusted to guard a route on its own.
