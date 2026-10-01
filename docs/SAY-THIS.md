# What to tell your teacher — the short version

Print this. One page. Everything below is enough.

---

## 1. What I used (memorise this list)

| Tool | One line |
|---|---|
| **Next.js 16** | The framework. Handles routing, server rendering, and my security. |
| **React 19** | The UI library inside it. |
| **TypeScript** | Every variable has a type, so mistakes get caught before they run. |
| **Tailwind CSS 4** | Styling. Instead of writing separate CSS files, I style directly in the markup. |
| **Zod** | Validation. I describe what valid data looks like; it checks every input. |
| **Lucide** | The icon set. |
| **JSON file as the database** | Temporary. Behind a layer so it swaps to PostgreSQL later. |
| **GitHub** | Version control — every change is a commit I can go back to. |

That's it. Eight things. Don't memorise the version numbers.

---

## 2. The components (what each part does)

Say these as "the app has five parts":

```
1. AUTH        →  sign in, sign up, sign out. Who are you?
2. PROFILE     →  your name, bio, links, photo
3. PROJECTS    →  the main thing. Create, edit, delete, filter, sort
4. DASHBOARD   →  the page listing your projects
5. DESIGN SYS  →  one set of colours/spacing reused everywhere, light + dark
```

Each part = one folder. That's the whole structure.

---

## 3. Say these five points

This is your actual answer. Learn it, don't read it.

1. **"I built the whole app from scratch — auth, profile, and project management.
   That's my part; my teammate does the database and the admin screen."**

2. **"It's live on a public URL. Anyone can sign up and use it right now."**

3. **"I used Next.js, so my pages render on the server. The browser never sees
   the data that shouldn't be there."**

4. **"I validate every input twice — once in the browser for instant feedback,
   once on the server for safety. Both use the same rule file, so they can't
   disagree."**

5. **"I didn't just build it, I tested it. I wrote scripts that try to break it,
   and that found seven real bugs."**

---

## 4. The bug story (if they ask "what went wrong")

Use ONE of these, not all:

> **"The best one: the database was deleting itself."**
>
> When two things saved at the same moment, one read the file while the other was
> still writing it. The file was half-finished, the read failed, and my code
> assumed "broken file" means "start over" — so it wiped the user's data.
>
> I fixed it by writing to a temporary file and then renaming it, which is
> atomic — you either see the old file or the new one, never a broken one.
>
> **That bug is the reason I'd tell you the most interesting part wasn't the
> screens. It was making sure the data couldn't be lost.**

---

## 5. What NOT to tell

### Don't volunteer these — they invite questions you don't want

| Don't say | Why |
|---|---|
| "It uses PostgreSQL" | It doesn't yet. It's a JSON file. Say "a JSON store, ready to swap". |
| "Clerk handles authentication" | Clerk isn't set up. Say "I built a local login provider". |
| "It's production-ready" | It's a college project. Don't invite that question. |
| "Bank-level security" | Overclaim. Say "scrypt-hashed passwords, httpOnly cookies". |
| "Fully accessible" | You tested structure, not a real screen reader. Say "I audited contrast and keyboard nav". |
| "Every feature is done" | Admin + real DB aren't done. Say "my part is done". |

### Don't bluff

If you don't know, say: **"I'm not sure — I'd have to check, but my guess is…"**
That is a normal answer. Bluffing is what gets caught.

### Don't over-explain

Three sentences, then stop. They'll ask if they want more. A one-minute answer
beats a five-minute one.

### The one thing to be honest about

If they ask **"did you write this?"**:

> "I built it with AI assistance. I decided the architecture and design, then
> reviewed and tested everything through 17 rounds of bug-fixing."

That answer is fine. It shows you directed the work and can debug it — which is
the actual skill. Overclaiming is the only version that falls apart when they
ask you to change something.

---

## 6. Ten-second answers

- **What does it do?** → Publish projects. Accounts, profile, full CRUD.
- **Stack?** → Next.js, React, TypeScript, Tailwind, Zod.
- **How big?** → 50 files, ~5,000 lines.
- **Biggest bug?** → A race condition wiping the database.
- **How do you know it's secure?** → I wrote attacks against it and tested them.
- **What's left?** → Database and admin screen (teammate's).

---

## 7. If you want the longer version

Those are reference material, not things to read out loud:

- `docs/PROJECTORY-MINDMAP.md` — full architecture map
- `docs/member1-verification.md` — all 17 rounds with real numbers
- `docs/HOW-TO-EXPLAIN-IT.md` — 12 possible viva questions, answered

---

## 8. Before you present — 5 minute checklist

- [ ] Server + tunnel running: `powershell -ExecutionPolicy Bypass -File scripts\serve.ps1`
- [ ] Open the URL, sign in, click through dashboard → new → edit → settings
- [ ] Confirm **dark mode** works (the sun/moon button, top right)
- [ ] Read section 3 out loud twice
- [ ] Decide now whether you'll mention AI assistance (section 5)