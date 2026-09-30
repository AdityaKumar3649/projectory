import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

/**
 * Paired with /terms. The sign-up form linked here and got a 404, so this page
 * states plainly what the demo actually does — which is very little — instead
 * of implying a data practice the app does not have.
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-base">
      <article className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-6 py-16">
        <header className="flex flex-col gap-2">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Privacy Policy</h1>
          <p className="text-[13px] text-ink-3">Placeholder policy for a college project.</p>
        </header>

        <section className="flex flex-col gap-2">
          <h2 className="text-[17px] font-semibold">What is stored</h2>
          <p className="text-sm leading-relaxed text-ink-2">
            An email address, a display name, a password hash, and anything you
            type into your profile or your projects. Passwords are stored as a
            scrypt hash, never in plain text.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-[17px] font-semibold">Cookies</h2>
          <p className="text-sm leading-relaxed text-ink-2">
            One cookie, <span className="font-mono text-[13px]">pj_session</span>,
            keeps you signed in. It is httpOnly, so scripts cannot read it, and
            it holds an opaque random token rather than anything about you. With
            &ldquo;keep me signed in&rdquo; ticked it expires after 30 days;
            otherwise it lasts only for your browser session.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-[17px] font-semibold">Who can see your work</h2>
          <p className="text-sm leading-relaxed text-ink-2">
            Your profile and your projects are visible to you. Projects appear
            publicly only once an administrator has approved them; rejected ones
            stay private. Other members can never see projects they do not own.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-[17px] font-semibold">Third parties</h2>
          <p className="text-sm leading-relaxed text-ink-2">
            None in the default build. If Clerk is enabled for authentication,
            sign-in is handled by Clerk and their policy applies to that step.
          </p>
        </section>

        <footer className="border-t border-hairline pt-6 text-[13px] text-ink-3">
          In this demonstration build all data lives in a local file on the
          machine running the app. Replace this page with a real policy before
          running anywhere public.
        </footer>
      </article>
    </div>
  );
}
