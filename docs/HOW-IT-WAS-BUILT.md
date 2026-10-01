# How it was built — the file structure, and the order

Two parts. Part 1 is the explanation so you actually understand it. Part 2 is
the 20-second version to say out loud.

---

# PART 1 — The explanation

## A. How I started

The real order matters, because it's the order that stops you wasting time.

### Step 1 — Empty project
Started from Next.js's official template. That gave me folders, config and a
"hello world" I deleted. Nothing of mine yet.

### Step 2 — Data before screens ⚠️ the important bit
**This is the decision that made the rest easy.** I did *not* start by building
the sign-up page.

I started at the bottom, because the screens have to know what a "project" is:

```
1. lib/contracts/types.ts    what a Project IS (fields, types)
2. lib/data/store.ts         how data is saved and read
3. lib/data/projects.ts      the actual queries
4. lib/validators/           what counts as valid input
5. lib/auth/                 how someone signs in
6. app/actions/              the functions that change data
```

**Why this order:** if you build the screen first, you invent field names like
`userName` and `desc`, then the database disagrees with you, and you rewrite the
screen. Doing the data first means the screen has nothing left to decide.

### Step 3 — Reusable UI pieces
`components/ui/` — a Button, an Input, a Field. Built once, used everywhere.
Same reason: never write the same button five times.

### Step 4 — Pages
`app/` — one file per page. Each page is tiny: check who's logged in, fetch
data, hand it to a component.

### Step 5 — Polish
Design tokens, dark mode, accessibility.

### Step 6 — Break it on purpose
17 rounds of tests trying to break it. This found the real bugs.

### What git actually shows
Honest detail you can mention: the app went in as **one large commit**, then
every commit after that was a **fix**. That is the real workflow — build, then
repeatedly break and repair. 23 commits total.

---

## B. The file structure

### The core idea: three zones

```
app/        →  WHAT the user sees (pages)
components/ →  HOW it looks (reusable pieces)
lib/        →  THE RULES (data, validation, security)
```

**Nothing in `app/` or `components/` writes data.** Only `app/actions/` does.
That one rule is the whole security story.

---

### `lib/` — the rules (this is the important folder)

```
lib/
├── contracts/types.ts     ← defines what a Project IS
├── validators/
│   └── project.ts         ← what valid input looks like
├── data/
│   ├── store.ts           ← saves and reads the file
│   ├── projects.ts        ← get my projects, create, update, delete
│   └── profile.ts
└── auth/
    ├── index.ts           ← requireUser()  ← THE SECURITY GATE
    ├── service.ts         ← checks the password
    ├── session.ts         ← the login cookie
    └── schemas.ts         ← login/signup rules
```

**`contracts/types.ts` is deliberately shared with my teammate.** He writes the
database, I write the app — and we both import the same file. That's how we can't
disagree about what a project is.

---

### `app/` — the pages

```
app/
├── layout.tsx              runs on EVERY page (fonts, theme, skip link)
├── (auth)/                 pages you see when logged OUT
│   ├── sign-in/
│   └── sign-up/
├── (app)/                  pages you see when logged IN
│   ├── dashboard/
│   │   ├── page.tsx        the list        ┐
│   │   ├── new/            create          │ all tiny — they fetch
│   │   └── [id]/edit/      edit            │ data and pass it on
│   └── settings/           profile
├── actions/                ← THE ONLY PLACE DATA CHANGES
│   ├── auth.ts             sign in/out
│   ├── projects.ts         create/update/delete
│   └── profile.ts
└── globals.css             all colours live here
```

**The brackets mean something:**
- `(auth)` and `(app)` — brackets = folder groups, **not** part of the URL. So
  `(app)/dashboard/page.tsx` is just `/dashboard`. The group is there only to
  apply a shared layout.
- `[id]` — this folder name becomes the URL. So `/dashboard/prj_abc/edit`.
- `proxy.ts` (at the project root) — runs before any page, redirects signed-out
  visitors to sign-in.

**Why pages are tiny:** a page should not contain logic. If `/dashboard/page.tsx`
had 200 lines, you couldn't tell data-fetching from display. Mine just: check
login → get data → render.

---

### `components/` — how it looks

```
components/
├── ui/         button, input, field, badge  ← used by everything
├── auth/       sign-in form, sign-up form
├── dashboard/  project list, stat tiles, filter
├── project/    project form, tag input, delete dialog
├── profile/    profile form
└── nav/        top bar
```

Split by feature, not by type. Everything about projects lives in
`components/project/`. Easier to find, easier for my teammate to work in
without touching my files.

---

## C. What happens when you press "Create project"

The single most useful thing to understand:

```
   you press the button
          │
          ▼
   1. BROWSER checks the form        ← same rules, instant feedback
          │
          ▼
   2. app/actions/projects.ts
      • requireUser()   →  who are you?
      • Zod check       →  is this valid?
          │
          ▼
   3. lib/data/store.ts
      • queue the write (so two saves can't overlap)
      • write to a temp file, then rename
          │
          ▼
   4. redirect back to the dashboard
```

Notice: **steps 2 and 3 are on the server.** The browser can see the button, but
it cannot skip the checks. That's why it's safe.

---

# PART 2 — Say it short

### 20 seconds

> "The code is in four folders. `app` has the pages, `components` has the
> reusable pieces, `lib` has the rules — data, validation and security — and
> `app/actions` is the only place that can change anything. I built it bottom-up:
> data first, then the screens, so the screens never had to invent anything."

### 40 seconds, if they want the order

> "I started from an empty Next.js template, then deliberately built from the
> bottom up. First what a project *is*, then how it's saved, then the validation
> rules, then login, then the functions that write. Only then the screens — so
> the UI had nothing left to decide. Then polish, then 17 rounds of trying to
> break it, which is where the real bugs came from."

### If they ask about the folder split

> "Three zones: `app` for pages, `components` for how things look, `lib` for the
> rules. The rule I held to is that only `app/actions` writes to the database —
> so there's one place to audit for security rather than fifty."

### If they ask why brackets

> "In Next.js, a folder in brackets like `[id]` means that name comes from the
> URL, and a folder in parentheses like `(app)` is just a grouping — it doesn't
> appear in the URL. I used the group so signed-in and signed-out pages could
> have different layouts from the same file names."

---

## The three things worth remembering

1. **Data first, screens second.** Building the UI first means inventing things
   the database then disagrees with.

2. **Only one folder writes data.** One place to check security.

3. **Then you try to break it.** The best bug I found — the one wiping the
   database — was invisible to every tool and only showed up when I fired 40
   simultaneous saves at it.