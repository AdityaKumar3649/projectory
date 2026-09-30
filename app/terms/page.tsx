import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

/**
 * A real page, because the sign-up form links here. It was a 404 before, which
 * is the worst outcome on a sign-up screen: a dead link under a checkbox the
 * user is being asked to agree to.
 *
 * This is placeholder wording for a college mini project, not legal advice, and
 * it says so plainly rather than pretending to be a production policy.
 */
export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-base">
      <article className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-6 py-16">
        <header className="flex flex-col gap-2">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Terms of Service</h1>
          <p className="text-[13px] text-ink-3">Placeholder terms for a college project.</p>
        </header>

        <section className="flex flex-col gap-2">
          <h2 className="text-[17px] font-semibold">1. What Projectory is</h2>
          <p className="text-sm leading-relaxed text-ink-2">
            Projectory is a demonstration platform where developers, students and
            independent makers publish the projects they have built. It is a
            student mini project and is not a commercial service.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-[17px] font-semibold">2. Your account</h2>
          <p className="text-sm leading-relaxed text-ink-2">
            You are responsible for what is published from your account, and for
            keeping your sign-in details to yourself. Projects you submit are
            reviewed by an administrator before they appear publicly.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-[17px] font-semibold">3. What you post</h2>
          <p className="text-sm leading-relaxed text-ink-2">
            Only submit work you have the right to share, and do not use the
            platform to publish unlawful or abusive content. An administrator
            may reject or remove a submission.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-[17px] font-semibold">4. No warranty</h2>
          <p className="text-sm leading-relaxed text-ink-2">
            The service is provided as-is, with no guarantee of availability or
            fitness for any particular purpose.
          </p>
        </section>

        <footer className="border-t border-hairline pt-6 text-[13px] text-ink-3">
          This page exists so the sign-up flow is not linking into a 404. Replace
          it with real terms before running this anywhere public.
        </footer>
      </article>
    </div>
  );
}
