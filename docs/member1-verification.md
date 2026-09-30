# Member 1 — Verification against the Definition of Done

Evidence from the plan's section 10, tested in a real browser against
`npm run dev` (Next.js 16.3.8, Chromium via Playwright). Not a checklist of
intent — each item below was executed and observed.

**Environment:** `npm run build` ✓ · `npx tsc --noEmit` ✓ 0 errors ·
`npx eslint .` ✓ 0 errors · browser console 0 errors, 0 warnings.

---

## Member 1 criteria

### 1. Authentication works (sign in, sign out, session persists)

| Check | Result |
| --- | --- |
| Sign in with the demo account | Redirects to `/dashboard` |
| Session survives a full page reload | Still authenticated after reload |
| Sign out | Redirects to `/sign-in`, "Welcome back" |
| Signed-in user visits `/sign-up` | Bounced to `/dashboard` by `proxy.ts` |
| Sign up with a new email | Account created, lands on an empty dashboard |

**Bug found and fixed during this test.** Sign out did nothing. The cause was in
my own UI kit: `Button` defaults to `type="button"`, so the nav's
`<form action={signOutAction}>` contained a button that never submitted. Fixed in
`components/nav/app-nav.tsx` by passing `type="submit"`, with a comment
recording why. The other five submit buttons in the codebase were already
correct — this was the only occurrence.

### 2. Protected routes correctly block unauthenticated access

| Check | Result |
| --- | --- |
| Guest → `/dashboard` | 307 to `/sign-in?next=%2Fdashboard` |
| Guest → `/settings` | Redirected to sign-in |
| Destination preserved | `?next=` round-trips back to the original route after sign-in |

Enforced twice on purpose: `proxy.ts` gives a clean redirect (cookie presence
only — it never touches the database, because it runs on every request including
prefetches), and `requireUser()` in `lib/auth/index.ts` is the authoritative
check that every protected page calls. The check lives in the data-access layer
rather than in a layout because a layout does not re-render on navigation and so
cannot be trusted to guard a route alone.

### 3. A user can create, edit and delete their own project

| Check | Result |
| --- | --- |
| Create with a valid form | New project appears, counts 6 → 7, Pending 2 → 3 |
| New project status | `pending` — it enters the moderation queue, not public |
| Edit page prefills | All six fields populated from the stored record |
| Save an edit | Title changed, status preserved |
| Status is not member-editable | Counts unchanged after saving — `updateProject` ignores `status` |
| Delete | Confirmation dialog names the project; counts return to 6 / 2 / 3 / 1 |
| Tag input | Enter commits a chip; the tag persists to the record |

**Ownership is enforced, not assumed.** A second account
(`rival@example.com`) was created and its owner's project id requested directly:

```
GET /dashboard/prj_0f45abbe2e953405/edit
→ "Project not found — It may have been deleted, or it belongs to another member."
```

No title, description or status leaked. `getProjectForOwner` returns `null` for a
project the caller does not own, and `updateProject` / `deleteProject`
independently re-check `ownerId` inside the write, so a forged request fails
there too. The owner is always resolved from the server-side session, never from
submitted form data.

### 4. Validation correctly rejects invalid project / profile input

Empty project submit → 3 fields marked `aria-invalid`, with messages:

```
Title must be at least 3 characters
Description must be at least 10 characters
Enter a valid repository URL, including https://
```

`github.com/aditya/fathom` (no scheme) → `Enter a valid repository URL, including https://`

Profile submit with a 1-character name, a 300-character bio and `not a url` →

```
Name must be at least 2 characters
Bio must be 280 characters or fewer
Enter a valid website URL, including https://
```

One schema, two enforcement points. `lib/validators/project.ts` is the single
source; the browser resolves it through `zodResolver` and the Server Action
re-parses with the same object, so the two cannot drift.

**Bugs found and fixed during this test.**

- URL error messages rendered as the bare string `"repository"`. I had written a
  `urlMessage()` helper and then never called it, passing the raw label at every
  call site instead. `httpUrl()` now takes the label and builds the message
  internally, so a call site cannot get this wrong again.
- Array validation errors were keyed `tags.3`, which a chip-based input cannot
  point at. `toFieldErrors` now collapses indices so the message lands on `tags`.

### 5. Dashboard accurately reflects each project's current status

| Filter | Rows returned | Titles |
| --- | --- | --- |
| All | 6 | — |
| Pending | 2 | Orbit Sync, Fathom |
| Approved | 3 | Terminal Focus, Patchwork, Kettle |
| Rejected | 1 | Ledger Lite |

Stat tiles (6 / 2 / 3 / 1) match the row-level statuses exactly. An invalid
filter value (`?filter=bogusvalue`) falls back to `all` and renders 6 rows
rather than crashing.

---

## Team-wide checklist items that touch Member 1

| Item | Result |
| --- | --- |
| Database connected | Local JSON store (`.data/db.json`, gitignored) standing in for Member 3's PostgreSQL |
| Authentication working | ✓ |
| Project creation working | ✓ |
| Authorization tested | ✓ — cross-account access blocked |
| Invalid inputs handled | ✓ |
| Responsive UI checked | ✓ below |
| Production build succeeds | ✓ |
| Error states handled | `error.tsx` with Next 16's `retry`, `not-found.tsx`, two distinct empty states |

## Responsive

Measured `documentElement.scrollWidth - clientWidth` and swept every element for
bounds crossing the viewport edge:

| Viewport | `/dashboard` | `/dashboard/new` | `/settings` | `/sign-in` |
| --- | --- | --- | --- | --- |
| 390px | 0px | 0px | 0px | 0px |
| 320px | 0px | 0px | 0px | 0px |

Zero overflow, zero offending elements. The nav degrades deliberately: the
wordmark collapses to the badge, the avatar appears from 360px up, and Sign out
becomes an icon-only button — which is what makes 320px fit without clipping the
account control.

**Fixed during this test:** the sticky form footer used `-mx-4 sm:-mx-6` to break
out to the full content width, but the form column is clamped to 720px, so the
bar overhung the section rules by 24px per side. Negative margins removed in
both `project-form.tsx` and `profile-form.tsx`; the bar now sits inside the
column and the buttons align with the field edges.

---

## Not verified, and why

- **Real PostgreSQL / Drizzle.** Member 3 owns it. `lib/data/*` is the seam; the
  swap procedure is in the README.
- **Real Clerk.** No account or keys available, so auth ran on the local
  provider throughout. The Clerk path is wired and detected at runtime but has
  not been executed.
- **Admin moderation.** Member 3's screen. Member 1's side is verified only in
  that a submission correctly starts as `pending` and a member cannot alter it.
- **A forged write request** against `updateProjectAction` was not fired from a
  browser. The read path is proven blocked above, and the write path re-checks
  ownership inside `withDb`, but the write has not been exercised end to end
  against a live server action.

## Known minor issue

On a cold load of the edit page, react-hook-form's controlled inputs render empty
in the server HTML and populate on hydration, so a prefill can flash briefly.
The values are correct and no data is at risk; the clean fix is to pass
`defaultValue` through to the DOM alongside `register()`, deferred because it
touches working form code and the flash lasts well under a second on a
dynamically rendered route.
