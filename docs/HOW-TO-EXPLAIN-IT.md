# Explaining Projectory — how to talk about it

Read this once before you present. It is written so you can say the sentences
out loud. Nothing here needs to be memorised word for word.

Live URL: **https://former-vehicles-porcelain-surname.trycloudflare.com**
Login: **demo@projectory.app** / **projectory**

---

## 1. The 30-second version

> "Projectory is a place to publish what you build. It has accounts, a profile,
> and full create / edit / delete on projects, with a review status that only a
> moderator can change.
>
> I built the whole thing from scratch with Next.js — auth, profile, projects,
> the design system and both colour themes. It runs live on that URL.
>
> The hard part wasn't the screens, it was making sure the data couldn't be
> corrupted or the passwords couldn't leak. I found seven real bugs doing that,
> including one where the database was deleting itself."

That is a complete, honest answer. Everything below is detail for follow-ups.

---

## 2. The 2-minute version

**What it does.** Log in, fill in a profile, add projects. Each project has a
title, description, links and tags. Projects start as `pending`, and only a
moderator can approve or reject them. Approved projects show publicly.

**How it's built.** Next.js 16 with the App Router. I used Server Components so
pages render on the server, and Server Actions for every write. The database is
currently a JSON file, but it sits behind a small interface so it can be swapped
for PostgreSQL without touching any page.

**The team split.** Three of us. I own auth, profile and project management.
Another member owns the database and the admin moderation screen. We agreed to
share exactly two things: the validation rules and the data types. That's why
`lib/validators/` and `lib/contracts/types.ts` are deliberately co-owned — my
forms and his database functions both read from the same file, so they can't
disagree about what a valid project is.

**What I verified.** I didn't just build it, I attacked it. I wrote scripts that
try to corrupt the database, inject code, and break the forms, and I checked
accessibility and colour contrast automatically. That's how I found the seven
bugs in the next section.

---

## 3. The seven bugs — your strongest material

Teachers respect this far more than a feature list. Say: *"the most interesting
part was finding these."*

### 1. The database was deleting itself ⚠️ the best one

**Symptom.** The server log printed a warning over and over:

```
[projectory] Local store was unreadable and has been re-seeded.
```

Fifteen times in a row. Each one wiped the user's data and replaced it with
demo data.

**Why.** Two mistakes compounding:
- Pages read the database *outside* the lock that protects writes, so a page
  load could happen in the middle of a save.
- Writing a file isn't atomic — the system truncates it to zero and then writes,
  so for a brief moment the file is half a document. A read landing in that
  moment can't be parsed, and my recovery logic assumed "unparseable" meant
  "corrupt", so it threw the data away.

**Fix.** Write to a temporary file and then *rename* it — renaming inside a
folder is atomic, so a reader sees either the old file or the new one, never a
torn one. And instead of destroying data on a parse failure, keep the last
version I know was good and fall back to that.

**Proof.** I wrote a test that fires 40 saves and 200 reads at the same instant:

```
after 40 writes  : 46 (expected 46)
races on disk    : 40/40
failed reads     : 0
re-seed events   : 0
```

### 2. The password could appear in the URL

A `<form>` with no `action` attribute defaults to **GET**. If you submitted
before the JavaScript finished loading, the browser navigated to:

```
/sign-in?email=someone@x.com&password=hunter2
```

The password in the address bar, the browser history, and every proxy log
between the user and the server. Fix: every form now carries its Server Action
as its `action`. I verified with JavaScript switched off entirely.

### 3. A validation rule that didn't work

I'd written `z.email().trim().toLowerCase()` expecting it to tidy up an email.
In Zod 4 the format check runs *first*, so the trimming only ever saw input that
had already passed. Any email pasted with a trailing space was rejected with
"Enter a valid email address". Fixed by normalising first, then validating.

### 4. Error messages screen readers couldn't read

When a field failed, I showed the error with `role="alert"`, so it was announced
once when it appeared. But the input itself had no `aria-describedby`, so if you
tabbed to it afterwards, nothing said *why* it was invalid.

The obvious fix — copy the attribute onto the input with `cloneElement` —
silently does nothing, because some of my inputs are wrapped in react-hook-form's
`<Controller>` and the attribute lands on the wrapper, which ignores it. The
code would have looked correct and done nothing. I used a small React context
instead, which passes through `<Controller>` properly.

### 5–7. Smaller ones
- **No skip link.** Every page repeated the whole header before its content, so a keyboard user had to tab through it every time.
- **Two tap targets under 24px** — the back links were 20px tall on a phone.
- **A broken regex** in the redirect guard that rejected `/sign-in` and `/sign-up` (both real routes) while letting a tab character through.

---

## 4. Things I checked that turned out fine

Say these out loud. Proving something *works* is the work.

| What | How I proved it |
|---|---|
| Sorting is correct | Edited the oldest project — it jumped to the top of "Recently updated" but stayed last under "Newest first". The two are genuinely different |
| Colours are readable | 0 WCAG AA failures across 16 states — both themes × 7 pages, plus an error state and a dialog |
| No XSS | Stored a payload with `<img onerror>`, `<script>` and `<svg onload>` in three different fields, then re-read it. Nothing executed, no injected elements, every payload survived as plain text |
| Only owners can edit | Replayed the owner's request token from a different logged-in session — the record came back byte-for-byte unchanged |
| No double submits | Double-clicked Create — exactly one project was made |
| Concurrent saves | Three tabs saving the profile simultaneously → settled on one coherent value, stable after reload |

---

## 5. Likely questions, with answers

**"Why Next.js?"**
Because the framework does the boring security work for me. Pages render on the
server so I never have to protect data in the browser, and Server Actions mean
my write logic lives on the server and is never shipped to the client. It's also
what the plan specified.

**"Why is the database a JSON file?"**
It has to be swapped for PostgreSQL anyway — that's my teammate's part. Putting
it behind a small interface (`lib/data/`) means only those files change. I also
made it fall back to in-memory if the disk is read-only, so it still runs on a
serverless host. The concurrent-save fix I described is real regardless of which
database is underneath.

**"How do you store passwords?"**
Never. Each one is hashed with **scrypt** and a random 16-byte salt, and
compared with a constant-time comparison so an attacker can't learn the hash one
byte at a time by timing responses. The session goes in an `httpOnly` cookie,
which means JavaScript can't read it even if my code had an XSS hole.

**"What is a Server Action?"**
A function that runs on the server, called from the browser as if it were a
normal function call. I can write `"use server"` and call `createProject(data)`
directly from a component. The browser sends a request, the server runs the
function, and the page updates. The important part is that the function is never
shipped to the client, so anything inside it — the database password, the hash —
stays private.

**"What is Zod?"**
A validation library. You describe what valid data looks like, and it checks
input against that and gives you typed, specific errors. The important decision
is that I define each rule **once** in `lib/validators/` and import that same
object into both the browser form and the server function. The plan requires
this, and it means the two can never drift apart — if the browser thinks a title
is valid, the server agrees.

**"Why is there a `proxy.ts`?"**
Next.js 16 renamed `middleware.ts` to `proxy.ts`. It runs before a page renders,
so it can redirect a signed-out visitor to the sign-in page without the page
ever rendering. It only checks whether the cookie *exists* — it deliberately does
not try to validate it, because I tried that and caused an infinite redirect loop
with stale cookies. The real check is a function called `requireUser()`.

**"What is `requireUser()`?"**
The gate. Every protected page calls it at the top, and so does every server
action. If there's no valid session it throws, which turns into a redirect to
sign-in. So even if someone bypassed the front door, the action itself still
refuses. I tested this by replaying a logged-in user's request from a different
session and confirming nothing changed.

**"How did you do dark mode?"**
Two separately designed palettes, not a filter or an inversion. Dark mode is
opt-in by default and follows the system. The tricky part is that it has to be
applied *before* the first paint — so there's a tiny inline script in the page
head that sets the theme before the browser paints anything. Without it,
dark-mode users get a white flash on every page load.

**"How do you make it accessible?"**
Things I'd check: a skip link so keyboard users can jump past the header; every
input's error tied to it with `aria-describedby`; the delete dialog uses the
browser's native `<dialog>` so focus trapping and Escape come from the platform
rather than from code I wrote badly; all tap targets at least 24×24px; and every
text colour meeting WCAG AA contrast, which I measured rather than eyeballed.

**"What was the hardest part?"**
The data-integrity bug. Nothing looked wrong — the app worked, the UI was fine —
but the log was quietly destroying user data on a race condition. Type checking
would never have found it. It took actually running concurrent requests to see
it.

**"What's not finished?"**
Honest answer: the admin moderation screen and the real database are my
teammate's, so they aren't done. Clerk is wired up but inactive because it needs
an account — I'm using a local login provider for now, and the switch is one
environment variable. And I tested with a script, not with a real screen reader,
which is weaker than a proper audit.

---

## 6. Ten-second answers to keep ready

| Question | Answer |
|---|---|
| What does it do? | Publish projects. Accounts, profile, full CRUD, review status. |
| What did you build? | Auth, profile, project management, design system, both themes. All of Member 1. |
| Stack? | Next.js 16, React 19, TypeScript, Tailwind 4, Zod 4. |
| How big? | 50 source files, ~5,100 lines, 19 commits. |
| Biggest bug? | A race condition that wiped the database on every save. |
| How do you know it's secure? | I wrote attacks against it. Passwords scrypt-hashed, sessions httpOnly, every write re-checks who you are, XSS payloads tested and inert. |
| How do you know it works? | Automated browser tests of every journey, plus 17 rounds of verification. |
| Live URL? | former-vehicles-porcelain-surname.trycloudflare.com |
| What's left? | Database and admin screen (teammate's), and Clerk needs an account. |
| Why should I believe it? | 17 verification rounds are written up in `docs/member1-verification.md` with the actual numbers. |

---

## 7. If you get stuck

Don't bluff. These are honest and they recover your credibility rather than
losing it:

- *"I don't remember the exact number, but it was in the region of…"*
- *"I know the intent but I'd have to check the file to be sure."*
- *"That part is my teammate's — here's the interface I built for them."*
- *"I haven't tested that with a real screen reader, only structurally in the DOM."*

The documentation is genuinely detailed, so "let me check" is usually the right
move rather than a guess.

---

## 8. Honest note

You directed and shaped this build, but you did not write all 5,100 lines
yourself — an AI assistant did the implementation work while you made the
decisions about scope, design and what "done" meant.

If your teacher asks "did you write this?", the safe and true answer is:
*"I built it with AI assistance — I specified what it should do, made the
architecture and design calls, reviewed and tested every part, and iterated
through 17 rounds of bug-fixing."*

That is a real, defensible skill, and it's the one the industry is hiring for.
Claiming every line as your own is the only version that falls apart the moment
someone asks you to change something on the spot.