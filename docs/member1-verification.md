# Member 1 — Verification against the Definition of Done

Evidence from the plan's section 10, tested in a real browser against
`npm run dev` (Next.js 16.3.8, Chromium via Playwright). Not a checklist of
intent — each item below was executed and observed.

**Environment:** `npm run build` ✓ · `npx tsc --noEmit` ✓ 0 errors ·
`npx eslint .` ✓ 0 errors, 0 warnings · browser console 0 errors.

---

## Seven verification loops

Each loop was a full pass over a different concern, followed by a fix or an
explicit clean result. Six of the seven found real defects.

| # | Focus | Found |
| --- | --- | --- |
| 1 | Dark mode design, token split, contrast in dark | 4 dark-mode contrast failures (invisible button labels, status dots, dialog scrim, popover shadow) |
| 2 | Keyboard access, form semantics | Tag input became unreachable at 5 tags |
| 3 | Contrast in **light** mode | 17 elements failed WCAG AA on the dashboard alone |
| 4 | Token audit, hostile input, sort | Clean |
| 5 | **Write** path authorisation | Clean (this was the unproven path) |
| 6 | Corruption / resilience | Unreadable store bricked the whole app |
| 7 | Responsive sweep, 6 viewports | Clean |

### Loop 1 — native dark mode

A full dark palette rather than a filter: surfaces lift as they come forward
(`#0b0b0e` → `#1c1c22` → `#141418`), borders gain contrast, the accent lightens
to `#7d97ff` because `#1f4bff` is unreadable on near-black, and each status pair
swaps to a dark tint with a brighter foreground.

Four things were broken by the first attempt and are worth recording, because
none of them would have shown up in a type check:

- Primary buttons used a hardcoded `text-white`. In dark mode `--pj-ink` is
  near-white, so the label was invisible. Fixed with an `--pj-on-ink` token
  that inverts per theme.
- The status badge dot was `bg-current` at 70% opacity, which lost contrast
  against dark tints and stopped reading as a state marker. Now uses dedicated
  dot tokens.
- The dialog scrim used `backdrop:bg-ink/40`, which cannot reach the
  `::backdrop` pseudo-element — the utility silently did nothing.
- A dark shadow on a dark surface is invisible, so the popover shadow is now a
  real shadow rather than the light-mode token.

`ThemeToggle` cycles system → light → dark and persists to `localStorage`.
State is read with `useSyncExternalStore` rather than `useState` + effect
(localStorage is an external store, and the effect version had to `setState`
inside an effect, which React 19's lint rules reject). `ThemeScript` applies the
stored theme in `<head>` before first paint, so dark-mode visitors do not get a
white flash. "System" is a live state: it subscribes to the OS preference.

Verified: the toggle cycles and persists; system mode tracks an emulated OS
preference in both directions.

### Loop 2 — keyboard access

The tag input disabled its text field once five chips existed. A disabled input
is removed from the tab order and ignored by assistive technology, so after the
fifth tag the field silently became unreachable and there was no documented way
back except guessing which chip to remove.

The input now stays enabled and the handler still declines to exceed the limit.
Verified: five chips render, a sixth attempt is refused, `disabled` is `false`,
and the live region reads "Maximum 5 tags. Remove one to add another."

Also clean: 17/17 focusable controls have an accessible name; none under
24×24 px (WCAG 2.5.8) outside exempt inline prose links; heading order, label
association, `alt` and `lang` correct on all three authenticated screens.

### Loop 3 — contrast in light mode

Loop 1 only swept dark mode, where tertiary ink measures 5.4:1. On light it
measures **3.34:1** — an AA failure. That is the most-used colour in the
product: every timestamp, repo URL, stat-tile label and helper line, at 12–13px
where the threshold is 4.5:1, not 3:1.

`--pj-ink-3` darkens to `#6c6c76` in the light palette. It still reads as muted
against `--pj-ink` and `--pj-ink-2`, so the hierarchy survives.

Re-swept both themes across all three screens: **331 text elements, 0 failures.**

### Loop 4 — tokens and hostile input

- 26 of 26 token utilities referenced in source resolve in the built CSS.
  (`bg-accent` was flagged by the audit script but has no call site; the accent
  is only ever `text-accent` / `bg-accent-soft` / `border-accent`.)
- Every hex in the bundle is a declared token value — no drift between the
  stylesheet and the canvas.
- Hostile query params (`?sort=<script>&filter='`) fall back to the defaults
  and still render 6 rows. Nothing is injected.
- All three sort orders return correctly ordered rows, and the select reflects
  the URL.

### Loop 5 — the write path

Earlier loops proved a second account could not **read** another member's
project. This proved the same for **write**, which is the check that matters:

1. Signed in as the demo user, opened the edit page, recovered the real
   `$ACTION_ID` from the rendered form.
2. Signed in as a different account in the same browser.
3. POSTed that action id with a hijack payload — `title: "HIJACKED BY
   ATTACKER"`, `repoUrl: https://evil.example/x`, and the owner's project id.
4. Read `.data/db.json` afterwards.

Result: title and repoUrl **unchanged**. The forged write was rejected. The
owner is resolved from the server-side session inside the action, so the
`projectId` in the payload carries no authority; the ownership check inside
`updateProject` then fails closed.

### Loop 6 — corruption resilience

Deliberately corrupted `.data/db.json` two ways.

`readDb()` called `JSON.parse` on whatever was on disk, so invalid JSON threw
on every subsequent request: one bad byte turned the whole app into "This page
couldn't load" with no route back in through the UI. Because the file *is* the
database at this stage, that is unrecoverable for anyone who does not know to
delete the file by hand.

Now handled: invalid JSON re-seeds; valid-JSON-wrong-shape also re-seeds
(checked `projects`/`accounts` are arrays, so a half-written object fails there
rather than deep inside a query); a missing file was already handled. A bad file
now costs the demo data and nothing else.

### Loop 7 — responsive

Measured `scrollWidth` vs `clientWidth` and swept every element for bounds
crossing the viewport, on four routes at **320, 390, 768, 1024, 1440 and
1920px**.

Result: **0px overflow and 0 offending elements on all 24 combinations.** Also
checked the tall-and-narrow case where a sticky form footer usually misbehaves:
at 320×568 the forms scroll ~1186px, the footer does not overlap the last
input, and scrolling to the end reaches it.

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

**Edit-form prefill.** A cold load of `/dashboard/[id]/edit` painted empty
inputs that filled in on hydration, because react-hook-form's `defaultValues`
never reach the server-rendered HTML. Fixed by passing `defaultValue`
alongside `register()` on the affected fields. Verified by fetching the raw HTML
and confirming `value="Orbit Sync"` is present before any JavaScript runs.

### 2. Protected routes correctly block unauthenticated access

| Check | Result |
| --- | --- |
| Guest → `/dashboard` | 307 to `/sign-in?next=%2Fdashboard` |
| Guest → `/settings` | Redirected to sign-in |
| Destination preserved | `?next=` round-trips back to the original route after sign-in |
| Signed-in visitor → `/sign-in` or `/sign-up` | Bounced to `/dashboard` |
| Stale cookie (session deleted server-side) | Renders the sign-in form — no loop |

Enforced twice on purpose: `proxy.ts` gives a clean redirect (cookie presence
only — it never touches the database, because it runs on every request including
prefetches), and `requireUser()` in `lib/auth/index.ts` is the authoritative
check that every protected page calls. The check lives in the data-access layer
rather than in a layout because a layout does not re-render on navigation and so
cannot be trusted to guard a route alone.

**Serious bug found and fixed during this test — an infinite redirect loop.**
The first version of `proxy.ts` also redirected an *authenticated* visitor away
from `/sign-in`, and that deadlocked with `requireUser()`:

```
stale cookie → /dashboard passes proxy → requireUser() → /sign-in
             → proxy sees the cookie → /dashboard → requireUser() → …
```

Observed as `ERR_TOO_MANY_REDIRECTS`. This would have hit any real user whose
session expired or was revoked while the cookie was still in their browser — not
an edge case. The cause is that cookie *presence* cannot distinguish a valid
session from a stale one, so the two checks could disagree. The bounce now lives
in `app/(auth)/layout.tsx`, which resolves the session properly. Both behaviours
were re-verified afterwards.

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
project the caller does not own. The owner is always resolved from the
server-side session, never from submitted form data.

**The write path was verified separately in loop 5** by replaying the owner's
own server-action id from a different session with a hijack payload — the record
came back byte-identical. `updateProject` and `deleteProject` independently
re-check `ownerId` inside the write, so the failure is closed at the data layer
and not merely hidden in the UI.

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
| Responsive UI checked | ✓ — 0px overflow at 6 viewports across 4 routes |
| Production build succeeds | ✓ |
| Error states handled | `error.tsx` with Next 16's `retry`, `not-found.tsx`, two distinct empty states, corrupt-store recovery |

## Responsive

Loop 7 widened the sweep. Measured `documentElement.scrollWidth - clientWidth`
and swept every element for bounds crossing the viewport edge, on four routes:

| Viewport | `/dashboard` | `/dashboard/new` | `/settings` | `/sign-in` |
| --- | --- | --- | --- | --- |
| 320px | 0px | 0px | 0px | 0px |
| 390px | 0px | 0px | 0px | 0px |
| 768px | 0px | 0px | 0px | 0px |
| 1024px | 0px | 0px | 0px | 0px |
| 1440px | 0px | 0px | 0px | 0px |
| 1920px | 0px | 0px | 0px | 0px |

Zero overflow and zero offending elements across all 24 combinations. The only
elements a clipping heuristic flags are the two `sr-only` live-region labels,
which are clipped on purpose for screen readers.

The nav degrades deliberately: the wordmark collapses to the badge, the avatar
appears from 360px up, and Sign out becomes an icon-only button — which is what
makes 320px fit without clipping the account control. At 320×568 the long forms
scroll ~1186px, the sticky footer does not overlap the last input, and scrolling
to the end reaches it.

**Fixed during this test:** the sticky form footer used `-mx-4 sm:-mx-6` to break
out to the full content width, but the form column is clamped to 720px, so the
bar overhung the section rules by 24px per side. Negative margins removed in
both `project-form.tsx` and `profile-form.tsx`; the bar now sits inside the
column and the buttons align with the field edges.

---

## Cold start

Simulated a fresh clone by deleting `.data/` entirely while the dev server kept
running, with a stale cookie still in the browser:

| Check | Result |
| --- | --- |
| Store auto-created and seeded | 6 projects across all three states |
| Stale cookie on `/sign-in` | Sign-in form renders (no loop) |
| Demo sign-in against the fresh store | Lands on the dashboard, tiles read 6 / 2 / 3 / 1 |

So a new member only needs `npm install && npm run dev`.

## Accessibility and semantics

| Check | Result |
| --- | --- |
| Project row is a single link | 1 anchor per row, hit-testing over the title, description, tags and badge all resolve to that anchor |
| Nested interactive elements | 0 buttons inside the row anchor (previously 1 — invalid HTML) |
| Focusable controls with a name | 17 / 17 |
| Target size (WCAG 2.5.8) | No control under 24×24px outside exempt inline prose links |
| Invalid inputs | `aria-invalid` set, messages in `role="alert"` |
| Tag input at the limit | Stays focusable; limit enforced by the handler, not by disabling the field |
| Delete confirmation | Native `<dialog>` via `showModal()`, so focus trapping, Esc and background inertness come from the platform |
| Contrast, both themes | 331 text elements, 0 WCAG AA failures |
| Heading order / labels / alt / lang | Correct on all three authenticated screens |
| Console | 0 errors, 0 application warnings |

## Not verified, and why

- **Real PostgreSQL / Drizzle.** Member 3 owns it. `lib/data/*` is the seam; the
  swap procedure is in the README.
- **Real Clerk.** No account or keys available, so auth ran on the local
  provider throughout. The Clerk path is wired and detected at runtime but has
  not been executed.
- **Admin moderation.** Member 3's screen. Member 1's side is verified only in
  that a submission correctly starts as `pending` and a member cannot alter it.
- **Screen-reader pass.** Semantics were checked structurally in the DOM and by
  computed properties, not with an actual assistive technology.
- **Automated a11y tooling.** No axe or Lighthouse run; the checks above are
  hand-written audits and would not catch everything a dedicated tool would.

## Design / code parity

The Organisation field is free text in both the code and the Pencil design
(frames `cvkux` and `tZNGA`). It was originally a `<select>` containing three
invented company names, which would have presented fabricated data as real. When
Member 3's Organisations table lands, swap it for a populated select and change
`organizationId` to hold an id.

The design also drops the GitHub brand glyph from the "Continue with GitHub"
button, because `lucide-react` v1 removed all brand icons and the shipped button
is plain text.
