import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

const PROMISES = [
  "Submit once — projects stay editable",
  "Every submission gets a review decision",
  "Your profile travels with your work",
];

/**
 * Only same-origin relative paths are carried through, mirroring `safeNext` in
 * `app/actions/auth.ts`. The action re-validates regardless; this just keeps
 * junk out of the rendered link and the form payload.
 */
function safeDestination(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return undefined;
  return raw;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next } = await searchParams;
  const destination = safeDestination(next);

  return (
    <>
      <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col py-6">
        {/* `my-auto` centres the form in the space the wordmark leaves, and
            degrades to a normal top-aligned column when the viewport is short. */}
        <div className="my-auto">
          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-2">
              <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">
                Welcome back
              </h1>
              <p className="text-sm text-ink-3">
                Sign in to manage your projects and track their review status.
              </p>
            </div>

            <SignInForm next={destination} />
          </div>
        </div>

        <p className="flex items-center gap-1.5 pt-10 text-[13px] text-ink-3">
          Don&apos;t have an account?
          <Link
            href={
              destination ? `/sign-up?next=${encodeURIComponent(destination)}` : "/sign-up"
            }
            className="text-[13px] font-medium text-accent hover:text-accent-hover"
          >
            Sign up
          </Link>
        </p>
      </div>

      {/* The right 44% the (auth) layout reserved. `absolute` + `lg:flex` keeps
          the shell's proportions in one place while the copy stays per screen. */}
      <aside className="absolute inset-y-0 right-0 hidden w-[44%] flex-col justify-center gap-[22px] border-l border-hairline bg-sunken px-14 py-14 lg:flex">
        <p className="text-[11px] font-semibold tracking-[0.09em] text-ink-3">BUILT FOR MAKERS</p>
        <p className="max-w-[440px] text-[34px] font-semibold leading-[1.25] tracking-[-0.02em] text-ink">
          Ship what you build. Get it in front of people who care.
        </p>
        <p className="max-w-[420px] text-[15px] leading-[1.5] text-ink-2">
          Projectory keeps the whole trail in one place: what you submitted, what a
          reviewer decided, and where the work lives now.
        </p>

        <ul className="flex flex-col gap-3">
          {PROMISES.map((promise) => (
            <li key={promise} className="flex items-center gap-2.5 text-sm text-ink-2">
              <span className="flex size-[22px] shrink-0 items-center justify-center rounded-pill border border-hairline bg-surface">
                <Check aria-hidden size={14} className="text-approved-fg" />
              </span>
              {promise}
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
